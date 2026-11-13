# Windows 客户端源码

`Program.cs`、`ClientPolicy.cs`、`LocalWorkbench.cs` 是截图所示 Windows 客户端的源码；`ConnectionTests.cs`、`PolicyTests.cs` 是原有连接与策略测试。`build.ps1` 编译客户端并在本机生成 `ClientPaths.g.cs`，该生成文件包含本机工作台、Node 和用户数据路径，因此不提交。

构建需要 64 位 Windows、.NET Framework 4.8 的 `csc.exe`、Node.js、WebView2 SDK 的 `Microsoft.Web.WebView2.Core.dll`、`Microsoft.Web.WebView2.WinForms.dll`、`WebView2Loader.dll` 与 `WebView2-LICENSE.txt`。请从 Microsoft 官方 WebView2 SDK 获取这些文件，放入 `client/vendor/`。构建前在仓库根目录创建本机 `deployment.json`，格式见 `deployment.example.json`。

运行 `powershell -NoProfile -File client/build.ps1` 后，构建结果在 `client/dist/`，压缩包在 `client/`。`install.ps1` 和 `安装桌面入口.cmd` 用于安装构建好的客户端，默认安装到当前用户的 `AppData/Local/Programs/LinArchive/ImageFactory`；可以传入 `-TargetDirectory` 指定目录。

此客户端构建需要本机配置及私有工作台适配器；源码包尚未通过跨机器安装验收。构建和安装不会启动产图任务。
