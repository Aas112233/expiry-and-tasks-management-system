$ErrorActionPreference = "Stop"
Set-Location "d:\personal project\expiry-&-tasks-management-system v1.2.0\server"
$PRISMA_CLI = "d:\personal project\expiry-&-tasks-management-system v1.2.0\server\node_modules\prisma\build\index.js"

Write-Host "Running Prisma Generate..."
node $PRISMA_CLI generate

Write-Host "Running Prisma DB Push..."
node $PRISMA_CLI db push

Write-Host "Done."
