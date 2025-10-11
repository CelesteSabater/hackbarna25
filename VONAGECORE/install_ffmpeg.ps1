# install_ffmpeg.ps1
# Download and install ffmpeg (Windows 64-bit) to C:\Tools\ffmpeg\bin and add to User PATH.

$ErrorActionPreference = "Stop"

# Target install dir
$installDir = "C:\Tools\ffmpeg"
$binDir = Join-Path $installDir "bin"

# URL to a static ffmpeg build (64-bit essentials)
$zipUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"

# Temp download path
$tmpZip = Join-Path $env:TEMP "ffmpeg_release.zip"

Write-Host "Installing ffmpeg to $installDir ..."
Write-Host "Downloading ffmpeg from $zipUrl ... (this may take a moment)"

# Download zip
try {
    Invoke-WebRequest -Uri $zipUrl -OutFile $tmpZip -UseBasicParsing
} catch {
    Write-Error "Download failed: $_.Exception.Message"
    exit 1
}

# Extract to temp folder
$tmpExtract = Join-Path $env:TEMP ("ffmpeg_extract_" + [Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tmpExtract | Out-Null
try {
    Expand-Archive -Path $tmpZip -DestinationPath $tmpExtract -Force
} catch {
    Write-Error "Failed to extract archive: $_.Exception.Message"
    Remove-Item -Recurse -Force $tmpExtract -ErrorAction SilentlyContinue
    exit 1
}

# Locate the bin folder inside extracted content
$foundBin = Get-ChildItem -Path $tmpExtract -Recurse -Directory -Filter "bin" -ErrorAction SilentlyContinue |
    Where-Object { Test-Path (Join-Path $_.FullName "ffmpeg.exe") } |
    Select-Object -First 1

if (-not $foundBin) {
    Write-Error "Could not find ffmpeg.exe inside the archive. Extraction content:"
    Get-ChildItem -Path $tmpExtract -Recurse | Select-Object -First 20 | ForEach-Object { Write-Host $_.FullName }
    Remove-Item -Recurse -Force $tmpExtract, $tmpZip -ErrorAction SilentlyContinue
    exit 1
}

# Create install dir and copy bin contents
if (-not (Test-Path $binDir)) {
    New-Item -ItemType Directory -Path $binDir -Force | Out-Null
}

Write-Host "Copying ffmpeg binaries to $binDir ..."
Get-ChildItem -Path $foundBin.FullName -File | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination (Join-Path $binDir $_.Name) -Force
}

# Clean up temp files
Remove-Item -Recurse -Force $tmpExtract, $tmpZip

# Add to user PATH if not already present
$userPath = [Environment]::GetEnvironmentVariable("PATH","User")
if ($userPath -notlike "*$binDir*") {
    $newUserPath = if ($userPath) { "$userPath;$binDir" } else { $binDir }
    [Environment]::SetEnvironmentVariable("PATH", $newUserPath, "User")
    Write-Host "Added $binDir to User PATH. (Will be available in new terminals.)"
} else {
    Write-Host "$binDir already in User PATH."
}

# Update current session PATH too
$env:Path = $env:Path + ";" + $binDir

# Verify installation
try {
    $ver = & ffmpeg -version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $firstLine = $ver -split "`n" | Select-Object -First 1
        Write-Host "ffmpeg installed successfully: $firstLine"
    } else {
        Write-Warning "ffmpeg command returned non-zero exit. Output:"
        Write-Host $ver
    }
} catch {
    Write-Error "Failed to run ffmpeg: $_.Exception.Message"
}

Write-Host "Done. If you opened a new PowerShell, run 'ffmpeg -version' to check. If not found, restart your terminal."