@echo off
echo Starting Multi-Agent Observability Dashboard...
echo.
echo Server: http://localhost:4000
echo Dashboard: http://localhost:5173
echo.
start "Observability Server" cmd /c "cd /d C:\Users\tphillips\source\repos\claude-code-hooks-multi-agent-observability\apps\server && bun run dev"
timeout /t 2 /nobreak >nul
start "Observability Client" cmd /c "cd /d C:\Users\tphillips\source\repos\claude-code-hooks-multi-agent-observability\apps\client && bun run dev"
timeout /t 3 /nobreak >nul
start http://localhost:5173
echo Dashboard started! Close this window when done.
