$port = 5000
$processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($processes) {
    foreach ($proc in $processes) {
        $id = $proc.OwningProcess
        if ($id -gt 0) {
            Write-Host "Killing process ID: $id"
            Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
        }
    }
}
else {
    Write-Host "No process found on port 5000."
}
