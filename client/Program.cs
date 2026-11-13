using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

[assembly: System.Reflection.AssemblyTitle("LinArchive 生图指挥台")]
[assembly: System.Reflection.AssemblyDescription("LinArchive Windows client with embedded WebView2")]
[assembly: System.Reflection.AssemblyCompany("LinArchive")]
[assembly: System.Reflection.AssemblyProduct("LinArchive 生图指挥台")]
[assembly: System.Reflection.AssemblyVersion("1.7.0.0")]

internal static class Program
{
    internal const string AppId = "LinArchive.ImageFactory.Desktop";
    [DllImport("shell32.dll")] private static extern int SetCurrentProcessExplicitAppUserModelID(string id);
    [DllImport("user32.dll")] private static extern bool SetForegroundWindow(IntPtr window);
    [DllImport("user32.dll")] private static extern bool ShowWindow(IntPtr window, int command);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int RegisterWindowMessage(string message);
    [DllImport("user32.dll")] private static extern bool PostMessage(IntPtr window, int message, IntPtr wParam, IntPtr lParam);
    internal static readonly int ModeMessage = RegisterWindowMessage("LinArchive.ImageFactory.NavigateMode.v1");

    [STAThread]
    private static void Main(string[] args)
    {
        SetCurrentProcessExplicitAppUserModelID(AppId);
        bool verify = Array.IndexOf(args, "--verify") >= 0;
        bool local = Array.IndexOf(args, "--cloud") < 0;
        bool explicitMode = Array.IndexOf(args, "--local") >= 0 || Array.IndexOf(args, "--cloud") >= 0;
        bool first;
        using (var singleton = new Mutex(true, @"Local\LinArchive.ImageFactory.Desktop" + (verify ? ".Verification" : ""), out first))
        {
            if (!first)
            {
                foreach (var process in Process.GetProcessesByName(Process.GetCurrentProcess().ProcessName))
                {
                    if (process.Id == Process.GetCurrentProcess().Id || process.MainWindowHandle == IntPtr.Zero) continue;
                    ShowWindow(process.MainWindowHandle, 9);
                    SetForegroundWindow(process.MainWindowHandle);
                    if (explicitMode && !verify) PostMessage(process.MainWindowHandle, ModeMessage, new IntPtr(local ? 1 : 2), IntPtr.Zero);
                    break;
                }
                return;
            }
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new FactoryWindow(verify, local, verify && Array.IndexOf(args, "--verify-exit") >= 0, verify && Array.IndexOf(args, "--verify-reconnect") >= 0));
        }
    }
}

