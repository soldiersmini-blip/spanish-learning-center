$ErrorActionPreference = 'Stop'
$client = Split-Path -Parent $MyInvocation.MyCommand.Path
$workbench = Split-Path -Parent $client
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $compiler)) { throw 'Windows C# compiler is unavailable.' }
$dist = Join-Path $client 'dist'
New-Item -ItemType Directory -Force -Path $dist | Out-Null
$exe = Join-Path $dist 'LinArchive-Image-Factory.exe'
$icon = Join-Path $workbench 'assets\app-icon.ico'
$vendor = Join-Path $client 'vendor'
$core = Join-Path $vendor 'Microsoft.Web.WebView2.Core.dll'
$forms = Join-Path $vendor 'Microsoft.Web.WebView2.WinForms.dll'
$node = Get-Command node -CommandType Application -All -ErrorAction Stop | Select-Object -First 1 -ExpandProperty Source
if (-not $node -or -not (Test-Path -LiteralPath $node -PathType Leaf)) { throw 'A single usable Node.js executable was not found.' }
$paths = Join-Path $client 'ClientPaths.g.cs'
$userData = (Get-Content -LiteralPath (Join-Path $workbench 'deployment.json') -Raw | ConvertFrom-Json).userDataRoot
('internal static class ClientPaths { internal const string WorkbenchRoot = @"' + $workbench.Replace('"','""') + '"; internal const string NodeExecutable = @"' + $node.Replace('"','""') + '"; internal const string UserDataRoot = @"' + $userData.Replace('"','""') + '"; }') | Set-Content -LiteralPath $paths -Encoding UTF8
$tests = Join-Path $client 'test-output'
New-Item -ItemType Directory -Force -Path $tests | Out-Null
$testExe = Join-Path $tests 'PolicyTests.exe'
& $compiler /nologo /target:exe /platform:x64 "/out:$testExe" /reference:System.Web.Extensions.dll (Join-Path $client 'PolicyTests.cs') (Join-Path $client 'ClientPolicy.cs') (Join-Path $client 'LocalWorkbench.cs')
if ($LASTEXITCODE -ne 0) { throw 'Client policy test compilation failed.' }
& $testExe
if ($LASTEXITCODE -ne 0) { throw 'Client policy tests failed.' }
& $compiler /nologo /target:winexe /platform:x64 /optimize+ "/out:$exe" "/win32icon:$icon" "/win32manifest:$(Join-Path $client 'app.manifest')" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll "/reference:$core" "/reference:$forms" (Join-Path $client 'Program.cs') (Join-Path $client 'ClientPolicy.cs') (Join-Path $client 'LocalWorkbench.cs') $paths
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $exe)) { throw 'Client compilation failed.' }
foreach ($name in @('Microsoft.Web.WebView2.Core.dll','Microsoft.Web.WebView2.WinForms.dll','WebView2Loader.dll','WebView2-LICENSE.txt')) {
    Copy-Item -LiteralPath (Join-Path $vendor $name) -Destination (Join-Path $dist $name) -Force
}
Copy-Item -LiteralPath (Join-Path $client 'install.ps1') -Destination $dist -Force
Copy-Item -LiteralPath (Join-Path $client '安装桌面入口.cmd') -Destination $dist -Force
$guide = Join-Path $dist '使用说明.txt'
@'
LinArchive 生图指挥台 Windows 客户端 1.7

顶部可切换“本地工作台”和“云端指挥台”。使用 --local 启动参数可直接打开本地。
本地读取这台电脑现有项目的 runtime/connection.json；必要时隐藏启动已有 Node 工作台服务。
本地页面每 2 秒读取进度；“科研压力测试”显示独立测试，正式派单和独审状态另行展示。
云端模式沿用 admin.linarchive.com 原页面，首次在客户端登录现有后台账号。
云端需联网；本地界面不依赖云端数据库，实际生图仍需当前 Codex 执行端可用。
这是独立 Windows 程序，内嵌 WebView2。需要 64 位 Windows、.NET Framework 4.8 和 WebView2 Runtime。
其他电脑缺少组件时，请从微软官网下载。
解压后保留 EXE 与 DLL 在同一文件夹；可双击“安装桌面入口.cmd”安装到当前用户的程序目录并更新桌面快捷方式，也可通过 install.ps1 的 TargetDirectory 参数指定位置。
安装后的桌面快捷方式默认打开本地工作台，可在顶部切换云端。
云端页面的“刷新批次与执行器”手动读取云端最新状态。
关闭窗口或切换模式不停止执行端；暂停生图请在相应批次操作中处理。
本地入口绑定构建时的项目和 Node.js 路径，安装仅复制客户端，不搬迁工作台或图片。
工作台源码、任务账本与 UserData 必须由使用者在本机另行部署；仅安装客户端不会部署工作台或复制生成图片。
“查看图片 → 默认生图目录”可设置 API 新图目录；历史图片仍按回执位置读取。Pro 原图目录由 Codex 管理，可在此直接打开。
更新前请正常关闭旧客户端；不要停止正在生图的执行端。打开客户端不会自动开始生图。
'@ | Set-Content -LiteralPath $guide -Encoding UTF8
$zip = Join-Path $client 'LinArchive-Image-Factory-Windows.zip'
$shipping = @('LinArchive-Image-Factory.exe','Microsoft.Web.WebView2.Core.dll','Microsoft.Web.WebView2.WinForms.dll','WebView2Loader.dll','WebView2-LICENSE.txt','使用说明.txt','install.ps1','安装桌面入口.cmd') | ForEach-Object {Join-Path $dist $_}
Compress-Archive -LiteralPath $shipping -DestinationPath $zip -Force
Get-Item -LiteralPath $exe,$zip | Select-Object FullName,Length


