@echo off
title InsightDI - Stopping All Services

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"
cd /d "%ROOT_DIR%"

echo Stopping InsightDI Docker containers and closing any open terminals...
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%\scripts\cleanup.ps1" -WorkspaceDir "%ROOT_DIR%"

echo [✓] All InsightDI containers and terminals stopped.
ping -n 3 127.0.0.1 >nul 2>&1
exit /b 0
