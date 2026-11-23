using System.Diagnostics;
namespace VtuberFriends;
public static class DesktopWindow
{
 public static void Open(string url){
  foreach(var root in new[]{Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles)}){
   string edge=Path.Combine(root,"Microsoft","Edge","Application","msedge.exe");if(!File.Exists(edge))continue;
   Process.Start(new ProcessStartInfo(edge){UseShellExecute=false,ArgumentList={"--app="+url,"--start-maximized"}});return;
  }
  Process.Start(new ProcessStartInfo(url){UseShellExecute=true});
 }
}
