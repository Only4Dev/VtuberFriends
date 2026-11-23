using VtuberFriends;
using System.Text.Json;
public static class DynamicSourcesProbe{
 public static void Run(){
  string dir=Path.Combine(Path.GetTempPath(),"vf-dynamic-"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(dir);string path=Path.Combine(dir,"avatars.json");
  var json=new JsonSerializerOptions(JsonSerializerDefaults.Web);
  var fresh=new AvatarStore(path);if(fresh.Snapshot().Length!=0||File.Exists(path))throw new Exception("New studio must be empty without writing settings.");
  var a=fresh.Add();var b=fresh.Add();var c=fresh.Add();fresh.Save(a.Id,a with{UserId="111111111111111111",Opacity=.67,AccessoryGlasses="round",AccessoryEdits=new Dictionary<string,AccessoryEdit>{{"cyan-dragon:glasses-round",new(15,27,.8,11)}}});
  var before=fresh.Snapshot().Where(s=>s.Id!=b.Id).Select(s=>JsonSerializer.Serialize(s,json)).ToArray();fresh.Remove(b.Id);var after=new AvatarStore(path);if(after.Snapshot().Select(s=>s.Id).SequenceEqual(new[]{1,3})==false)throw new Exception("Delete renumbered sources.");
  if(!before.SequenceEqual(after.Snapshot().Select(s=>JsonSerializer.Serialize(s,json))))throw new Exception("Delete changed another source.");
  if(after.Add().Id!=4)throw new Exception("Deleted URL was reused.");try{after.Save(2,new AvatarSlot(2));throw new Exception("Late save resurrected a removed source.");}catch(ArgumentException){}
  foreach(var slot in after.Snapshot())after.Remove(slot.Id);if(new AvatarStore(path).Add().Id!=5)throw new Exception("All-deleted identity was lost.");
  if(!Directory.EnumerateFiles(Path.Combine(dir,"source-backups")).Any())throw new Exception("Deletion backup missing.");
  string legacy=Path.Combine(dir,"legacy.json");var rows=Enumerable.Range(1,8).Select(i=>new AvatarSlot(i,UserId:(111111111111111110L+i).ToString(),Enabled:true,Avatar:i%2==0?"frost-puppet":"rose-puppet",Opacity:i*.1)).ToArray();File.WriteAllText(legacy,JsonSerializer.Serialize(rows,json));var bytes=File.ReadAllBytes(legacy);var loaded=new AvatarStore(legacy);if(loaded.Snapshot().Length!=8||!File.ReadAllBytes(legacy).SequenceEqual(bytes))throw new Exception("Legacy config rewritten on startup.");
  var prior=loaded.Snapshot().Select(s=>JsonSerializer.Serialize(s,json)).ToArray();if(loaded.Add().Id!=9||!prior.SequenceEqual(loaded.Snapshot().Take(8).Select(s=>JsonSerializer.Serialize(s,json))))throw new Exception("Legacy profiles changed by Add.");
  string cap=Path.Combine(dir,"cap.json");var full=new AvatarStore(cap);for(int i=0;i<AvatarStore.MaximumSlotCount;i++)full.Add();try{full.Add();throw new Exception("Unbounded sources.");}catch(ArgumentException){}
  Console.WriteLine("PASS: new studio0, legacy8 byte-preserved on load, additive9, delete confirmation handled by UI, other profiles unchanged, stable URLs/nonreused IDs across restart/all-deleted, late-save rejection, local backups and cap64. Synthetic data only.");
 }
}
