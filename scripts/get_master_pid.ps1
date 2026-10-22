param([string]$OutFile)
$myPid = $PID
$parentPid = (Get-CimInstance Win32_Process -Filter "ProcessId = $myPid").ParentProcessId
"$parentPid" | Out-File -FilePath $OutFile -Encoding ascii
