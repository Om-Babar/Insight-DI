param(
    [string]$WorkspaceDir
)

if (Test-Path $WorkspaceDir) {
    Set-Location $WorkspaceDir
}

# 1. Kill tracked child terminal PIDs
$pidsFile = Join-Path $WorkspaceDir "scripts\.child_pids"
if (Test-Path $pidsFile) {
    try {
        Get-Content $pidsFile | ForEach-Object {
            $t = $_.Trim()
            if ($t -match '^\d+$') {
                Stop-Process -Id ([int]$t) -Force -ErrorAction SilentlyContinue
            }
        }
        Remove-Item $pidsFile -Force -ErrorAction SilentlyContinue
    } catch {}
}

# 2. Kill by window title pattern for child log terminals
Get-Process | Where-Object {
    $_.MainWindowTitle -like "InsightDI - Backend Logs*" -or
    $_.MainWindowTitle -like "InsightDI - Frontend Logs*"
} | ForEach-Object {
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

# 3. Stop Docker Compose containers
docker compose down 2>$null
