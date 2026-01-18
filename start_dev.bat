@echo off
setlocal

echo Killing processes on port 3000 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo Killing processes on port 5000 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo Starting Backend Server...
cd server
start "Backend Server" cmd /c "npm run dev"
cd ..

echo Starting Frontend Server...
start "Frontend Server" cmd /c "npm run dev"

echo Development environment started successfully!
endlocal
