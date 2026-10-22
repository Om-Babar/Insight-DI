@echo off
setlocal EnableDelayedExpansion
title InsightDI - Master Control

:: Normalize workspace root directory (strip trailing backslash)
set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"
cd /d "%ROOT_DIR%"

echo ======================================================================
echo           INSIGHT-DI AI PLATFORM - CONTAINERIZED LAUNCHER             
echo ======================================================================
echo.

:: 1. Verify Docker Engine is running
echo Checking Docker status...
docker info >nul 2>&1
if %errorlevel% equ 0 goto :docker_active

echo.
echo [ERROR] Docker is not running or not accessible!
echo Please make sure Docker Desktop is running, then try again.
echo.
pause
exit /b 1

:docker_active
echo [OK] Docker daemon is active.
echo.

:: 2. Identify the Master CMD Process PID
set "PID_TMP=%TEMP%\insightdi_master_%RANDOM%.pid"
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%\scripts\get_master_pid.ps1" -OutFile "%PID_TMP%"
set "MASTER_PID="
if not exist "%PID_TMP%" goto :skip_read_pid
set /p MASTER_PID=<"%PID_TMP%"
del "%PID_TMP%" 2>nul
:skip_read_pid

:: 3. Launch background watchdog (monitors window close event)
if not defined MASTER_PID goto :skip_watchdog
echo Initializing terminal watchdog monitor for PID %MASTER_PID%...
start "" /B powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%\scripts\watchdog.ps1" -MasterPid %MASTER_PID% -WorkspaceDir "%ROOT_DIR%"
:skip_watchdog

:: 4. Start Docker Compose services
echo Starting InsightDI containers [PostgreSQL, Backend, Frontend]...
docker compose up -d
if %errorlevel% equ 0 goto :compose_up_ok

echo.
echo [ERROR] Failed to start Docker Compose containers.
pause
exit /b 1

:compose_up_ok

:: 5. Launch child log streaming terminal windows
echo Launching live service log terminals...
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%\scripts\launch_terminals.ps1" -WorkspaceDir "%ROOT_DIR%"

:: 6. Launch browser
echo Opening InsightDI in default browser...
start http://localhost:5173

:: 7. Display Dashboard
cls
echo ======================================================================
echo            INSIGHT-DI AI PLATFORM - DOCKER CONTAINERIZED
echo ======================================================================
echo.
echo   All services are up and running inside Docker containers:
echo.
echo     [+] React Frontend UI   : http://localhost:5173
echo     [+] FastAPI Backend     : http://localhost:8000
echo     [+] API Documentation   : http://localhost:8000/docs
echo     [+] PostgreSQL Database : localhost:5432 [insightdi-postgres]
echo.
echo   Opened Terminals:
echo     - InsightDI - Backend Logs
echo     - InsightDI - Frontend Logs
echo     - InsightDI - Master Control [This window]
echo.
echo ======================================================================
echo   AUTO-SHUTDOWN AND CLEANUP NOTICE:
echo   Closing this window [clicking X, pressing Ctrl+C, or entering Q]
echo   will automatically close ALL opened terminals and gracefully shut
echo   down all Docker containers!
echo ======================================================================
echo.

:wait_loop
set /p "USER_INPUT=Type Q and press Enter to stop all services and exit: "
if /i "%USER_INPUT%"=="Q" goto :shutdown
goto :wait_loop

:shutdown
echo.
echo Stopping all InsightDI services and closing opened terminals...
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%\scripts\cleanup.ps1" -WorkspaceDir "%ROOT_DIR%"

echo.
echo [+] All terminals closed and Docker containers shut down cleanly.
ping -n 3 127.0.0.1 >nul 2>&1
exit /b 0
