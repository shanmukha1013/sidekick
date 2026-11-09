@echo off
echo Starting Sidekick (backend :8000, frontend :3000)
start "Sidekick API" cmd /k "cd /d %~dp0backend && venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"
timeout /t 3 /nobreak >nul
start "Sidekick Web" cmd /k "cd /d %~dp0frontend && npm run dev"
