param([string]$TargetDirectory = (Join-Path $env:LOCALAPPDATA 'Programs\LinArchive\ImageFactory'))
$ErrorActionPreference = 'Stop'
$source = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = [IO.Path]::GetFullPath($TargetDirectory)
$exe = Join-Path $target 'LinArchive-Image-Factory.exe'
$running = Get-Process 'LinArchive-Image-Factory' -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $exe }
if ($running) { throw '请先关闭当前客户端窗口，然后重新安装。执行端不需要停止。' }
$files = @('LinArchive-Image-Factory.exe','Microsoft.Web.WebView2.Core.dll','Microsoft.Web.WebView2.WinForms.dll','WebView2Loader.dll','WebView2-LICENSE.txt','使用说明.txt')
foreach ($name in $files) { if (-not (Test-Path -LiteralPath (Join-Path $source $name))) { throw "安装文件缺失：$name" } }
New-Item -ItemType Directory -Force -Path $target | Out-Null
foreach ($name in $files) { Copy-Item -LiteralPath (Join-Path $source $name) -Destination (Join-Path $target $name) -Force }
$desktop = [Environment]::GetFolderPath('DesktopDirectory')
$shortcutPath = Join-Path $desktop 'LinArchive 生图指挥台.lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $exe
$shortcut.Arguments = '--local'
$shortcut.WorkingDirectory = $target
$shortcut.IconLocation = "$exe,0"
$shortcut.Description = 'LinArchive 生图指挥台 · 本地工作台 / 云端指挥台'
$shortcut.Save()
[PSCustomObject]@{ Installed=$exe; Shortcut=$shortcutPath; Version=(Get-Item -LiteralPath $exe).VersionInfo.FileVersion } | ConvertTo-Json -Compress
