using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
namespace VtuberFriends;
// Compatible with Windows PowerShell ConvertFrom-SecureString (DPAPI CurrentUser, UTF-16, hex).
public static class TokenVault
{
 [StructLayout(LayoutKind.Sequential)]private struct Blob{public int Length;public IntPtr Data;}
 [DllImport("crypt32.dll",SetLastError=true,CharSet=CharSet.Unicode)]private static extern bool CryptProtectData(ref Blob input,string? description,IntPtr entropy,IntPtr reserved,IntPtr prompt,int flags,out Blob output);
 [DllImport("crypt32.dll",SetLastError=true)]private static extern bool CryptUnprotectData(ref Blob input,IntPtr description,IntPtr entropy,IntPtr reserved,IntPtr prompt,int flags,out Blob output);
 [DllImport("kernel32.dll")]private static extern IntPtr LocalFree(IntPtr memory);
 private static byte[] Transform(byte[] bytes,bool protect){
  if(!OperatingSystem.IsWindows())throw new PlatformNotSupportedException();
  var input=new Blob{Length=bytes.Length,Data=Marshal.AllocHGlobal(bytes.Length)};Blob output=default;
  try{Marshal.Copy(bytes,0,input.Data,bytes.Length);bool ok=protect?CryptProtectData(ref input,null,IntPtr.Zero,IntPtr.Zero,IntPtr.Zero,1,out output):CryptUnprotectData(ref input,IntPtr.Zero,IntPtr.Zero,IntPtr.Zero,IntPtr.Zero,1,out output);
   if(!ok)throw new Win32Exception(Marshal.GetLastWin32Error());byte[] result=new byte[output.Length];Marshal.Copy(output.Data,result,0,result.Length);return result;
  }finally{for(int i=0;i<input.Length;i++)Marshal.WriteByte(input.Data,i,0);Marshal.FreeHGlobal(input.Data);if(output.Data!=IntPtr.Zero){for(int i=0;i<output.Length;i++)Marshal.WriteByte(output.Data,i,0);LocalFree(output.Data);}}
 }
 public static void Save(string path,string token){
  if(string.IsNullOrWhiteSpace(token)||token.Length>512)throw new ArgumentException("Token vacío o demasiado largo.");
  byte[] plain=Encoding.Unicode.GetBytes(token.Trim());try{byte[] encrypted=Transform(plain,true);Directory.CreateDirectory(Path.GetDirectoryName(path)!);File.WriteAllText(path+".tmp",Convert.ToHexString(encrypted).ToLowerInvariant(),Encoding.ASCII);File.Move(path+".tmp",path,true);}finally{CryptographicOperations.ZeroMemory(plain);}
 }
 public static string? Read(string path){if(!File.Exists(path))return null;byte[] plain=Transform(Convert.FromHexString(File.ReadAllText(path).Trim()),false);try{return Encoding.Unicode.GetString(plain);}finally{CryptographicOperations.ZeroMemory(plain);}}
}
