$ErrorActionPreference = "Stop"
Set-Location "d:\personal project\expiry-&-tasks-management-system v1.2.0\server"
$TS_NODE = "d:\personal project\expiry-&-tasks-management-system v1.2.0\server\node_modules\ts-node\dist\bin.js"

Write-Host "Killing any process on port 5000..."
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

Write-Host "Starting Server via TS-Node (Transpile Only)..."
node $TS_NODE -T src/index.ts
