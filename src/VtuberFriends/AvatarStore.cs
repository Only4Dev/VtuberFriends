using System.Text.Json;
using System.Text.RegularExpressions;

namespace VtuberFriends;

public sealed record AvatarSlot(int Id, string? UserId = null, bool Enabled = false,
    string Avatar = "bronze", double Opacity = 1, double ThresholdDb = -60,
    int HoldMs = 200, double Scale = 1, bool ShowName = true,
    string NameStyle = "plate", int NameSize = 17, double NameOpacity = 1,
    string EntryAnimation = "pop", string ExitAnimation = "pop",
    string EntrySound = "builtin", string ExitSound = "builtin",
    string? EntrySoundName = null, string? ExitSoundName = null, double SoundVolume = .45, string? EntrySoundFile = null, string? ExitSoundFile = null,
    double PuppetIdle = .55, double PuppetWings = .5, double PuppetMouthGain = 1,
    int PuppetHeadRange = 15, string PuppetExpression = "auto", bool PuppetManual = false,
    double PuppetHeadX = 0, double PuppetHeadY = 0, double PuppetHeadZ = 0,
    double PuppetEyeX = 0, double PuppetEyeY = 0,
    IReadOnlyDictionary<string, PuppetPartEdit>? PuppetParts = null, double PuppetMouthTravel = 70, int PuppetPadding = 280, string PuppetMouthMode = "adaptive", double PuppetMouthMaxDb = -25, double PuppetMouthStability = .5, double TransitionSpeed = 1, double TransitionIntensity = .8, string TransitionQuality = "medium", double TransitionScale = 1, double TransitionDensity = .75, string TransitionColor = "preset", IReadOnlyList<string>? AmbientEffects = null, string AmbientColor = "#86d8ef", double AmbientIntensity = .65, double AmbientSize = 1, double AmbientSpeed = .7, string AmbientQuality = "medium", bool PuppetEyeGlow = false, double PuppetEyeGlowIntensity = .35, bool PuppetPatternGlow = false, double PuppetPatternGlowIntensity = .25, string AccessoryGlasses = "none", string AccessoryHat = "none", string AccessoryNecklace = "none", string AccessoryObject = "none", IReadOnlyDictionary<string, AccessoryEdit>? AccessoryEdits = null, string ObjectAnimation = "float", double ObjectAmplitude = .4, double ObjectSpeed = 1, string AccessoryObjectLeft = "none", string ObjectLeftAnimation = "float", double ObjectLeftAmplitude = .4, double ObjectLeftSpeed = 1, IReadOnlyDictionary<string, AvatarAccessoryProfile>? AccessoryProfiles = null, bool PuppetCyberGlow = true, double PuppetCyberGlowIntensity = .35, bool PuppetJadeShiny = false, string AccessoryAura = "none", string AccessoryFloor = "none", string AccessoryLightning = "none", string AccessoryEffect = "none");
