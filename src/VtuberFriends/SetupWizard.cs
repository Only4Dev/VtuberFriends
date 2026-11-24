using System.Text.Json;
namespace VtuberFriends;

// Separate onboarding preference: never rewrites connection or avatar settings.
public sealed class SetupWizard(string path)
{
 private readonly object gate=new();
 public object Describe(bool fresh,bool demo){lock(gate){
  string? outcome=null;
  try{if(File.Exists(path))outcome=JsonSerializer.Deserialize<WizardPreference>(File.ReadAllText(path))?.Outcome;}catch(IOException){}catch(JsonException){}
  return new{shouldAutoOpen=fresh&&!demo&&outcome is null,outcome,demo};
 }}
 public void Save(string outcome){
  if(outcome is not ("skipped" or "completed"))throw new ArgumentException("Invalid wizard outcome.");
  lock(gate){Directory.CreateDirectory(Path.GetDirectoryName(path)!);File.WriteAllText(path+".tmp",JsonSerializer.Serialize(new WizardPreference(outcome)));File.Move(path+".tmp",path,true);}
 }
 private sealed record WizardPreference(string Outcome);
}
public sealed record WizardRequest(string Outcome);
