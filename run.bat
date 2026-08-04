@echo off
title AI Job Hunter - Autonomous Multi-Portal Job Scout Engine
cls
echo =========================================================================
echo  🤖 AI JOB HUNTER - INTELLIGENT JOB MATCHING & AUTO-APPLY PLATFORM
echo  Multi-Portal Scout: LinkedIn, Naukri, Indeed, Glassdoor, Greenhouse, Lever, Ashby, Foundit, Wellfound
echo =========================================================================
echo.

IF NOT EXIST "node_modules\" (
    echo [!] node_modules directory not found. Installing dependencies...
    call npm install
    echo [✓] Dependencies installed successfully.
    echo.
)

echo [1/2] Verifying TypeScript build & bundle integrity...
call npm run build
IF %ERRORLEVEL% NEQ 0 (
    echo [X] Build error detected! Please check logs.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Launching AI Job Hunter Live Development Server...
echo [→] Opening http://localhost:5173/ in your browser...
echo.

start "" "http://localhost:5173/"
call npm run dev

pause
