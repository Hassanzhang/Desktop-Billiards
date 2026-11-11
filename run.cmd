@echo off
setlocal
cd /d "%~dp0"
where npm >nul 2>nul
if errorlevel 1 (
    echo [error] Install Node.js LTS and Rust first. See README.md.
    pause
    exit /b 1
)
if not exist "node_modules\@tauri-apps\cli" (
    call npm ci
    if errorlevel 1 exit /b 1
)
call npm run dev
exit /b %errorlevel%
