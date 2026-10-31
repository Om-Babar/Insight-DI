param(
    [int]$MasterPid,
    [string]$WorkspaceDir
)

# Only proceed if a valid MasterPid was provided
if ($MasterPid -le 0) {
    exit 0
}

# Wait until the master CMD process exits (e.g. user closed terminal or quit)
while ($true) {
    $proc = Get-Process -Id $MasterPid -ErrorAction SilentlyContinue
    if (-not $proc) {
        break
    }
    Start-Sleep -Milliseconds 500
}

# Master terminal was closed! Wait a fraction of a second to ensure clean state
Start-Sleep -Milliseconds 300

# Execute cleanup
$cleanupScript = Join-Path $WorkspaceDir "scripts\cleanup.ps1"
if (Test-Path $cleanupScript) {
    & $cleanupScript -WorkspaceDir $WorkspaceDir
} else {
    # Fallback cleanup
    Get-Process | Where-Object {
        $_.MainWindowTitle -like "InsightDI - Backend Logs*" -or
        $_.MainWindowTitle -like "InsightDI - Frontend Logs*"
    } | ForEach-Object {
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $WorkspaceDir) {
        Set-Location $WorkspaceDir
    }
    docker compose down 2>$null
}