public sealed record AvatarAccessoryProfile(string AccessoryGlasses = "none", string AccessoryHat = "none", string AccessoryNecklace = "none", string AccessoryObject = "none", string AccessoryObjectLeft = "none", string ObjectAnimation = "float", double ObjectAmplitude = .4, double ObjectSpeed = 1, string ObjectLeftAnimation = "float", double ObjectLeftAmplitude = .4, double ObjectLeftSpeed = 1, string AccessoryAura = "none", string AccessoryFloor = "none", string AccessoryLightning = "none", string AccessoryEffect = "none", IReadOnlyList<string>? AmbientEffects = null, string AmbientColor = "#86d8ef", double AmbientIntensity = .65, double AmbientSize = 1, double AmbientSpeed = .7, string AmbientQuality = "medium", IReadOnlyDictionary<string, PuppetPartEdit>? PuppetParts = null, double PuppetMouthTravel = 70, int PuppetPadding = 280, double PuppetIdle = .55, double PuppetWings = .5, double PuppetMouthGain = 1, int PuppetHeadRange = 15, string PuppetExpression = "auto", bool PuppetManual = false, double PuppetHeadX = 0, double PuppetHeadY = 0, double PuppetHeadZ = 0, double PuppetEyeX = 0, double PuppetEyeY = 0, bool PuppetEyeGlow = false, double PuppetEyeGlowIntensity = .35, bool PuppetPatternGlow = false, double PuppetPatternGlowIntensity = .25, bool PuppetCyberGlow = true, double PuppetCyberGlowIntensity = .35, bool PuppetJadeShiny = false)
{
    public static AvatarAccessoryProfile From(AvatarSlot s) => new(s.AccessoryGlasses, s.AccessoryHat, s.AccessoryNecklace, s.AccessoryObject, s.AccessoryObjectLeft, s.ObjectAnimation, s.ObjectAmplitude, s.ObjectSpeed, s.ObjectLeftAnimation, s.ObjectLeftAmplitude, s.ObjectLeftSpeed, s.AccessoryAura, s.AccessoryFloor, s.AccessoryLightning, s.AccessoryEffect, s.AmbientEffects, s.AmbientColor, s.AmbientIntensity, s.AmbientSize, s.AmbientSpeed, s.AmbientQuality, s.PuppetParts, s.PuppetMouthTravel, s.PuppetPadding, s.PuppetIdle, s.PuppetWings, s.PuppetMouthGain, s.PuppetHeadRange, s.PuppetExpression, s.PuppetManual, s.PuppetHeadX, s.PuppetHeadY, s.PuppetHeadZ, s.PuppetEyeX, s.PuppetEyeY, s.PuppetEyeGlow, s.PuppetEyeGlowIntensity, s.PuppetPatternGlow, s.PuppetPatternGlowIntensity, s.PuppetCyberGlow, s.PuppetCyberGlowIntensity, s.PuppetJadeShiny);
    public AvatarSlot Apply(AvatarSlot s) => s with { AccessoryProfiles = null, AccessoryGlasses = AccessoryGlasses, AccessoryHat = AccessoryHat, AccessoryNecklace = AccessoryNecklace, AccessoryObject = AccessoryObject, AccessoryObjectLeft = AccessoryObjectLeft, ObjectAnimation = ObjectAnimation, ObjectAmplitude = ObjectAmplitude, ObjectSpeed = ObjectSpeed, ObjectLeftAnimation = ObjectLeftAnimation, ObjectLeftAmplitude = ObjectLeftAmplitude, ObjectLeftSpeed = ObjectLeftSpeed, AccessoryAura = AccessoryAura, AccessoryFloor = AccessoryFloor, AccessoryLightning = AccessoryLightning, AccessoryEffect = AccessoryEffect, AmbientEffects = AmbientEffects, AmbientColor = AmbientColor, AmbientIntensity = AmbientIntensity, AmbientSize = AmbientSize, AmbientSpeed = AmbientSpeed, AmbientQuality = AmbientQuality, PuppetParts = PuppetParts, PuppetMouthTravel = PuppetMouthTravel, PuppetPadding = PuppetPadding, PuppetIdle = PuppetIdle, PuppetWings = PuppetWings, PuppetMouthGain = PuppetMouthGain, PuppetHeadRange = PuppetHeadRange, PuppetExpression = PuppetExpression, PuppetManual = PuppetManual, PuppetHeadX = PuppetHeadX, PuppetHeadY = PuppetHeadY, PuppetHeadZ = PuppetHeadZ, PuppetEyeX = PuppetEyeX, PuppetEyeY = PuppetEyeY, PuppetEyeGlow = PuppetEyeGlow, PuppetEyeGlowIntensity = PuppetEyeGlowIntensity, PuppetPatternGlow = PuppetPatternGlow, PuppetPatternGlowIntensity = PuppetPatternGlowIntensity, PuppetCyberGlow = PuppetCyberGlow, PuppetCyberGlowIntensity = PuppetCyberGlowIntensity, PuppetJadeShiny = PuppetJadeShiny };
}
public sealed record AccessoryEdit(double X = 0, double Y = 0, double Scale = 1, double Rotation = 0, string? Color = null, double Intensity = 1, double Speed = 1, double Interval = 22, double Spread = .32);
public sealed record PuppetPartEdit(double X = 0, double Y = 0, double ScaleX = 1, double ScaleY = 1, double Rotation = 0);
public sealed record Participant(string UserId, string Name, bool Present);
public sealed class AvatarStore
{
    public const int DefaultSlotCount = 8;
    public static bool IsValidSlotId(int id) => id >= 1 && id <= DefaultSlotCount;
    private readonly object gate = new();
    private readonly string path;
    private readonly string? accessoryCatalog;
    private AvatarSlot[] slots;
    private long revision;
    public long Revision=>Interlocked.Read(ref revision);
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { WriteIndented = true };
    public AvatarStore(string path, string? accessoryCatalog = null)
    {
        this.path = path;
        this.accessoryCatalog = accessoryCatalog;
        slots = File.Exists(path) ? JsonSerializer.Deserialize<AvatarSlot[]>(File.ReadAllText(path), Json)
            ?? throw new InvalidDataException("Configuracion de avatares vacia.") : Defaults();
        // Older contiguous configurations gain only new empty slots; existing records stay intact.
        if (slots.Length < 6 || slots.Length > DefaultSlotCount || slots.Any(s => s is null)
            || !slots.Select(s => s.Id).Order().SequenceEqual(Enumerable.Range(1, slots.Length)))
            throw new InvalidDataException($"Fuentes invalidas: deben ser consecutivas desde 1, hasta {DefaultSlotCount}.");
        slots = slots.Concat(Enumerable.Range(slots.Length + 1, DefaultSlotCount - slots.Length).Select(i => new AvatarSlot(i))).ToArray();
        slots = slots.Select(RemoveRetiredEffects).ToArray();
        foreach (var slot in slots) Validate(slot);
        slots = slots.Select(CaptureAccessoryProfile).ToArray();
        if (slots.Where(s => s.UserId is not null).GroupBy(s => s.UserId).Any(g => g.Count() > 1))
            throw new InvalidDataException("Un usuario no puede ocupar dos fuentes.");
    }
    private static AvatarSlot[] Defaults() => Enumerable.Range(1, DefaultSlotCount).Select(i => new AvatarSlot(i)).ToArray();
    public AvatarSlot[] Snapshot() { lock (gate) return slots.OrderBy(s => s.Id).ToArray(); }
    public AvatarSlot Save(int id, AvatarSlot value)
    {
        if (value.Id != id) throw new ArgumentException("La fuente no coincide.");
        value = value with { UserId = string.IsNullOrWhiteSpace(value.UserId) ? null : value.UserId };
        value = RemoveRetiredEffects(value);
        Validate(value);
        value = CaptureAccessoryProfile(value);
        lock (gate)
        {
            if (value.UserId is not null && slots.Any(s => s.Id != id && s.UserId == value.UserId))
                throw new ArgumentException("Este usuario ya tiene una fuente asignada.");
            var updated = slots.Select(s => s.Id == id ? value : s).ToArray();
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            var temporary = path + ".tmp";
            File.WriteAllText(temporary, JsonSerializer.Serialize(updated, Json));
            File.Move(temporary, path, true);
            slots = updated;Interlocked.Increment(ref revision);
            return value;
        }
    }
    private static AvatarSlot CaptureAccessoryProfile(AvatarSlot slot)
    {
        var profiles = slot.AccessoryProfiles is null ? new Dictionary<string, AvatarAccessoryProfile>() : new Dictionary<string, AvatarAccessoryProfile>(slot.AccessoryProfiles);
        profiles[slot.Avatar] = AvatarAccessoryProfile.From(slot);
        return slot with { AccessoryProfiles = profiles };
    }
    private static AvatarSlot RemoveRetiredEffects(AvatarSlot slot) => slot with { AmbientEffects = slot.AmbientEffects?.Where(id => id != "arcs").ToArray() };
    private static bool ValidSoundFile(string sound) => Regex.IsMatch(sound, @"^[a-f0-9]{32}\.(wav|mp3|ogg|m4a|webm)$");
    private static bool ValidSound(string? sound) => sound is "builtin" or "none" || sound is not null && Regex.IsMatch(sound, @"^[a-f0-9]{32}\.(wav|mp3|ogg|m4a|webm)$");
    private void Validate(AvatarSlot slot)
    {
        if (slot.AccessoryProfiles is not null) {
            if (slot.AccessoryProfiles.Count > 12 || slot.AccessoryProfiles.Any(p => p.Key is not ("bronze" or "ivory" or "moss" or "slate" or "cyan-puppet" or "jade-puppet" or "amber-puppet" or "thoxer-puppet" or "ember-puppet" or "patch-puppet" or "rose-puppet" or "frost-puppet") || p.Value is null)) throw new ArgumentException("Perfil de accesorios invalido.");
            foreach (var profile in slot.AccessoryProfiles.Values) Validate(profile.Apply(slot));
        }
        string[] partIds = ["head", "jaw", "tongue", "fangs", "mouth", "torso", "wing-left", "wing-right", "eye-left", "eye-right", "eye-bg-left", "eye-bg-right", "lid-left-upper", "lid-left-lower", "lid-right-upper", "lid-right-lower"];
        var allowed = new Dictionary<string, HashSet<string>> {
            ["accessoryGlasses"] = new() { "none", "round", "sun", "rectangular" }, ["accessoryHat"] = new() { "none", "wizard", "top" },
            ["accessoryAura"] = new() { "none", "energy" }, ["accessoryFloor"] = new() { "none", "smoke" }, ["accessoryLightning"] = new() { "none", "storm" }, ["accessoryEffect"] = new() { "none", "nose-smoke" },
            ["accessoryNecklace"] = new() { "none", "leather", "gem" }, ["accessoryObject"] = new() { "none", "microphone" }
        };
        if (accessoryCatalog is not null && File.Exists(accessoryCatalog)) {
            try {
                using var catalog = JsonDocument.Parse(File.ReadAllText(accessoryCatalog));
                if (catalog.RootElement.GetArrayLength() > 32) throw new ArgumentException("Maximo 32 accesorios.");
                foreach (var set in allowed.Values) { set.Clear(); set.Add("none"); }
                foreach (var item in catalog.RootElement.EnumerateArray()) {
                    var category = item.GetProperty("category").GetString()!; var value = item.GetProperty("value").GetString()!;
                    if (!allowed.ContainsKey(category) || !Regex.IsMatch(value, "^[-a-z0-9]{1,32}$") || value == "none" || !allowed[category].Add(value)) throw new ArgumentException("Catalogo de accesorios invalido.");
                }
            } catch (JsonException) { throw new ArgumentException("Catalogo de accesorios invalido."); }
        }
        if (!allowed["accessoryGlasses"].Contains(slot.AccessoryGlasses) || !allowed["accessoryHat"].Contains(slot.AccessoryHat)
            || !allowed["accessoryNecklace"].Contains(slot.AccessoryNecklace) || !allowed["accessoryObject"].Contains(slot.AccessoryObject) || !allowed["accessoryObject"].Contains(slot.AccessoryObjectLeft) || !allowed["accessoryAura"].Contains(slot.AccessoryAura) || !allowed["accessoryFloor"].Contains(slot.AccessoryFloor) || !allowed["accessoryLightning"].Contains(slot.AccessoryLightning) || !allowed["accessoryEffect"].Contains(slot.AccessoryEffect)) throw new ArgumentException("Accesorio desconocido.");
        if (slot.ObjectAnimation is not ("none" or "float" or "sway") || !double.IsFinite(slot.ObjectAmplitude) || slot.ObjectAmplitude is < 0 or > 1
            || !double.IsFinite(slot.ObjectSpeed) || slot.ObjectSpeed is < .2 or > 3) throw new ArgumentException("Animacion de objeto invalida.");
        if (slot.ObjectLeftAnimation is not ("none" or "float" or "sway") || !double.IsFinite(slot.ObjectLeftAmplitude) || slot.ObjectLeftAmplitude is < 0 or > 1
            || !double.IsFinite(slot.ObjectLeftSpeed) || slot.ObjectLeftSpeed is < .2 or > 3) throw new ArgumentException("Animacion del objeto izquierdo invalida.");
        if (slot.AccessoryEdits is not null && (slot.AccessoryEdits.Count > 512 || slot.AccessoryEdits.Any(pair =>
            !Regex.IsMatch(pair.Key, "^[-a-z0-9]{1,48}:[-a-z0-9]{1,96}$") || pair.Value is null || !double.IsFinite(pair.Value.X) || Math.Abs(pair.Value.X) > 1536
            || !double.IsFinite(pair.Value.Y) || Math.Abs(pair.Value.Y) > 1536 || !double.IsFinite(pair.Value.Scale) || pair.Value.Scale is < .01 or > 3
            || !double.IsFinite(pair.Value.Rotation) || Math.Abs(pair.Value.Rotation) > 180
            || pair.Value.Color is not null && !Regex.IsMatch(pair.Value.Color,"^#[0-9a-fA-F]{6}$")
            || !double.IsFinite(pair.Value.Intensity) || pair.Value.Intensity is < 0 or > 1
            || !double.IsFinite(pair.Value.Speed) || pair.Value.Speed is < .2 or > 3
            || !double.IsFinite(pair.Value.Interval) || pair.Value.Interval is < 8 or > 90
            || !double.IsFinite(pair.Value.Spread) || pair.Value.Spread is < .05 or > .8))) throw new ArgumentException("Ajuste de accesorio invalido.");
        string[] ambientIds = ["runes", "orbs", "embers", "wind"];
        if (!double.IsFinite(slot.PuppetCyberGlowIntensity) || slot.PuppetCyberGlowIntensity is < 0 or > 1) throw new ArgumentException("Intensidad cibernetica invalida.");
        if (!double.IsFinite(slot.PuppetEyeGlowIntensity) || slot.PuppetEyeGlowIntensity is < 0 or > 1
            || !double.IsFinite(slot.PuppetPatternGlowIntensity) || slot.PuppetPatternGlowIntensity is < 0 or > 1) throw new ArgumentException("Intensidad de brillo invalida.");
        if (slot.AmbientEffects is not null && (slot.AmbientEffects.Count > 5 || slot.AmbientEffects.Distinct().Count() != slot.AmbientEffects.Count || slot.AmbientEffects.Any(id => !ambientIds.Contains(id)))
            || slot.AmbientColor is null || !Regex.IsMatch(slot.AmbientColor, "^#[0-9a-fA-F]{6}$")
            || !double.IsFinite(slot.AmbientIntensity) || slot.AmbientIntensity is < 0 or > 1
            || !double.IsFinite(slot.AmbientSize) || slot.AmbientSize is < .5 or > 1.5
            || !double.IsFinite(slot.AmbientSpeed) || slot.AmbientSpeed is < .2 or > 2
            || slot.AmbientQuality is not ("low" or "medium" or "high")) throw new ArgumentException("Ajustes de adornos invalidos.");
        if (!double.IsFinite(slot.TransitionScale) || slot.TransitionScale is < .65 or > 1.15
            || !double.IsFinite(slot.TransitionDensity) || slot.TransitionDensity is < .25 or > 1
            || slot.TransitionColor is null || slot.TransitionColor != "preset" && !Regex.IsMatch(slot.TransitionColor, "^#[0-9a-fA-F]{6}$")) throw new ArgumentException("Escala, densidad o color de efectos invalidos.");
        if (!double.IsFinite(slot.TransitionSpeed) || slot.TransitionSpeed is < .6 or > 1.5
            || !double.IsFinite(slot.TransitionIntensity) || slot.TransitionIntensity is < .2 or > 1
            || slot.TransitionQuality is not ("low" or "medium" or "high")) throw new ArgumentException("Ajustes de efectos fuera de rango.");
        if (slot.PuppetMouthMode is not ("adaptive" or "fixed") || !double.IsFinite(slot.PuppetMouthMaxDb) || slot.PuppetMouthMaxDb is < -65 or > 0
            || slot.PuppetMouthMode == "fixed" && slot.PuppetMouthMaxDb < slot.ThresholdDb + 3
            || !double.IsFinite(slot.PuppetMouthStability) || slot.PuppetMouthStability is < 0 or > 1)
            throw new ArgumentException("Rango de voz invalido: el maximo debe superar el minimo al menos 3 dB.");
        if (!double.IsFinite(slot.PuppetMouthTravel) || slot.PuppetMouthTravel is < 20 or > 130 || slot.PuppetPadding is < 120 or > 450
            || slot.PuppetParts is not null && (slot.PuppetParts.Count > 16 || slot.PuppetParts.Any(p => !partIds.Contains(p.Key) || p.Value is null
                || !double.IsFinite(p.Value.X) || Math.Abs(p.Value.X) > 300 || !double.IsFinite(p.Value.Y) || Math.Abs(p.Value.Y) > 300
                || !double.IsFinite(p.Value.ScaleX) || p.Value.ScaleX is < .4 or > 1.8 || !double.IsFinite(p.Value.ScaleY) || p.Value.ScaleY is < .4 or > 1.8
                || !double.IsFinite(p.Value.Rotation) || Math.Abs(p.Value.Rotation) > 45)))
            throw new ArgumentException("Ajustes de piezas fuera de rango.");
        if (!double.IsFinite(slot.PuppetIdle) || slot.PuppetIdle is < 0 or > 1
            || !double.IsFinite(slot.PuppetWings) || slot.PuppetWings is < 0 or > 1
            || !double.IsFinite(slot.PuppetMouthGain) || slot.PuppetMouthGain is < .2 or > 3
            || slot.PuppetHeadRange is < 0 or > 20
            || slot.PuppetExpression is not ("auto" or "neutral" or "curious" or "surprised" or "angry" or "happy" or "yawn")
            || !double.IsFinite(slot.PuppetHeadX) || Math.Abs(slot.PuppetHeadX) > 20
            || !double.IsFinite(slot.PuppetHeadY) || Math.Abs(slot.PuppetHeadY) > 20
            || !double.IsFinite(slot.PuppetHeadZ) || Math.Abs(slot.PuppetHeadZ) > 15
            || !double.IsFinite(slot.PuppetEyeX) || Math.Abs(slot.PuppetEyeX) > 1
            || !double.IsFinite(slot.PuppetEyeY) || Math.Abs(slot.PuppetEyeY) > 1
            || slot.NameStyle is not ("plate" or "outline") || slot.NameSize is < 8 or > 36
            || !double.IsFinite(slot.NameOpacity) || slot.NameOpacity is < 0 or > 1
            || slot.EntryAnimation is not ("none" or "pop" or "fire" or "summon" or "tempest" or "celestial" or "hacker") || slot.ExitAnimation is not ("none" or "pop" or "fire" or "summon" or "tempest" or "celestial" or "hacker")
            || !ValidSound(slot.EntrySound) || !ValidSound(slot.ExitSound)
            || slot.EntrySoundFile is not null && !ValidSoundFile(slot.EntrySoundFile) || slot.ExitSoundFile is not null && !ValidSoundFile(slot.ExitSoundFile)
            || slot.EntrySoundName?.Length > 120 || slot.ExitSoundName?.Length > 120
            || !double.IsFinite(slot.SoundVolume) || slot.SoundVolume is < 0 or > 1
            || !IsValidSlotId(slot.Id) || slot.Avatar is not ("bronze" or "ivory" or "moss" or "slate" or "cyan-puppet" or "jade-puppet" or "amber-puppet" or "thoxer-puppet" or "ember-puppet" or "patch-puppet" or "rose-puppet" or "frost-puppet")
            || !double.IsFinite(slot.Opacity) || slot.Opacity is < 0 or > 1
            || !double.IsFinite(slot.ThresholdDb) || slot.ThresholdDb is < -80 or > -20
            || slot.HoldMs is < 0 or > 750 || !double.IsFinite(slot.Scale) || slot.Scale is < 0.5 or > 1.4
            || slot.UserId is not null && !Regex.IsMatch(slot.UserId, @"^(?:\d{17,20}|demo-[ab])$"))
            throw new ArgumentException("Ajustes de avatar fuera de rango.");
    }
}
