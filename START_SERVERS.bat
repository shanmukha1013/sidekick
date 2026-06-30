@echo off
echo ===================================
echo    SideKick - Starting All Servers
echo ===================================

echo [1/2] Starting Backend API...
start "SideKick Backend" cmd /k "cd /d c:\Users\marel\OneDrive\Desktop\sidekick\backend && .\venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend...
start "SideKick Frontend" cmd /k "cd /d c:\Users\marel\OneDrive\Desktop\sidekick\frontend && npm run dev"

echo.
echo Both servers are starting in separate windows!
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo.
pause
