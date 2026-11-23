using System.Text.RegularExpressions;
using Discord;
using Discord.Audio;
using Discord.WebSocket;

namespace VtuberFriends;

public sealed class DiscordReceiver(Levels levels, string guildId, string channelId, AudioDiagnostics diagnostics) : IAudioReceiver
{
    private readonly DiscordSocketClient client = new(new DiscordSocketConfig
    {
        GatewayIntents = GatewayIntents.Guilds | GatewayIntents.GuildVoiceStates,
        EnableVoiceDaveEncryption = true,
        LogLevel = LogSeverity.Debug
    });
    private readonly CancellationTokenSource stop = new();
    private readonly ManagedAudioReaders<AudioInStream> readers = new(
        async (stream,ct)=>{var frame=await stream.ReadFrameAsync(ct);return !frame.Missed&&frame.Payload is {Length:>0}?frame.Payload:ReadOnlyMemory<byte>.Empty;},
        stream=>stream.CanRead,(id,frame)=>levels.Push(id.ToString(),frame.Span),id=>levels.Silence(id.ToString()),diagnostics.RecordAudioEvent);
    private readonly AudioStallPolicy stall=new();
    private TaskCompletionSource<AudioRecoveryReason> recovery=new(TaskCreationOptions.RunContinuationsAsynchronously);
    private Task? monitor;
    public Task<AudioRecoveryReason> RecoveryNeeded=>Volatile.Read(ref recovery).Task;
    private int recoveryStillNeeded;
    public bool RecoveryStillNeeded=>Volatile.Read(ref recoveryStillNeeded)==1;
    public void ResetRecoverySignal()=>Interlocked.Exchange(ref recovery,new(TaskCreationOptions.RunContinuationsAsynchronously));
    private IAudioClient? audio;
    private int protocol, warnings, errors;
    private long lastWarning;
    private string status = "starting";
    public Participant[] Participants => IsConnected
        ? client.GetGuild(ulong.Parse(guildId))?.GetVoiceChannel(ulong.Parse(channelId))?.ConnectedUsers
            .Where(user => !user.IsBot)
            .Select(user => new Participant(user.Id.ToString(), user.Nickname ?? user.GlobalName ?? user.Username, true))
            .OrderBy(user => user.Name).ToArray() ?? []
        : [];

    private bool IsConnected=>status=="connected"&&audio?.ConnectionState==ConnectionState.Connected&&client.ConnectionState==ConnectionState.Connected;
    private string CurrentStatus=>status=="connected"&&!IsConnected?"disconnected":status;
    public object LiveStatus => new { mode="discord", status=CurrentStatus };
    public object Status=>Describe(null);
    public object Describe(object? recoveryState)=>new { mode="discord", status=CurrentStatus, daveRequired=true,
        botUserId=client.CurrentUser?.Id.ToString(), observedProtocolVersion=IsConnected?Math.Max(Volatile.Read(ref protocol),diagnostics.EstablishedProtocolVersion):0,
        warnings,errors,diagnostics=diagnostics.Snapshot,audioHealth=readers.Health,
        gatewayState=client.ConnectionState.ToString(),voiceState=audio?.ConnectionState.ToString()??"None",recovery=recoveryState,
        acceptance="PENDING_LIVE_MANUAL_TEST" };

