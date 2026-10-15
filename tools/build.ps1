<#
  Packs the extension into dist\deny-everything-<version>.zip (same contents an .xpi has).

  Written by hand instead of Compress-Archive because Windows PowerShell 5.1 writes
  backslashes into the zip, and Firefox / addons.mozilla.org reject those.
#>
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$manifest = Get-Content (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json
$version = $manifest.version

$dist = Join-Path $root 'dist'
New-Item -ItemType Directory -Force $dist | Out-Null
$out = Join-Path $dist "deny-everything-$version.zip"
if (Test-Path $out) { Remove-Item $out }

$include = @('manifest.json', 'LICENSE', 'icons', 'src')

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($out, 'Create')
try {
  foreach ($item in $include) {
    $path = Join-Path $root $item
    $files = if ((Get-Item $path).PSIsContainer) { Get-ChildItem $path -Recurse -File } else { Get-Item $path }
    foreach ($f in $files) {
      $rel = $f.FullName.Substring($root.Length).TrimStart('\', '/').Replace('\', '/')
      if ($rel -like 'src/userscript/*') { continue }  # userscript wrapper is not part of the extension
      [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $f.FullName, $rel, 'Optimal')
    }
  }
}
finally {
  $zip.Dispose()
}

$size = [math]::Round((Get-Item $out).Length / 1KB, 1)
Write-Host "Built $out ($size KB)"
