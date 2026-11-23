#define UNICODE
#define _UNICODE
#include <windows.h>
#include <wchar.h>
int WINAPI wWinMain(HINSTANCE instance,HINSTANCE previous,PWSTR args,int show){
 wchar_t path[32768];if(!GetModuleFileNameW(NULL,path,32768))return 1;
 wchar_t *end=wcsrchr(path,L'\\');if(!end)return 1;*end=0;
 if(wcscat_s(path,32768,L"\\restart-probe.ok"))return 1;
 HANDLE file=CreateFileW(path,GENERIC_WRITE,0,NULL,CREATE_ALWAYS,FILE_ATTRIBUTE_NORMAL,NULL);
 if(file==INVALID_HANDLE_VALUE)return 1;DWORD written;WriteFile(file,"restarted",9,&written,NULL);CloseHandle(file);return 0;
}
