#define UNICODE
#define _UNICODE
#include <windows.h>
#include <wchar.h>
int WINAPI wWinMain(HINSTANCE instance,HINSTANCE previous,PWSTR arguments,int show){
 wchar_t root[32768],exe[32768],command[32768];
 if(!GetModuleFileNameW(NULL,root,32768))return 1;
 wchar_t *end=wcsrchr(root,L'\\');if(!end)return 1;*end=0;
 if(swprintf_s(exe,32768,L"%s\\app\\VtuberFriends.exe",root)<0||swprintf_s(command,32768,L"\"%s\" %s",exe,arguments)<0)return 1;
 STARTUPINFOW startup={sizeof(startup)};PROCESS_INFORMATION process={0};
 if(!CreateProcessW(exe,command,NULL,NULL,FALSE,0,NULL,root,&startup,&process)){MessageBoxW(NULL,L"No se pudo abrir la app. Conserva la carpeta app junto a VtuberFriends.exe y extrae todo el ZIP.",L"Vtuber & Friends",MB_ICONERROR);return 1;}
 CloseHandle(process.hThread);CloseHandle(process.hProcess);return 0;
}
