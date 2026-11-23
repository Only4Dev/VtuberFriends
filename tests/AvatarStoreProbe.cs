using VtuberFriends;
public static class AvatarStoreProbe
{
    public static void Run()
    {
        string directory = Path.Combine(Path.GetTempPath(), "vf-avatar-test-" + Guid.NewGuid().ToString("N"));
        string path = Path.Combine(directory, "avatars.json");
        try
        {
            var store = new AvatarStore(path);
            if (store.Snapshot().Length != AvatarStore.DefaultSlotCount || store.Snapshot().Any(s => s.Enabled || s.UserId is not null))
                throw new Exception("Las fuentes nuevas no deben aparecer automaticamente.");
            for(int i=0;i<8;i++)store.Add();
            store.Save(1, new AvatarSlot(1, "demo-a", true, Opacity: 0.35, ThresholdDb: -65, NameStyle: "outline", NameSize: 25, NameOpacity: .6, EntryAnimation: "fire", ExitSound: "none"));
            var edited = store.Snapshot()[0] with { PuppetParts = new Dictionary<string, PuppetPartEdit> { ["jaw"] = new(X: 15, Y: -12, ScaleY: .85, Rotation: 3) }, PuppetMouthTravel = 60, PuppetPadding = 300, PuppetMouthMode = "fixed", PuppetMouthMaxDb = -25, PuppetMouthStability = .7 };
            store.Save(1, edited);
            var puppetSaved = new AvatarStore(path).Snapshot()[0];
            if (puppetSaved.PuppetParts?["jaw"].Y != -12 || puppetSaved.PuppetMouthTravel != 60 || puppetSaved.PuppetPadding != 300 || puppetSaved.PuppetMouthMode != "fixed" || puppetSaved.PuppetMouthMaxDb != -25 || puppetSaved.PuppetMouthStability != .7) throw new Exception("No persisten las piezas del editor.");
            try { store.Save(1, edited with { PuppetParts = new Dictionary<string, PuppetPartEdit> { ["arbitrary"] = new() } }); throw new Exception("Acepto pieza desconocida."); } catch (ArgumentException) { }
            try { store.Save(1, edited with { PuppetParts = new Dictionary<string, PuppetPartEdit> { ["jaw"] = new(X: double.NaN) } }); throw new Exception("Acepto NaN."); } catch (ArgumentException) { }
            try { store.Save(1, edited with { PuppetMouthMaxDb = -64 }); throw new Exception("Acepto rango sin separacion suficiente."); } catch (ArgumentException) { }
            var restored = new AvatarStore(path).Snapshot()[0];
            if (restored.NameStyle != "outline" || restored.NameSize != 25 || restored.NameOpacity != .6 || restored.EntryAnimation != "fire" || restored.ExitSound != "none") throw new Exception("No persisten nombre/transiciones/sonidos.");
            if (restored.Opacity != 0.35 || restored.UserId != "demo-a" || !restored.Enabled)
                throw new Exception("No persiste la asignacion/opacidad.");
            try { store.Save(2, new AvatarSlot(2, "demo-a")); throw new Exception("Usuario duplicado aceptado."); }
            catch (ArgumentException) { }
            try { store.Save(1, restored with { Opacity = double.NaN }); throw new Exception("NaN aceptado."); }
            catch (ArgumentException) { }
            if (store.Snapshot()[0].Opacity != 0.35) throw new Exception("Validacion modifico estado guardado.");
            store.Save(1, restored with { Enabled = false });
            if (new AvatarStore(path).Snapshot()[0].Enabled) throw new Exception("Visibilidad no persiste.");
            foreach (var animation in new[] { "summon", "tempest", "celestial" })
            {
                store.Save(1, restored with { EntryAnimation = animation, ExitAnimation = animation, TransitionSpeed = 1.2, TransitionIntensity = .65, TransitionQuality = "high", TransitionScale = .9, TransitionDensity = .6, TransitionColor = "#ffd25a" });
                var effect = new AvatarStore(path).Snapshot()[0];
                if (effect.EntryAnimation != animation || effect.ExitAnimation != animation || effect.TransitionSpeed != 1.2 || effect.TransitionIntensity != .65 || effect.TransitionQuality != "high" || effect.TransitionScale != .9 || effect.TransitionDensity != .6 || effect.TransitionColor != "#ffd25a") throw new Exception("No persiste la secuencia nueva.");
            }
            try { store.Save(1, restored with { TransitionQuality = "ultra" }); throw new Exception("Acepto calidad invalida."); } catch (ArgumentException) { }
            store.Save(1, restored with { Enabled = false });
            store.Save(1, restored with { AmbientEffects = new[] { "runes", "orbs", "embers" }, AmbientColor = "#ffaa66", AmbientIntensity = .8, AmbientSize = 1.2, AmbientSpeed = .6, AmbientQuality = "high" });
            var ornaments = new AvatarStore(path).Snapshot()[0];
            if (ornaments.AmbientEffects?.Count != 3 || ornaments.AmbientColor != "#ffaa66" || ornaments.AmbientIntensity != .8 || ornaments.AmbientQuality != "high") throw new Exception("No persisten adornos.");
            try { store.Save(1, restored with { AmbientEffects = new[] { "runes", "runes" } }); throw new Exception("Adorno duplicado aceptado."); } catch (ArgumentException) { }
            try { store.Save(1, restored with { AmbientEffects = new[] { "unknown" } }); throw new Exception("Adorno desconocido aceptado."); } catch (ArgumentException) { }
            store.Save(1, restored with { Enabled = false });
            var glows = store.Save(1, restored with { PuppetEyeGlow = true, PuppetEyeGlowIntensity = .4, PuppetPatternGlow = true, PuppetPatternGlowIntensity = .3, AmbientEffects = new[] { "runes", "arcs" } });
            var glowsReloaded = new AvatarStore(path).Snapshot()[0];
            if (!glowsReloaded.PuppetEyeGlow || glowsReloaded.PuppetEyeGlowIntensity != .4 || !glowsReloaded.PuppetPatternGlow || glowsReloaded.PuppetPatternGlowIntensity != .3 || glows.AmbientEffects?.Count != 1) throw new Exception("Brillos o migracion de arcos incorrectos.");
            try { store.Save(1, restored with { PuppetEyeGlowIntensity = 1.1 }); throw new Exception("Intensidad glow invalida aceptada."); } catch (ArgumentException) { }
            store.Save(1, restored with { Enabled = false });
            store.Save(1, restored with { AccessoryGlasses = "round", AccessoryHat = "wizard", AccessoryNecklace = "gem" });
            var accessories = new AvatarStore(path).Snapshot()[0];
            if (accessories.AccessoryGlasses != "round" || accessories.AccessoryHat != "wizard" || accessories.AccessoryNecklace != "gem") throw new Exception("Accesorios no persistidos.");
            try { store.Save(1, restored with { AccessoryHat = "unknown" }); throw new Exception("Accesorio desconocido aceptado."); } catch (ArgumentException) { }
            Console.WriteLine("PASS: accesorios independientes persistidos y rechazo de IDs desconocidos.");
            var editMap = new Dictionary<string, AccessoryEdit> { ["cyan-dragon:object-microphone"] = new(-120, 40, 1.2, -20) };
            store.Save(1, restored with { AccessoryObject = "microphone", AccessoryEdits = editMap, ObjectAnimation = "sway", ObjectAmplitude = .6, ObjectSpeed = 1.3 });
            var objectSlot = new AvatarStore(path).Snapshot()[0];
            if (objectSlot.AccessoryObject != "microphone" || objectSlot.AccessoryEdits?["cyan-dragon:object-microphone"].X != -120 || objectSlot.ObjectAnimation != "sway" || objectSlot.ObjectSpeed != 1.3) throw new Exception("Editor/objeto no persistido.");
            try { store.Save(1, restored with { AccessoryEdits = new Dictionary<string, AccessoryEdit> { ["cyan-dragon:object-microphone"] = new(Scale: double.NaN) } }); throw new Exception("Acepto NaN editor."); } catch (ArgumentException) { }
            try { store.Save(1, restored with { ObjectSpeed = 4 }); throw new Exception("Acepto idle fuera de rango."); } catch (ArgumentException) { }
            store.Save(1, objectSlot with { AccessoryObjectLeft = "microphone", ObjectLeftAnimation = "none", ObjectLeftSpeed = 2, AccessoryEdits = new Dictionary<string, AccessoryEdit> { ["cyan-dragon:object-microphone"] = new(-120,40,1.2,-20), ["cyan-dragon:object-microphone-left"] = new(35,-25,.8,20) } });
            var twoObjects = new AvatarStore(path).Snapshot()[0];
            if (twoObjects.AccessoryObject != "microphone" || twoObjects.AccessoryObjectLeft != "microphone" || twoObjects.ObjectAnimation != "sway" || twoObjects.ObjectLeftAnimation != "none" || twoObjects.AccessoryEdits?.Count != 2) throw new Exception("Los dos lados comparten ajustes.");
            try { store.Save(1, restored with { AccessoryObjectLeft = "unknown" }); throw new Exception("Acepto objeto izquierdo desconocido."); } catch (ArgumentException) { }
            if (objectSlot.AccessoryObjectLeft != "none" || objectSlot.AccessoryEdits?["cyan-dragon:object-microphone"].X != -120) throw new Exception("Legacy object no conservado a derecha.");
            Console.WriteLine("PASS: dos objetos independientes, idle/ajustes persistentes y objeto previo conservado a derecha.");
            store.Save(1, restored with { Avatar = "jade-puppet" });
            if (new AvatarStore(path).Snapshot()[0].Avatar != "jade-puppet") throw new Exception("No guarda Jade.");
            store.Save(1, restored with { Avatar = "amber-puppet" });
            if (new AvatarStore(path).Snapshot()[0].Avatar != "amber-puppet") throw new Exception("No guarda Ambar.");
            Console.WriteLine("PASS: Ambar seleccionable y persistente sin afectar Cian/Jade.");
            Console.WriteLine("PASS: Jade seleccionable y persistente junto a Cian.");
            var profiles = new Dictionary<string, AvatarAccessoryProfile> {
                ["cyan-puppet"] = new(AccessoryGlasses: "sun", AccessoryHat: "top", ObjectAnimation: "sway", ObjectSpeed: 2),
                ["amber-puppet"] = new(AccessoryGlasses: "round", ObjectAnimation: "none")
            };
            store.Save(1, restored with { Avatar = "amber-puppet", AccessoryGlasses = "round", ObjectAnimation = "none", AccessoryProfiles = profiles, AccessoryEdits = editMap });
            var profiled = new AvatarStore(path).Snapshot()[0];
            if (profiled.AccessoryProfiles?["cyan-puppet"].AccessoryHat != "top" || profiled.AccessoryProfiles?["amber-puppet"].AccessoryGlasses != "round" || profiled.AccessoryEdits?["cyan-dragon:object-microphone"].X != -120) throw new Exception("Perfiles o posiciones existentes perdidos.");
            try { store.Save(1, restored with { AccessoryProfiles = new Dictionary<string, AvatarAccessoryProfile> { ["cyan-puppet"] = new(ObjectSpeed: double.NaN) } }); throw new Exception("Acepto perfil no activo invalido."); } catch (ArgumentException) { }
            store.Save(1, restored);
            Console.WriteLine("PASS: perfiles por Puppet persistentes, posiciones previas intactas y validacion de perfiles inactivos.");
            store.Save(1, restored with { Avatar = "thoxer-puppet", AccessoryGlasses = "rectangular", PuppetCyberGlow = true, PuppetCyberGlowIntensity = .42 });
            var thoxer = new AvatarStore(path).Snapshot()[0];
            store.Save(1, restored with { Avatar = "ember-puppet" });
            if (new AvatarStore(path).Snapshot()[0].Avatar != "ember-puppet") throw new Exception("Ascua no persiste.");
            store.Save(1, restored with { Avatar = "patch-puppet" });
            if (new AvatarStore(path).Snapshot()[0].Avatar != "patch-puppet") throw new Exception("Remiendo no persiste.");
            store.Save(1, restored with { Avatar = "rose-puppet" });
            if (new AvatarStore(path).Snapshot()[0].Avatar != "rose-puppet") throw new Exception("Rosalia no persiste.");
            store.Save(1, restored with { Avatar = "frost-puppet" });
            if (new AvatarStore(path).Snapshot()[0].Avatar != "frost-puppet") throw new Exception("Boreal no persiste.");
            store.Save(1, restored with { Avatar = "jade-puppet", PuppetJadeShiny = true });
            var shinyJade = new AvatarStore(path).Snapshot()[0];
            if (!shinyJade.PuppetJadeShiny || shinyJade.Avatar != "jade-puppet") throw new Exception("Jade shiny no persiste.");
            store.Save(1, shinyJade with { PuppetJadeShiny = false });
            if (new AvatarStore(path).Snapshot()[0].PuppetJadeShiny) throw new Exception("No vuelve a Jade original.");

            if (thoxer.Avatar != "thoxer-puppet" || thoxer.AccessoryProfiles?["thoxer-puppet"].AccessoryGlasses != "rectangular" || thoxer.PuppetCyberGlowIntensity != .42) throw new Exception("Thoxer no persiste.");
            try { store.Save(1, thoxer with { PuppetCyberGlowIntensity = double.NaN }); throw new Exception("Acepto NaN glow cibernetico."); } catch (ArgumentException) { }
            store.Save(1, restored);
            Console.WriteLine("PASS: Thoxer, lentes rectangulares, perfil y glow persistentes; validacion de intensidad.");
            string catalogPath = Path.Combine(directory, "catalog.json");
            File.WriteAllText(catalogPath, "[{\"category\":\"accessoryHat\",\"value\":\"custom-hat\"}]");
            store.Save(1, restored);
            var custom = new AvatarStore(path, catalogPath);custom.Save(1, restored with { AccessoryHat = "custom-hat" });
            if (new AvatarStore(path, catalogPath).Snapshot()[0].AccessoryHat != "custom-hat") throw new Exception("Catalogo editable ignorado.");
            store.Save(1, restored);File.Delete(catalogPath);
            Console.WriteLine("PASS: ajustes por Puppet, objeto/idle persistentes, limites y catalogo extensible.");
            var legacy = store.Snapshot().Select(slot => new {
                slot.Id, slot.UserId, slot.Enabled, slot.Avatar, slot.Opacity,
                slot.ThresholdDb, slot.HoldMs, slot.Scale, slot.ShowName
            });
            File.WriteAllText(path, System.Text.Json.JsonSerializer.Serialize(legacy, new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web)));
            var migrated = new AvatarStore(path).Snapshot()[0];
            if (migrated.AccessoryProfiles is null || !migrated.AccessoryProfiles.ContainsKey(migrated.Avatar)) throw new Exception("Falta perfil migrado.");
            if (migrated.AccessoryGlasses != "none" || migrated.AccessoryHat != "none" || migrated.AccessoryNecklace != "none") throw new Exception("Accesorios legacy activos.");
            if (migrated.UserId != "demo-a" || migrated.Opacity != .35 || migrated.NameStyle != "plate"
                || migrated.NameSize != 17 || migrated.EntryAnimation != "pop" || migrated.EntrySound != "builtin")
                throw new Exception("Configuracion anterior no migra con defaults.");
            Console.WriteLine("PASS: migracion de configuracion anterior sin perder asignacion/opacidad.");
            // Migrate a real six-slot shape without replacing any existing assignment or setting.
            var six = store.Snapshot().Take(6).ToArray();
            var json = new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web);
            path=Path.Combine(directory,"legacy-avatars.json");
            File.WriteAllText(path, System.Text.Json.JsonSerializer.Serialize(six, json));
            var expanded = new AvatarStore(path);
            if (expanded.Snapshot().Length != 6
                || System.Text.Json.JsonSerializer.Serialize(expanded.Snapshot().Take(6), json) != System.Text.Json.JsonSerializer.Serialize(six, json)) throw new Exception("Expansion pierde fuentes existentes.");
            if(expanded.Add().Id!=7)throw new Exception("ID legacy7 incorrecto.");
            if (expanded.Snapshot()[6].Id != 7 || expanded.Snapshot()[6].Enabled || expanded.Snapshot()[6].UserId is not null) throw new Exception("Fuente7 no empieza vacia.");
            expanded.Save(7, new AvatarSlot(7, "99999999999999999999", true, Avatar: "frost-puppet"));
            var seven = new AvatarStore(path).Snapshot();
            if (seven[6].UserId != "99999999999999999999" || !seven[6].Enabled || seven[6].Avatar != "frost-puppet") throw new Exception("Fuente7 no persiste.");
            try { expanded.Save(1000001, new AvatarSlot(1000001)); throw new Exception("Fuente fuera del limite aceptada."); } catch (ArgumentException) { }
            var sevenOnly = seven.Take(7).ToArray();
            File.WriteAllText(path, System.Text.Json.JsonSerializer.Serialize(sevenOnly, json));
            string originalSeven = File.ReadAllText(path);
            var eightStore = new AvatarStore(path);
            if (eightStore.Snapshot().Length != 7 || System.Text.Json.JsonSerializer.Serialize(eightStore.Snapshot().Take(7),json) != System.Text.Json.JsonSerializer.Serialize(sevenOnly,json)
                || File.ReadAllText(path)!=originalSeven) throw new Exception("Expansion7a8 modifica las fuentes existentes.");
            if(eightStore.Add().Id!=8)throw new Exception("ID legacy8 incorrecto.");
            eightStore.Save(8,new AvatarSlot(8,"888888888888888888",true,Avatar:"rose-puppet",Opacity:.73));
            var savedEight=new AvatarStore(path).Snapshot();
            if(savedEight[7].UserId!="888888888888888888"||savedEight[7].Avatar!="rose-puppet"||savedEight[7].Opacity!=.73||!savedEight[7].Enabled
                || System.Text.Json.JsonSerializer.Serialize(savedEight.Take(7),json)!=System.Text.Json.JsonSerializer.Serialize(sevenOnly,json))throw new Exception("Fuente8 no persiste o cambia fuentes1..7.");
            Console.WriteLine("PASS: fuentes legacy7 intactas al cargar, alta explicita de8 y persistencia sin renumerar.");
            var duplicate = six.Select((s,i) => i == 5 ? s with { Id = 1 } : s).ToArray();
            File.WriteAllText(path, System.Text.Json.JsonSerializer.Serialize(duplicate, json));
            try { _ = new AvatarStore(path); throw new Exception("Configuracion duplicada aceptada."); } catch (InvalidDataException) { }
            Console.WriteLine("PASS: fuentes legacy6 preservadas, altas explicitas, limites y rechazo de IDs duplicados.");
            Console.WriteLine("PASS: estudio nuevo vacio, fuentes agregadas explicitamente y ajustes/validacion persistentes.");
        }
        finally
        {
            if (File.Exists(path)) File.Delete(path);
            if (Directory.Exists(directory)) Directory.Delete(directory,true);
        }
    }
}
