using VtuberFriends;
using System.Text.Json;
string root=Path.Combine(Path.GetTempPath(),"vf-wizard-unit-"+Guid.NewGuid());Directory.CreateDirectory(root);
void Check(bool value,string message){if(!value)throw new Exception(message);}
try{
 using var log=new DiagnosticLog(Path.Combine(root,"logs"));string token=Path.Combine(root,"token.dpapi"),config=Path.Combine(root,"config.json");File.WriteAllText(config,"SYNTHETIC_CONFIG");
 await using var connection=new ConnectionManager(config,token,new Levels(),log,true);
 var wizard=new SetupWizard(Path.Combine(root,"setup-wizard.json"));
 bool Offer(bool demo=false,int count=0)=>JsonSerializer.SerializeToElement(wizard.Describe(!connection.HasSetup&&count==0,demo)).GetProperty("shouldAutoOpen").GetBoolean();
 connection.SetInitial(new());Check(Offer(),"fresh defaults not offered");Check(!File.Exists(Path.Combine(root,"setup-wizard.json")),"GET persisted state");Check(!Offer(true),"demo auto-opened");Check(!Offer(count:8),"legacy sources auto-opened");
 connection.SetInitial(new(){GuildId="partial"});Check(!Offer(),"partial IDs auto-opened");connection.SetInitial(new(){Port=17862});Check(!Offer(),"custom port auto-opened");connection.SetInitial(new());File.WriteAllText(token,"SYNTHETIC_TOKEN");Check(!Offer(),"saved token auto-opened");File.Delete(token);
 wizard.Save("skipped");Check(!Offer(),"skip ignored");var reopened=new SetupWizard(Path.Combine(root,"setup-wizard.json"));Check(!JsonSerializer.SerializeToElement(reopened.Describe(true,false)).GetProperty("shouldAutoOpen").GetBoolean(),"skip lost across restart");reopened.Save("completed");Check(!Offer(),"completion ignored");
 bool rejected=false;try{wizard.Save("reset");}catch(ArgumentException){rejected=true;}Check(rejected,"invalid outcome accepted");Check(File.ReadAllText(config)=="SYNTHETIC_CONFIG","config modified");
 Console.WriteLine("PASS: exact default setup offered, read-only discovery, partial IDs/token/custom port/legacy sources/demo suppress automatic wizard; skip/completion durable; no config reset, browser or Discord.");
}finally{Directory.Delete(root,true);}
