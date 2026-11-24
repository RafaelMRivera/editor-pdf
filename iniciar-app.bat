@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
if not exist dist\index.html (
  echo Preparando la aplicacion por primera vez...
  call npm run build
)
echo.
echo ==============================================================
echo   PENFICH  -  aplicacion web
echo ==============================================================
echo   En este PC:        http://localhost:4173
echo   En la tablet (misma red Wi-Fi), abre en Chrome:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  set "ip=%%a"
  echo        http://!ip: =!:4173
)
echo.
echo   Deja esta ventana abierta mientras uses la app.
echo   Para cerrar el servidor: Ctrl + C
echo ==============================================================
echo.
call npx vite preview --host --port 4173
