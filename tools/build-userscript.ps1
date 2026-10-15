<#
  Builds dist\deny-everything.user.js: the same engine as the extension, as a single userscript
  for Violentmonkey / Tampermonkey (works next to uBlock Origin, which has no plugin system).
#>
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$version = (Get-Content (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json).version

$header = @"
// ==UserScript==
// @name         Deny Everything
// @namespace    deny-everything
// @version      $version
// @description  Answers cookie and tracking banners with a complete no: every consent switch, every legitimate-interest switch, every vendor.
// @author       SmallyBoii
// @license      MIT
// @match        *://*/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

"@

$parts = @(
  'src\content\text.js',
  'src\content\dom.js',
  'src\content\rules.js',
  'src\content\engine.js',
  'src\userscript\main.js'
)

$dist = Join-Path $root 'dist'
New-Item -ItemType Directory -Force $dist | Out-Null
$out = Join-Path $dist 'deny-everything.user.js'

$body = foreach ($p in $parts) {
  "// ---- $($p.Replace('\', '/')) ----`n" + ((Get-Content (Join-Path $root $p) -Raw -Encoding UTF8).TrimEnd()) + "`n"
}

# UTF-8 without BOM, LF line endings (userscript managers read the header block literally)
$text = ($header.Replace("`r`n", "`n")) + (($body -join "`n").Replace("`r`n", "`n"))
[System.IO.File]::WriteAllText($out, $text, (New-Object System.Text.UTF8Encoding($false)))

$size = [math]::Round((Get-Item $out).Length / 1KB, 1)
Write-Host "Built $out ($size KB)"
