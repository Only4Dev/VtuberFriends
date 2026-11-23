namespace VtuberFriends;
public interface IAudioReceiver : IAsyncDisposable
{
 Participant[] Participants{get;}object LiveStatus{get;}object Describe(object? recovery);
 Task<AudioRecoveryReason> RecoveryNeeded{get;}bool RecoveryStillNeeded{get;}void ResetRecoverySignal();
 Task StartAsync(string token,CancellationToken cancellation=default);Task HaltAsync(string reason);
}
