using VtuberFriends;
using System.Text.Json;
internal static class SoundLibraryProbe
{
 public static void Run(){
  string dir=Path.Combine(Path.GetTempPath(),"vf-library-"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(dir);
  try {
   string library=Path.Combine(dir,"Sonidos");Directory.CreateDirectory(library);var store=new SoundStore(Path.Combine(dir,"private"),library);
   File.WriteAllBytes(Path.Combine(library,"entrada.wav"),SoundStore.Builtin(true));File.WriteAllText(Path.Combine(library,"falso.mp3"),"not audio");File.WriteAllText(Path.Combine(library,"nota.txt"),"ignore");
   var items=store.List();if(items.Length!=1)throw new Exception("Biblioteca invalida.");string id=JsonSerializer.SerializeToElement(items[0]).GetProperty("soundId").GetString()!;
   if(!SoundStore.IsId(id)||store.Find(id)?.Mime!="audio/wav"||store.Find("../bot-token.dpapi") is not null)throw new Exception("ID/ruta invalida.");
   File.WriteAllBytes(Path.Combine(library,"entrada.wav"),SoundStore.Builtin(false));if(JsonSerializer.SerializeToElement(store.List()[0]).GetProperty("soundId").GetString()!=id)throw new Exception("ID no estable.");
   File.Delete(Path.Combine(library,"entrada.wav"));if(store.List().Length!=0||store.Find(id) is not null)throw new Exception("No detecta baja.");
   var avatars=new AvatarStore(Path.Combine(dir,"avatars.json"),Path.GetFullPath("src/VtuberFriends/wwwroot/accessories/catalog.json"));
   var slot=avatars.Snapshot()[0] with {Avatar="cyan-puppet",AccessoryAura="energy",AccessoryFloor="smoke",AccessoryLightning="storm",AccessoryEffect="nose-smoke",AccessoryObject="phone",AccessoryObjectLeft="galaxy",AccessoryHat="crown",AccessoryEdits=new Dictionary<string,AccessoryEdit>{["cyan-dragon:effect-aura"]=new(X:120,Y:-50,Color:"#ffaa00",Intensity:.7,Speed:1.4),["jade-dragon:effect-nose"]=new(Interval:35,Spread:.2)}};
   avatars.Save(1,slot);var restored=new AvatarStore(Path.Combine(dir,"avatars.json"),Path.GetFullPath("src/VtuberFriends/wwwroot/accessories/catalog.json")).Snapshot()[0];
   if(restored.AccessoryAura!="energy"||restored.AccessoryEdits?["jade-dragon:effect-nose"].Interval!=35||restored.AccessoryProfiles?["cyan-puppet"].AccessoryFloor!="smoke")throw new Exception("Efectos no persistidos.");
   foreach(var bad in new[]{new AccessoryEdit(Color:"red"),new AccessoryEdit(Intensity:2),new AccessoryEdit(Interval:1),new AccessoryEdit(Spread:double.NaN)}){
    try{avatars.Save(1,slot with {AccessoryEdits=new Dictionary<string,AccessoryEdit>{["cyan-dragon:effect-aura"]=bad}});throw new Exception("Ajuste invalido aceptado.");}catch(ArgumentException){}
   }
   Console.WriteLine("PASS: biblioteca altas/bajas, contenido/ID seguro y estable; efectos/color/intervalo por Puppet persistidos y rangos validados.");
  }finally{Directory.Delete(dir,true);}
 }
}
