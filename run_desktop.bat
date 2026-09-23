@echo off
echo ========================================================
echo   KING STING VULNScanner - Launching Desktop Suite
echo ========================================================
echo.

cd /d "%~dp0frontend"
echo [1/2] Verifying frontend and dependencies...
call npm run build

echo.
echo [2/2] Launching Python Backend + Electron Desktop App...
start "" /b python "%~dp0backend\app\main.py"
timeout /t 2 /nobreak >nul
npx electron .
