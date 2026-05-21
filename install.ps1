param(
    [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'

function Write-Status {
    param(
        [string]$Message,
        [ConsoleColor]$Color = [ConsoleColor]::Green
    )

    Write-Host $Message -ForegroundColor $Color
}

function Get-NodeMajorVersion {
    $nodeVersion = node -v
    return [int]($nodeVersion.TrimStart('v').Split('.')[0])
}

function Copy-DirectoryContents {
    param(
        [string]$Source,
        [string]$Destination
    )

    Get-ChildItem -Path $Source -Force | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $Destination -Recurse -Force
    }
}

function Install-UserBinLauncher {
    param(
        [string]$ShimPath,
        [string]$NpmPrefix
    )

    $userBinDir = Join-Path $HOME '.local\bin'
    $isOnPath = ($env:PATH -split ';') -contains $userBinDir

    if (-not (Test-Path $userBinDir) -and -not $isOnPath) {
        return $null
    }

    New-Item -ItemType Directory -Path $userBinDir -Force | Out-Null

    $legacyLauncher = Join-Path $userBinDir 'pluto'
    $cmdLauncher = Join-Path $userBinDir 'pluto.cmd'
    $psLauncher = Join-Path $userBinDir 'pluto.ps1'

    Remove-Item -Path $legacyLauncher -Force -ErrorAction SilentlyContinue

    $cmdContent = @"
@ECHO OFF
""$ShimPath"" %*
"@
    Set-Content -Path $cmdLauncher -Value $cmdContent -NoNewline

    $psContent = @"
& '$ShimPath' @args
"@
    Set-Content -Path $psLauncher -Value $psContent -NoNewline

    return $userBinDir
}

$installDir = Join-Path $HOME '.pluto'
$repoUrl = 'https://github.com/andychuong/pluto'

Write-Host ''
Write-Host '==========================================='
Write-Host '           PLUTO INSTALLER'
Write-Host '      AI Agent and Command Installer'
Write-Host '==========================================='
Write-Host ''

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js is required but was not found. Install Node.js 18+ from https://nodejs.org/'
}

$nodeMajorVersion = Get-NodeMajorVersion
if ($nodeMajorVersion -lt 18) {
    throw "Node.js 18 or higher is required. Current version: $(node -v)"
}

Write-Status "[ok] Node.js $(node -v) detected"

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw 'npm is required but was not found.'
}

Write-Status "[ok] npm $(npm -v) detected"

Write-Host ''
Write-Host "Installing Pluto to $installDir..." -ForegroundColor Yellow
Write-Host ''

if (Test-Path $installDir) {
    Write-Host 'Removing existing installation...' -ForegroundColor Yellow
    try {
        npm unlink -g pluto | Out-Null
    } catch {
    }
    try {
        npm uninstall -g pluto | Out-Null
    } catch {
    }
    Remove-Item -Path $installDir -Recurse -Force
}

New-Item -ItemType Directory -Path $installDir -Force | Out-Null

$localInstallerDir = Join-Path $PSScriptRoot 'installer'
if (Test-Path $localInstallerDir) {
    Write-Host 'Installing from local source...' -ForegroundColor Cyan
    Copy-DirectoryContents -Source $localInstallerDir -Destination $installDir
} else {
    Write-Host 'Downloading Pluto from GitHub...' -ForegroundColor Cyan
    $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("pluto-install-" + [System.Guid]::NewGuid().ToString('N'))
    $zipPath = Join-Path $tempRoot 'pluto.zip'
    $extractPath = Join-Path $tempRoot 'extract'
    $archiveRoot = Join-Path $extractPath ("pluto-" + $Branch)

    try {
        New-Item -ItemType Directory -Path $extractPath -Force | Out-Null
        Invoke-WebRequest -Uri "$repoUrl/archive/refs/heads/$Branch.zip" -OutFile $zipPath
        Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force
        Copy-DirectoryContents -Source (Join-Path $archiveRoot 'installer') -Destination $installDir
    } catch {
        throw "Failed to download Pluto from GitHub: $($_.Exception.Message)"
    } finally {
        if (Test-Path $tempRoot) {
            Remove-Item -Path $tempRoot -Recurse -Force
        }
    }
}

Write-Host ''
Write-Host 'Installing dependencies...' -ForegroundColor Cyan
Write-Host ''

Push-Location $installDir
try {
    npm install --silent

    Write-Host ''
    Write-Host 'Linking Pluto into your npm global bin...' -ForegroundColor Cyan
    npm link | Out-Null
} finally {
    Pop-Location
}

$npmPrefix = (npm config get prefix).Trim()
$binDir = $npmPrefix
$userBinDir = Install-UserBinLauncher -ShimPath (Join-Path $npmPrefix 'pluto.cmd') -NpmPrefix $npmPrefix

Write-Status "[ok] Pluto command linked in $binDir"
if ($userBinDir) {
    Write-Status "[ok] Pluto launcher installed in $userBinDir"
}

Write-Host ''
Write-Host '===========================================' -ForegroundColor Green
Write-Host ' Pluto installed successfully.' -ForegroundColor Green
Write-Host '===========================================' -ForegroundColor Green
Write-Host ''
Write-Host 'Get started by running:'
Write-Host '  pluto init     - Set up Pluto in your project' -ForegroundColor Cyan
Write-Host '  pluto list     - View available agents' -ForegroundColor Cyan
Write-Host '  pluto --help   - Show all commands' -ForegroundColor Cyan
Write-Host ''

if (-not (Get-Command pluto -ErrorAction SilentlyContinue)) {
    Write-Host 'The Pluto command is not on PATH for this shell yet.' -ForegroundColor Yellow
    Write-Host "Add $binDir to your user PATH or open a new terminal window." -ForegroundColor Yellow
}