internal sealed class FactoryWindow : Form
{
    private readonly WebView2 web = new WebView2();
    private readonly Label connection = new Label();
    private readonly Panel unavailable = new Panel();
    private readonly Label problem = new Label();
    private readonly ComboBox mode = new ComboBox();
    private readonly Label footer = new Label();
    private readonly bool verify, verifyExit, verifyReconnect;
    private readonly List<object> connectionEvents = new List<object>();
    private Task<string> pageReadyRead;
    private int failedHealthProbes;
    private readonly LocalWorkbench localWorkbench = new LocalWorkbench(ClientPaths.WorkbenchRoot, ClientPaths.NodeExecutable);
    private LocalConnection localConnection;
    private bool closing, initialized, verificationStarted, initializing, localMode;
    private int navigationVersion;
    private bool connectingLocal, checkingHealth;
    private ulong latestNavigation;
    private bool pageLoading;
    private DateTime pageLoadStarted;
    private readonly System.Windows.Forms.Timer healthTimer = new System.Windows.Forms.Timer { Interval = 5000 };
    private DateTime nextReconnect = DateTime.MinValue;
    private readonly Color paper = Color.FromArgb(22, 17, 13);
    private readonly Color ink = Color.FromArgb(255, 177, 98);
    [DllImport("dwmapi.dll")] private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int size);
    protected override void OnHandleCreated(EventArgs e)
    {
        base.OnHandleCreated(e);
        try { int dark = 1, caption = ColorTranslator.ToWin32(Color.FromArgb(29, 20, 14)), text = ColorTranslator.ToWin32(ink), border = ColorTranslator.ToWin32(Color.FromArgb(203, 112, 43));
            DwmSetWindowAttribute(Handle, 20, ref dark, 4);
            DwmSetWindowAttribute(Handle, 35, ref caption, 4);
            DwmSetWindowAttribute(Handle, 36, ref text, 4);
            DwmSetWindowAttribute(Handle, 34, ref border, 4);
        } catch (DllNotFoundException) { } catch (EntryPointNotFoundException) { }
    }

    internal FactoryWindow(bool verification, bool local, bool exitAfterVerification, bool reconnectVerification)
    {
        verify = verification;
        verifyExit = exitAfterVerification;
        verifyReconnect = reconnectVerification;
        localMode = local;
        Text = "LinArchive · 生图控制室 / AMBER CRT";
        Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        BackColor = paper;
        ForeColor = ink;
        Font = new Font("Microsoft YaHei UI", 9F);
        AutoScaleMode = AutoScaleMode.Dpi;
        FormBorderStyle = FormBorderStyle.None;
        Padding = new Padding(2);
        ClientSize = new Size(1320, 900);
        MinimumSize = new Size(1000, 680);
        StartPosition = FormStartPosition.CenterScreen;

        var bar = new TableLayoutPanel { Dock = DockStyle.Top, Height = 52, ColumnCount = 6, Padding = new Padding(16, 8, 16, 8), BackColor = paper };
        bar.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 190));
        bar.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 148));
        bar.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        for (int i = 0; i < 3; i++) bar.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 108));
        bar.Controls.Add(new Label { Text = "LIN ARCHIVE / CRT-01", Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleLeft, Font = new Font("Consolas", 10F, FontStyle.Bold) }, 0, 0);
        connection.Text = "正在连接…";
        connection.Dock = DockStyle.Fill;
        connection.TextAlign = ContentAlignment.MiddleLeft;
        connection.ForeColor = Color.FromArgb(204, 163, 118);
        mode.DropDownStyle = ComboBoxStyle.DropDownList;
        mode.BackColor = paper; mode.ForeColor = ink; mode.FlatStyle = FlatStyle.Flat;
        mode.DrawMode = DrawMode.OwnerDrawFixed;
        mode.DrawItem += delegate(object sender, DrawItemEventArgs e) { using (var background = new SolidBrush(paper)) e.Graphics.FillRectangle(background, e.Bounds); if (e.Index >= 0) TextRenderer.DrawText(e.Graphics, mode.Items[e.Index].ToString(), mode.Font, e.Bounds, ink, TextFormatFlags.Left | TextFormatFlags.VerticalCenter); e.DrawFocusRectangle(); };
        mode.Items.AddRange(new object[] { "本地工作台", "云端指挥台" });
        mode.SelectedIndex = local ? 0 : 1;
        mode.Dock = DockStyle.Fill;
        mode.Margin = new Padding(0, 4, 12, 0);
        mode.SelectedIndexChanged += async delegate { localMode = mode.SelectedIndex == 0; await NavigateHome(); };
        bar.Controls.Add(mode, 1, 0);
        bar.Controls.Add(connection, 2, 0);
        bar.Controls.Add(MakeButton("返回指挥台", async delegate { await NavigateHome(); }), 3, 0);
        bar.Controls.Add(MakeButton("刷新", delegate { RefreshPage(); }), 4, 0);
        bar.Controls.Add(MakeButton("使用说明", delegate { ShowGuide(); }), 5, 0);
        bar.Paint += delegate(object sender, PaintEventArgs e) { using (var pen = new Pen(Color.FromArgb(120, 71, 33))) e.Graphics.DrawLine(pen, 0, bar.Height - 1, bar.Width, bar.Height - 1); };

        footer.Dock = DockStyle.Bottom; footer.Height = 28; footer.Font = new Font("Consolas", 9F); footer.TextAlign = ContentAlignment.MiddleLeft; footer.BackColor = paper; footer.ForeColor = Color.FromArgb(210, 153, 99);
        footer.Paint += delegate(object sender, PaintEventArgs e) { using (var pen = new Pen(Color.FromArgb(120, 71, 33))) e.Graphics.DrawLine(pen, 0, 0, footer.Width, 0); };
        UpdateModeLabel();
        web.Dock = DockStyle.Fill;
        web.DefaultBackgroundColor = paper;
        unavailable.Dock = DockStyle.Fill;
        unavailable.BackColor = paper;
        var message = new FlowLayoutPanel { FlowDirection = FlowDirection.TopDown, WrapContents = false, AutoSize = true, Location = new Point(48, 64) };
        problem.Text = local ? "正在连接本地工作台…" : "正在连接云端指挥台…";
        problem.AutoSize = true;
        problem.MaximumSize = new Size(700, 0);
        problem.Font = new Font("Microsoft YaHei UI", 12F);
        message.Controls.Add(problem);
        message.Controls.Add(MakeButton("重新连接", async delegate { if (initialized) await NavigateHome(); else await Initialize(); }));
        unavailable.Controls.Add(message);
        Controls.Add(web);
        Controls.Add(unavailable);
        Controls.Add(footer);
        Controls.Add(bar);
        Controls.Add(CreateCaption());
        unavailable.BringToFront();
        Shown += async delegate { await Initialize(); };
        healthTimer.Tick += async delegate { await CheckConnection(); };
        FormClosing += delegate { closing = true; healthTimer.Stop(); healthTimer.Dispose(); };
        FormClosed += delegate { web.Dispose(); };
    }

    [DllImport("user32.dll")] private static extern bool ReleaseCapture();
    [DllImport("user32.dll")] private static extern IntPtr SendMessage(IntPtr hwnd, int message, IntPtr wParam, IntPtr lParam);
    private Control CreateCaption()
    {
        var caption = new Panel { Dock = DockStyle.Top, Height = 34, BackColor = Color.FromArgb(39, 25, 16) };
        var title = new Label { Dock = DockStyle.Fill, Text = "  LIN ARCHIVE  /  生图控制室", ForeColor = ink, TextAlign = ContentAlignment.MiddleLeft, Font = new Font("Microsoft YaHei UI", 9F) };
        var icon = new PictureBox { Dock = DockStyle.Left, Width = 36, SizeMode = PictureBoxSizeMode.CenterImage, Image = new Icon(Icon, 20, 20).ToBitmap() };
        var actions = new FlowLayoutPanel { Dock = DockStyle.Right, Width = 138, FlowDirection = FlowDirection.LeftToRight, WrapContents = false, Margin = Padding.Empty, Padding = Padding.Empty };
        var min = CaptionButton("−", "最小化窗口", delegate { WindowState = FormWindowState.Minimized; });
        var max = CaptionButton("□", "最大化或还原窗口", delegate { ToggleMaximize(); });
        var close = CaptionButton("×", "关闭窗口", delegate { Close(); });
        close.FlatAppearance.MouseOverBackColor = Color.FromArgb(135, 48, 22);
        actions.Controls.Add(min); actions.Controls.Add(max); actions.Controls.Add(close);
        title.MouseDown += delegate(object sender, MouseEventArgs e) { if (e.Button == MouseButtons.Left) { ReleaseCapture(); SendMessage(Handle, 0xA1, new IntPtr(2), IntPtr.Zero); } };
        title.DoubleClick += delegate { ToggleMaximize(); };
        caption.Controls.Add(title); caption.Controls.Add(icon); caption.Controls.Add(actions);
        caption.Paint += delegate(object sender, PaintEventArgs e) { using (var pen = new Pen(Color.FromArgb(120, 71, 33))) e.Graphics.DrawLine(pen, 0, caption.Height - 1, caption.Width, caption.Height - 1); };
        return caption;
    }
    private Button CaptionButton(string text, string name, EventHandler action)
    {
        var button = new Button { Text = text, AccessibleName = name, Size = new Size(46, 32), Margin = Padding.Empty, FlatStyle = FlatStyle.Flat, BackColor = Color.FromArgb(39, 25, 16), ForeColor = ink, Font = new Font("Segoe UI", 13F) };
        button.FlatAppearance.BorderSize = 0; button.FlatAppearance.MouseOverBackColor = Color.FromArgb(72, 43, 22); button.Click += action; return button;
    }
    private void ToggleMaximize()
    {
        MaximizedBounds = Screen.FromHandle(Handle).WorkingArea;
        WindowState = WindowState == FormWindowState.Maximized ? FormWindowState.Normal : FormWindowState.Maximized;
    }
    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e); using (var pen = new Pen(Color.FromArgb(203, 112, 43), 2)) e.Graphics.DrawRectangle(pen, 1, 1, Width - 2, Height - 2);
    }

    private Button MakeButton(string title, EventHandler action)
    {
        var button = new Button { Text = title, Height = 34, Width = 100, FlatStyle = FlatStyle.Flat, BackColor = paper, ForeColor = ink, Margin = new Padding(4, 0, 4, 0), Cursor = Cursors.Hand };
        button.FlatAppearance.BorderColor = Color.FromArgb(130, 76, 34);
        button.FlatAppearance.MouseOverBackColor = Color.FromArgb(62, 37, 19);
        button.FlatAppearance.MouseDownBackColor = Color.FromArgb(90, 49, 20);
        button.Click += action;
        return button;
    }

    private async Task Initialize()
    {
        if (initialized || initializing || closing) return;
        initializing = true;
        try
        {
            VerificationPhase("initializing");
            string profile = verify ? Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "verification", "WebView2") : Path.Combine(ClientPaths.UserDataRoot, "WebView2");
            // The installed runtime owns rendering; the application never starts msedge.exe.
            var environment = await CoreWebView2Environment.CreateAsync(null, profile);
            VerificationPhase("environment-created");
            if (closing) return;
            await web.EnsureCoreWebView2Async(environment);
            VerificationPhase("webview-created");
            if (closing) return;
            var core = web.CoreWebView2;
            core.Settings.AreHostObjectsAllowed = false;
            core.Settings.IsWebMessageEnabled = false;
            core.Settings.IsStatusBarEnabled = false;
            core.Settings.IsGeneralAutofillEnabled = false;
            core.Settings.IsPasswordAutosaveEnabled = false;
            core.Settings.AreDevToolsEnabled = false;
            core.Settings.AreDefaultContextMenusEnabled = false;
            core.PermissionRequested += delegate(object sender, CoreWebView2PermissionRequestedEventArgs e) { e.State = CoreWebView2PermissionState.Deny; };
            core.NavigationStarting += delegate(object sender, CoreWebView2NavigationStartingEventArgs e)
            {
                if (!ClientPolicy.IsTrustedNavigation(e.Uri, localMode, localConnection == null ? null : localConnection.Origin))
                {
                    e.Cancel = true;
                    if (e.IsUserInitiated) OpenExternal(e.Uri);
                    return;
                }
                connection.Text = localMode ? "服务已连接，正在加载界面…" : "正在连接云端指挥台…";
                latestNavigation = e.NavigationId;
                pageLoading = true;
                pageLoadStarted = DateTime.UtcNow;
                TraceConnection("navigation-started");
            };
            core.NewWindowRequested += delegate(object sender, CoreWebView2NewWindowRequestedEventArgs e)
            {
                e.Handled = true;
                if (e.IsUserInitiated) OpenExternal(e.Uri);
            };
            core.NavigationCompleted += async delegate(object sender, CoreWebView2NavigationCompletedEventArgs e)
            {
                if (closing || e.NavigationId != latestNavigation || e.WebErrorStatus == CoreWebView2WebErrorStatus.OperationCanceled) return;
                pageLoading = false;
                if (e.IsSuccess)
                {
                    unavailable.Visible = false;
                    connection.Text = localMode ? "本机已连接 · 任务状态自动更新" : "云端页面已连接";
                    TraceConnection("navigation-completed");
                    if (verify && !verificationStarted) { verificationStarted = true; await WriteVerification(); }
                }
                else ShowFailure((localMode ? "本地工作台暂不可用。" : "云端指挥台暂不可用，可切换“本地工作台”查看本机任务。") + "\n请点击“重新连接”。连接状态：" + e.WebErrorStatus);
            };
            core.ProcessFailed += delegate { if (!closing) ShowFailure("显示组件已停止，请关闭客户端后重新打开。"); };
            initialized = true;
            if (!verify) healthTimer.Start();
            await NavigateHome();
        }
        catch (WebView2RuntimeNotFoundException)
        {
            ShowFailure("此电脑缺少 Microsoft WebView2 Runtime。\n请从微软官网安装运行组件后重新打开客户端。");
        }
        catch (Exception error)
        {
            ShowFailure("客户端初始化失败，请重新打开。\n" + error.GetType().Name);
        }
        finally { initializing = false; }
    }

    protected override void WndProc(ref Message message)
    {
        if (message.Msg == Program.ModeMessage && (message.WParam == new IntPtr(1) || message.WParam == new IntPtr(2)))
        {
            int selection = message.WParam == new IntPtr(1) ? 0 : 1;
            BeginInvoke(new Action(async delegate { if (mode.SelectedIndex == selection) await NavigateHome(); else mode.SelectedIndex = selection; }));
        }
        base.WndProc(ref message);
        if (message.Msg == 0x84 && WindowState == FormWindowState.Normal)
        {
            long value = message.LParam.ToInt64();
            var point = PointToClient(new Point((short)(value & 0xffff), (short)((value >> 16) & 0xffff)));
            int grip = Math.Max(6, (int)(DeviceDpi / 16F));
            bool left = point.X < grip, right = point.X >= Width - grip, top = point.Y < grip, bottom = point.Y >= Height - grip;
            int hit = top && left ? 13 : top && right ? 14 : bottom && left ? 16 : bottom && right ? 17 : left ? 10 : right ? 11 : top ? 12 : bottom ? 15 : 0;
            if (hit != 0) message.Result = new IntPtr(hit);
        }
    }
    private void UpdateModeLabel()
    {
        footer.Text = localMode ? "  LOCAL WORKBENCH    /    AMBER CRT 1.7    /    本机进度" : "  ADMIN.LINARCHIVE.COM    /    AMBER CRT 1.7    /    云端批次";
    }
    private async Task NavigateHome()
    {
        if (!initialized || closing) return;
        if (localMode && connectingLocal) return;
        int version = ++navigationVersion;
        UpdateModeLabel();
        web.CoreWebView2.Stop();
        if (!localMode) { unavailable.Visible = false; web.CoreWebView2.Navigate(ClientPolicy.ConsoleUrl); return; }
        connectingLocal = true;
        connection.Text = "正在连接本地服务…";
        problem.Text = "正在读取本机工作台连接…";
        unavailable.Visible = true;
        unavailable.BringToFront();
        TraceConnection("connecting-service");
        try
        {
            var candidate = await localWorkbench.ConnectAsync(!verify);
            if (closing || version != navigationVersion || !localMode) return;
            localConnection = candidate;
            VerificationPhase("local-endpoint-verified");
            connection.Text = "服务已连接，正在加载界面…";
            problem.Text = "本地服务正常，正在加载操作台…";
            pageLoading = true;
            pageLoadStarted = DateTime.UtcNow;
            TraceConnection("service-ready");
            // Pass the local session only in the fragment; the webpage consumes and removes it.
            web.CoreWebView2.Navigate(candidate.NewNavigationUrl);
        }
        catch (Exception error)
        {
            nextReconnect = DateTime.UtcNow.AddSeconds(15);
            if (!closing && version == navigationVersion) ShowFailure(error is InvalidOperationException || error is InvalidDataException ? error.Message : "本地连接读取失败，请由组长检查工作台服务。");
        }
        finally { connectingLocal = false; }
    }
    private async Task CheckConnection()
    {
        if (closing || !initialized || !localMode || (verify && !verifyReconnect) || connectingLocal || checkingHealth) return;
        if (pageLoading && (DateTime.UtcNow - pageLoadStarted).TotalSeconds < 20) return;
        checkingHealth = true;
        try
        {
            var candidate = localConnection;
            bool online = await Task.Run(() => LocalWorkbench.Probe(candidate));
            if (closing || !localMode) return;
            if (online) failedHealthProbes=0;
            else if (++failedHealthProbes < 2)
            {
                connection.Text="正在核对本地服务 · 当前页面保留";
                TraceConnection("health-probe-missed");
                return;
            }
            // Do not keep covering a working page just because a navigation event
            // was cancelled/missed. Page readiness is independent of HTTP health.
            if (online && (unavailable.Visible || pageLoading) && await LocalPageReady())
            {
                if (closing || !localMode) return;
                pageLoading = false; unavailable.Visible = false;
                connection.Text = "本机已连接 · 任务状态自动更新";
                TraceConnection("ready-page-recovered-overlay");
                return;
            }
            if (online && !unavailable.Visible) { connection.Text = "本机已连接 · 自动重连已开启"; return; }
            if (DateTime.UtcNow < nextReconnect) return;
            connection.Text = "连接中断，正在自动重连…";
            await NavigateHome();
        }
        catch { if (!closing) connection.Text = "连接暂不可用，稍后自动重试"; }
        finally { checkingHealth = false; }
    }
    private void RefreshPage()
    {
        if (initialized && !closing) { if (unavailable.Visible) { var reconnect = NavigateHome(); } else web.CoreWebView2.Reload(); }
    }
    private void ShowFailure(string message)
    {
        VerificationPhase("failed: " + message);
        connection.Text = "连接暂不可用";
        problem.Text = message;
        unavailable.Visible = true;
        unavailable.BringToFront();
        TraceConnection("connection-failed");
    }
    private async Task<bool> LocalPageReady()
    {
        if (!initialized || closing || !localMode || localConnection == null || !ClientPolicy.IsLocal(web.CoreWebView2.Source, localConnection.Origin)) return false;
        try
        {
            if (pageReadyRead == null || pageReadyRead.IsCompleted)
                pageReadyRead = web.CoreWebView2.ExecuteScriptAsync("Boolean(document.readyState==='complete' && typeof state!=='undefined' && state?.control && window.WorkbenchGraph && document.getElementById('server-status')?.textContent==='已连接')");
            var reading = pageReadyRead;
            if (await Task.WhenAny(reading, Task.Delay(2000)) != reading) return false;
            return await reading == "true";
        }
        catch { return false; }
    }
    private void TraceConnection(string stage)
    {
        try
        {
            connectionEvents.Add(new {at=DateTime.UtcNow.ToString("o"),stage=stage,overlayVisible=unavailable.Visible,pageLoading=pageLoading,localMode=localMode});
            if (connectionEvents.Count > 24) connectionEvents.RemoveAt(0);
            string dir=verify?VerificationDirectory:ClientPaths.UserDataRoot;
            Directory.CreateDirectory(dir);
            File.WriteAllText(Path.Combine(dir,"client-connection-current.json"),new System.Web.Script.Serialization.JavaScriptSerializer().Serialize(new {version="1.7",pid=Process.GetCurrentProcess().Id,events=connectionEvents}));
        }
        catch { /* Diagnostic failure cannot block the user's window. */ }
    }
    private string VerificationDirectory { get { return Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "verification", localMode ? "local" : "cloud"); } }
    private void VerificationPhase(string phase)
    {
        if (!verify) return;
        try { Directory.CreateDirectory(VerificationDirectory); File.WriteAllText(Path.Combine(VerificationDirectory, "phase.txt"), DateTime.UtcNow.ToString("o") + " " + phase); } catch { }
    }
    private void OpenExternal(string url)
    {
        if (localConnection != null && localConnection.ContainsCredential(url)) return;
        if (ClientPolicy.IsTrustedNavigation(url, localMode, localConnection == null ? null : localConnection.Origin)) { web.CoreWebView2.Navigate(url); return; }
        if (!ClientPolicy.IsExternalWebsite(url)) return;
        try { Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); }
        catch { MessageBox.Show(this, "无法打开外部链接。", "LinArchive"); }
    }
    private void ShowGuide()
    {
        MessageBox.Show(this,
            "1. 选词派单：默认显示可申请配图的词。点击画面要求核对，最多选5项，再确认提交工作单。\n\n" +
            "2. 提交后由组长领取，产图员执行，教学岗审核。提交成功不等于已经开工；进度在工作单中显示。\n\n" +
            "3. 产线画布：看实际运行，或编辑卡片和连线提出调度方案。画卡片不会直接启动员工。\n\n" +
            "4. 图片与结果：查看正式执行记录、原图及审核意见。研究记录单独保存旧压测，不代表新词库覆盖。\n\n" +
            "5. CRT纹理可在页面右上角关闭。顶部可切换本地/云端；云端保留原页面与登录，任务来源分别展示。\n\n" +
            "关闭窗口不会停止已启动的任务。需要暂停时，使用组长执行控制或联系组长。",
            "生图指挥台 · 使用说明", MessageBoxButtons.OK, MessageBoxIcon.Information);
    }

    // Explicit read-only release checks. Never write credentials or dump page content.
    private async Task WriteVerification()
    {
        try
        {
            await Task.Delay(1800);
            if (closing) return;
            if (verifyReconnect)
            {
                for (int pass=0;pass<3;pass++)
                {
                    await NavigateHome();
                    var deadline=Stopwatch.StartNew();
                    while (deadline.Elapsed < TimeSpan.FromSeconds(12) && (!await LocalPageReady() || unavailable.Visible)) await Task.Delay(200);
                    if (unavailable.Visible || !await LocalPageReady()) throw new InvalidOperationException("RECONNECT_PAGE_NOT_READY");
                }
                // Regression: a live, updating page underneath a stuck shell overlay.
                unavailable.Visible=true;pageLoading=false;
                await CheckConnection();
                if (unavailable.Visible || !await LocalPageReady()) throw new InvalidOperationException("READY_PAGE_OVERLAY_STUCK");
                File.WriteAllText(Path.Combine(VerificationDirectory,"reconnect.json"),"{\"sameOriginReloads\":3,\"overlayRecoveryPassed\":true,\"imageCalls\":0}");
            }
            string result = await web.CoreWebView2.ExecuteScriptAsync("JSON.stringify({url:location.origin+location.pathname,title:document.title,ready:document.readyState,industrialStyle:!!document.querySelector('link[href=\"/industrial.css\"]'),localStyle:!!document.querySelector('link[href=\"/command.css\"]'),paper:getComputedStyle(document.body).backgroundColor,loginVisible:!!document.querySelector('#access:not([hidden])'),consoleVisible:!!document.querySelector('#console:not([hidden])'),serverStatus:document.getElementById('server-status')?.textContent||null,researchLatest:document.getElementById('research-latest')?.textContent||null,researchCards:document.querySelectorAll('.research-test').length,theme:document.body.dataset.theme,pane:document.querySelector('.terminal-pane:not([hidden])')?.id,registryFilter:document.getElementById('registry-filter')?.value,navItems:document.querySelectorAll('[data-pane]').length,scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth})");
            string output = VerificationDirectory;
            Directory.CreateDirectory(output);
            File.WriteAllText(Path.Combine(output, "page.json"), result);
            File.WriteAllText(Path.Combine(output, "host.txt"), "process=" + Process.GetCurrentProcess().ProcessName + "\nappId=" + Program.AppId + "\nmode=" + (localMode ? "local" : "cloud") + "\nruntime=" + web.CoreWebView2.Environment.BrowserVersionString + "\n");
            using (var stream = File.Create(Path.Combine(output, "client-page.png")))
                await web.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png, stream);
            using (var bitmap = new Bitmap(Width, Height))
            {
                DrawToBitmap(bitmap, new Rectangle(0, 0, Width, Height));
                bitmap.Save(Path.Combine(output, "client-frame.png"), System.Drawing.Imaging.ImageFormat.Png);
            }
        }
        catch (Exception error) { VerificationPhase("verification-failed: "+error.GetType().Name); connection.Text = "页面已连接 · 检查记录失败：" + error.GetType().Name; }
        finally { if (verifyExit && !closing) Close(); }
    }
}


