using System.Net;
using System.Text;
using System.Text.Json;
using System.Security.Cryptography;
using System.IO.Compression;
using VtuberFriends;
static void Check(bool value,string message){if(!value)throw new Exception(message);}
string root=Path.Combine(Path.GetTempPath(),"vf-updates-"+Guid.NewGuid());Directory.CreateDirectory(root);byte[] dll=Encoding.UTF8.GetBytes("SYNTHETIC_DLL");await File.WriteAllBytesAsync(Path.Combine(root,"VtuberFriends.dll"),dll);await File.WriteAllTextAsync(Path.Combine(root,"config.json"),"SYNTHETIC_CONFIG");Directory.CreateDirectory(Path.Combine(root,".local"));await File.WriteAllTextAsync(Path.Combine(root,".local","avatars.json"),"SYNTHETIC_POSITIONS");
string hash=Convert.ToHexStringLower(SHA256.HashData(dll));using var bytes=new MemoryStream();using(var zip=new ZipArchive(bytes,ZipArchiveMode.Create,true)){var e=zip.CreateEntry("../../config.json");using var w=new StreamWriter(e.Open());w.Write("ATTACK");}byte[] payload=bytes.ToArray();
object Asset(string url)=>new{name="vf-update-"+hash[..12]+".zip",browser_download_url=url,size=payload.Length,digest="sha256:"+Convert.ToHexStringLower(SHA256.HashData(payload))};
string url="https://github.com/Only4Dev/VtuberFriends/releases/download/v999.0.0/patch.zip";
JsonElement Element(object a)=>JsonSerializer.SerializeToElement(a);
foreach(string bad in new[]{"http://github.com/Only4Dev/VtuberFriends/releases/download/x/y","https://evil.invalid/patch.zip","https://github.com/attacker/repo/releases/download/x/y"}){bool rejected=false;try{UpdateService.ValidateAsset(Element(Asset(bad)));}catch{rejected=true;}Check(rejected,"untrusted URL accepted");}
Check(!UpdateService.AllowedEntry("config.json")&&!UpdateService.AllowedEntry(".local/bot-token.dpapi"),"private entry accepted");
var handler=new FakeHandler{Release=JsonSerializer.Serialize(new{tag_name="v999.0.0",draft=false,prerelease=false,assets=new[]{Asset(url)}}),Payload=payload};using var http=new HttpClient(handler);var updates=new UpdateService(root,http);
Check(JsonSerializer.Serialize(await updates.Check()).Contains("available"),"compatible asset not discovered");
Check(JsonSerializer.Serialize(await updates.Download()).Contains("error"),"zip traversal not rejected");
Check(await File.ReadAllTextAsync(Path.Combine(root,"config.json"))=="SYNTHETIC_CONFIG","config overwritten");Check(await File.ReadAllTextAsync(Path.Combine(root,".local","avatars.json"))=="SYNTHETIC_POSITIONS","settings overwritten");Check((await File.ReadAllBytesAsync(Path.Combine(root,"VtuberFriends.dll"))).SequenceEqual(dll),"code changed before install");
handler.Status=HttpStatusCode.NotFound;Check(JsonSerializer.Serialize(await updates.Check()).Contains("current"),"missing release not handled");
handler.Status=HttpStatusCode.OK;handler.Release="malformed";Check(JsonSerializer.Serialize(await updates.Check()).Contains("error"),"bad manifest not handled");Check(!updates.Install(),"unverified install allowed");
Console.WriteLine("PASS: public release discovery with fake HTTP, exact DLL match, trusted URLs/digests, ZIP traversal rejection, absent/malformed release, no unverified install and byte-identical config/settings/code. No real network or credentials.");
sealed class FakeHandler:HttpMessageHandler{public string Release="";public byte[] Payload=[];public HttpStatusCode Status=HttpStatusCode.OK;protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,CancellationToken ct)=>Task.FromResult(new HttpResponseMessage(Status){Content=request.RequestUri!.Host=="api.github.com"?new StringContent(Release):new ByteArrayContent(Payload)});}
