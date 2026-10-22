param(
    [string]$WorkspaceDir
)

if (Test-Path $WorkspaceDir) {
    Set-Location $WorkspaceDir
}

# Launch Backend & Database logs terminal
$p1 = Start-Process cmd.exe -ArgumentList '/k title InsightDI - Backend Logs & docker compose logs -f backend postgres' -PassThru

# Launch Frontend logs terminal
$p2 = Start-Process cmd.exe -ArgumentList '/k title InsightDI - Frontend Logs & docker compose logs -f frontend' -PassThru

# Save child PIDs to scripts/.child_pids
$pidsFile = Join-Path $WorkspaceDir "scripts\.child_pids"
"$($p1.Id)`n$($p2.Id)" | Out-File -FilePath $pidsFile -Encoding ascii
