$ErrorActionPreference = "SilentlyContinue"

Write-Host "Setting up Development Environment..." -ForegroundColor Cyan

# Function to kill process by port
function Kill-Port {
    param([int]$port)
    $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($processes) {
        foreach ($proc in $processes) {
            $id = $proc.OwningProcess
            if ($id -gt 0) {
                Write-Host "Killing process on port $port (PID: $id)..." -ForegroundColor Yellow
                Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
            }
        }
    } else {
        Write-Host "Port $port is free." -ForegroundColor Green
    }
}

# 1. Kill ports 3000 (Frontend) and 5000 (Backend)
Kill-Port 3000
Kill-Port 5000

# 2. Start Backend
Write-Host "Starting Backend Service on Port 5000..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; npm run dev"

# 3. Wait briefly for backend to initialize
Start-Sleep -Seconds 2

# 4. Start Frontend
Write-Host "Starting Frontend Service on Port 3000..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

Write-Host "Both servers are launching in separate windows." -ForegroundColor Cyan
