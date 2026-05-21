param()

$ErrorActionPreference = 'Stop'

$installDir = Join-Path $HOME '.pluto'
$npmPrefix = $null

try {
    $npmPrefix = (npm config get prefix).Trim()
} catch {
}

$binLocations = @()
if ($npmPrefix) {
    $binLocations += @(
        (Join-Path $npmPrefix 'pluto'),
        (Join-Path $npmPrefix 'pluto.cmd'),
        (Join-Path $npmPrefix 'pluto.ps1')
    )
}

$userBinDir = Join-Path $HOME '.local\bin'
$binLocations += @(
    (Join-Path $userBinDir 'pluto'),
    (Join-Path $userBinDir 'pluto.cmd'),
    (Join-Path $userBinDir 'pluto.ps1')
)

Write-Host ''
Write-Host '==========================================='
Write-Host '          PLUTO UNINSTALLER'
Write-Host '==========================================='
Write-Host ''

$confirmation = Read-Host 'Are you sure you want to uninstall Pluto? (y/N)'
if ($confirmation -notmatch '^[Yy]$') {
    Write-Host 'Uninstall cancelled.' -ForegroundColor Yellow
    exit 0
}

Write-Host ''

try {
    npm unlink -g pluto | Out-Null
} catch {
}

try {
    npm uninstall -g pluto | Out-Null
} catch {
}

foreach ($binPath in $binLocations) {
    if (Test-Path $binPath) {
        Remove-Item -Path $binPath -Force -ErrorAction SilentlyContinue
        Write-Host "[ok] Removed $binPath" -ForegroundColor Green
    }
}

if (Test-Path $installDir) {
    Remove-Item -Path $installDir -Recurse -Force
    Write-Host "[ok] Removed $installDir" -ForegroundColor Green
}

Write-Host ''
Write-Host '===========================================' -ForegroundColor Green
Write-Host ' Pluto has been uninstalled.' -ForegroundColor Green
Write-Host '===========================================' -ForegroundColor Green
Write-Host ''
Write-Host 'Note: Project-specific .pluto folders were not removed.'
Write-Host 'You can delete them manually if needed.'
Write-Host ''