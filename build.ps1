#Requires -Version 7.0
<# Build the Rust + Tauri application on the target platform. #>
[CmdletBinding()]
param([switch]$SkipDeps)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) { throw 'Rust is required: https://rustup.rs/' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'Node.js LTS is required: https://nodejs.org/' }
if (-not $SkipDeps) {
    & npm ci
    if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
}
& npm run build
if ($LASTEXITCODE -ne 0) { throw 'Tauri build failed' }
Write-Host 'Bundles: src-tauri/target/release/bundle'