    public async Task StartAsync(string token, CancellationToken cancellation=default)
    {
        using var registration=cancellation.Register(()=>stop.Cancel());
        client.Log += log =>
        {
            // Never emit raw gateway payloads, tokens, MLS packages or keys.
            string message = log.Message ?? "";
            diagnostics.ObserveManaged(message, log.Exception?.GetType().Name);
            if (log.Source.StartsWith("Dave", StringComparison.Ordinal))
            {
                var match = Regex.Match(message, @"Executing (?:tranisition|transition) to protocol version (\d+)");
                if (match.Success) Volatile.Write(ref protocol, int.Parse(match.Groups[1].Value));
            }
            if (message.Contains("Malformed Frame", StringComparison.OrdinalIgnoreCase)
                || message.Contains("decrypt", StringComparison.OrdinalIgnoreCase) && log.Exception is not null)
                Interlocked.Increment(ref errors);
            if (log.Severity <= LogSeverity.Warning)
            {
                Interlocked.Increment(ref warnings);
                string category = diagnostics.RecordWarning(message);
                long now = Environment.TickCount64;
                long previous = Interlocked.Read(ref lastWarning);
                if (now - previous >= 5000 && Interlocked.CompareExchange(ref lastWarning, now, previous) == previous)
                    Console.WriteLine($"Discord: {category}; acumulados={Volatile.Read(ref warnings)}. Revisa Estado de la conexion en el panel.");
            }
            return Task.CompletedTask;
        };
        var ready = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        client.Ready += () => { ready.TrySetResult();ReconcileStreams();return Task.CompletedTask; };
        client.Disconnected += _=>{diagnostics.RecordAudioEvent(AudioLifecycle.GATEWAY_DISCONNECTED);readers.Reconcile(new Dictionary<ulong,AudioInStream>());levels.SilenceAll();return Task.CompletedTask;};
        client.Connected += ()=>{diagnostics.RecordAudioEvent(AudioLifecycle.GATEWAY_CONNECTED);return Task.CompletedTask;};
        await client.LoginAsync(TokenType.Bot, token).WaitAsync(TimeSpan.FromSeconds(30),stop.Token);
        await client.StartAsync().WaitAsync(TimeSpan.FromSeconds(30),stop.Token);
        await ready.Task.WaitAsync(TimeSpan.FromSeconds(45), stop.Token);
        var guild = client.GetGuild(ulong.Parse(guildId)) ?? throw new InvalidOperationException("Servidor no disponible para el bot.");
        var channel = guild.GetVoiceChannel(ulong.Parse(channelId)) ?? throw new InvalidOperationException("Canal de voz no disponible.");
        // Executed outside gateway event handlers to avoid blocking the voice handshake.
        audio = await channel.ConnectAsync(selfDeaf: false, selfMute: true).WaitAsync(TimeSpan.FromSeconds(45), stop.Token);
        audio.StreamCreated += (id,stream)=>{readers.Attach(id,stream);return Task.CompletedTask;};
        audio.StreamDestroyed += _=>{ReconcileStreams();return Task.CompletedTask;};
        audio.Disconnected += _ =>
        {
            if (!diagnostics.Fatal.IsCompleted) status = "disconnected";
            Volatile.Write(ref protocol, 0);
            readers.Reconcile(new Dictionary<ulong,AudioInStream>());diagnostics.RecordAudioEvent(AudioLifecycle.VOICE_DISCONNECTED);
            levels.SilenceAll();
            return Task.CompletedTask;
        };
        audio.Connected += () => { if(!diagnostics.Fatal.IsCompleted){status="connected";ReconcileStreams();diagnostics.RecordAudioEvent(AudioLifecycle.VOICE_CONNECTED);}return Task.CompletedTask; };
        status="connected";ReconcileStreams();diagnostics.RecordAudioEvent(AudioLifecycle.VOICE_CONNECTED);
        monitor=MonitorAsync();
    }
    private void ReconcileStreams(){
        if(stop.IsCancellationRequested||diagnostics.Fatal.IsCompleted||audio?.ConnectionState!=ConnectionState.Connected)return;
        try{readers.Reconcile(audio.GetStreams());}
        catch(ObjectDisposedException){}catch(InvalidOperationException){diagnostics.RecordReaderError();}
    }
    private async Task MonitorAsync(){
        long nextHealth=Environment.TickCount64+60000;
        try{while(!stop.IsCancellationRequested){
            try{
            ReconcileStreams();long now=Environment.TickCount64;var health=readers.Health;
            var reason=stall.Observe(now,IsConnected,health,diagnostics.DecryptFailureCount,diagnostics.Fatal.IsCompleted);
            Interlocked.Exchange(ref recoveryStillNeeded,0);
            if(reason is not null&&!diagnostics.Fatal.IsCompleted){
                bool humans=client.GetGuild(ulong.Parse(guildId))?.GetVoiceChannel(ulong.Parse(channelId))?.ConnectedUsers.Any(user=>!user.IsBot)==true;
                if(reason==AudioRecoveryReason.VoiceDisconnected||humans){Interlocked.Exchange(ref recoveryStillNeeded,1);Volatile.Read(ref recovery).TrySetResult(reason.Value);}
            }
            if(now>=nextHealth){diagnostics.RecordAudioEvent(health.LastPcmAgeMs is <5000?AudioLifecycle.HEALTH_FLOWING:AudioLifecycle.HEALTH_IDLE);nextHealth=now+60000;}
            }catch(OperationCanceledException) when(stop.IsCancellationRequested){break;}
            catch{diagnostics.RecordAudioEvent(AudioLifecycle.READER_FAILED);if(!diagnostics.Fatal.IsCompleted){Interlocked.Exchange(ref recoveryStillNeeded,1);Volatile.Read(ref recovery).TrySetResult(AudioRecoveryReason.ReaderFailed);}}
            await Task.Delay(5000,stop.Token);
        }}catch(OperationCanceledException) when(stop.IsCancellationRequested){}
    }

    public async Task HaltAsync(string reason)
    {
        status = "dave_failed";
        Volatile.Write(ref protocol, 0);
        levels.SilenceAll();
        await stop.CancelAsync();
        if (audio is not null) await audio.StopAsync();
        await client.StopAsync();
        status = "dave_failed";
        Console.WriteLine($"Bot detenido: {reason}. No se reintentara automaticamente; revisa /api/state.");
    }

    public async ValueTask DisposeAsync()
    {
        await stop.CancelAsync();
        try{if (audio is not null) await audio.StopAsync();}
        finally{try{if(monitor is not null)await monitor;await readers.DisposeAsync();}
        finally{try{await client.StopAsync();}finally{client.Dispose();stop.Dispose();}}}
    }
}
