using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web.Script.Serialization;

internal sealed class LocalConnection
{
    internal readonly string Origin;
    internal readonly int ProcessId;
    private readonly string token;
    private LocalConnection(string origin, string secret, int pid) { Origin = origin; token = secret; ProcessId = pid; }
    internal string HomeUrl { get { return Origin + "/#" + token; } }
    // A unique query forces a document load. A repeated fragment-only Navigate
    // need not raise NavigationCompleted and used to leave the shell overlay stuck.
    internal string NewNavigationUrl { get { return Origin + "/?clientLoad=" + Guid.NewGuid().ToString("N") + "#" + token; } }
    internal string Authorization { get { return "Bearer " + token; } }
    internal bool ContainsCredential(string value) { return value != null && value.IndexOf(token, StringComparison.Ordinal) >= 0; }
    internal static LocalConnection Parse(string json)
    {
        if (json == null || System.Text.Encoding.UTF8.GetByteCount(json) > 4096) throw new InvalidDataException("本地连接文件过大。");
        var serializer = new JavaScriptSerializer { MaxJsonLength = 4096, RecursionLimit = 8 };
        var data = serializer.Deserialize<Dictionary<string, object>>(json);
        object endpoint, secret, pid;
        if (data == null || !data.TryGetValue("url", out endpoint) || !data.TryGetValue("token", out secret) ||
            !data.TryGetValue("pid", out pid) || !(endpoint is string) || !(secret is string) || !(pid is int) || (int)pid <= 0 ||
            !ClientPolicy.IsLocalOrigin((string)endpoint) || !Regex.IsMatch((string)secret, @"\A[a-f0-9]{64}\z"))
            throw new InvalidDataException("本地连接文件无效；请由工作台重新生成。");
        return new LocalConnection(((string)endpoint).TrimEnd('/'), (string)secret, (int)pid);
    }
}

internal sealed class LocalWorkbench
{
    private readonly string root, node;
    private readonly object connectGate = new object();
    private Task<LocalConnection> connecting;
    internal LocalWorkbench(string workbenchRoot, string nodeExecutable) { root = workbenchRoot; node = nodeExecutable; }
    private LocalConnection ReadConnection()
    {
        string file = Path.Combine(root, "runtime", "connection.json");
        if (!File.Exists(file)) return null;
        if (new FileInfo(file).Length > 4096) throw new InvalidDataException("本地连接文件过大。");
        return LocalConnection.Parse(File.ReadAllText(file));
    }
    internal static bool Probe(LocalConnection connection)
    {
        if (connection == null) return false;
        return ProbeRoute(connection, "/api/health") || ProbeRoute(connection, "/api/native/status");
    }
    private static bool ProbeRoute(LocalConnection connection, string route)
    {
        if (connection == null) return false;
        try
        {
            var request = (HttpWebRequest)WebRequest.Create(connection.Origin + route);
            request.AllowAutoRedirect = false;
            request.Proxy = null;
            request.CachePolicy = new System.Net.Cache.RequestCachePolicy(System.Net.Cache.RequestCacheLevel.NoCacheNoStore);
            request.Timeout = 1500;
            request.ReadWriteTimeout = 1500;
            request.KeepAlive = false;
            request.ServicePoint.ConnectionLimit = 8;
            request.Headers[HttpRequestHeader.Authorization] = connection.Authorization;
            using (var response = (HttpWebResponse)request.GetResponse())
            {
                if (response.StatusCode != HttpStatusCode.OK || !response.ContentType.StartsWith("application/json", StringComparison.OrdinalIgnoreCase)) return false;
                using (var reader = new StreamReader(response.GetResponseStream()))
                {
                    char[] buffer = new char[8193];
                    int length = 0, read;
                    while (length < buffer.Length && (read = reader.Read(buffer, length, buffer.Length - length)) > 0) length += read;
                    if (length > 8192) return false;
                    var value = new JavaScriptSerializer { MaxJsonLength = 8192, RecursionLimit = 16 }.Deserialize<Dictionary<string, object>>(new string(buffer, 0, length));
                    return value != null && value.ContainsKey("state") && value["state"] is string;
                }
            }
        }
        catch (WebException) { return false; }
        catch (IOException) { return false; }
        catch (ArgumentException) { return false; }
        catch (InvalidOperationException) { return false; }
    }
    private static bool IsAlive(int pid)
    {
        try { using (var process = Process.GetProcessById(pid)) return !process.HasExited; }
        catch (ArgumentException) { return false; }
        catch { return true; }
    }
    internal Task<LocalConnection> ConnectAsync(bool allowStart)
    {
        lock (connectGate)
        {
            if (connecting != null && !connecting.IsCompleted) return connecting;
            connecting = ConnectCoreAsync(allowStart);
            return connecting;
        }
    }
    private Task<LocalConnection> ConnectCoreAsync(bool allowStart)
    {
        return Task.Run(async delegate
        {
            string server = Path.Combine(root, "server.cjs");
            if (!Path.IsPathRooted(root) || !File.Exists(server)) throw new InvalidDataException("未找到此电脑的本地工作台项目。云端模式仍可使用。");
            LocalConnection current = null;
            // Another startup may be replacing the connection file right now.
            for (int attempt = 0; attempt < 3; attempt++)
            {
                try { current = ReadConnection(); break; }
                catch (Exception e) { if (!(e is IOException || e is ArgumentException || e is InvalidOperationException)) throw; if (attempt == 2) throw new InvalidDataException("连接文件暂不可读，请点击重新连接。"); }
                await Task.Delay(200);
            }
            if (Probe(current)) return current;
            if (!allowStart) throw new InvalidOperationException("本地服务尚未就绪；只读检查不会启动服务。");
            bool running = current != null && IsAlive(current.ProcessId);
            string lockFile = Path.Combine(root, "runtime", "server.lock");
            if (File.Exists(lockFile))
            {
                int lockPid;
                if (new FileInfo(lockFile).Length > 32 || !Int32.TryParse(File.ReadAllText(lockFile).Trim(), out lockPid) || lockPid <= 0)
                    throw new InvalidOperationException("本地服务锁仍有效或状态未明，请由组长检查。客户端不会重置服务锁。");
                running = running || IsAlive(lockPid);
            }
            if (!Path.IsPathRooted(node) || !File.Exists(node)) throw new InvalidOperationException("未找到本机 Node.js，无法启动本地工作台。");
            // Fixed, build-bound executable and script; no shell, credentials, or page input in arguments.
            if (!running) using (var process = Process.Start(new ProcessStartInfo(node, "\"" + server + "\"") {
                WorkingDirectory = root, UseShellExecute = false, CreateNoWindow = true, WindowStyle = ProcessWindowStyle.Hidden
            })) { if (process == null) throw new InvalidOperationException("本地服务未能启动。"); }
            var timer = Stopwatch.StartNew();
            while (timer.Elapsed < TimeSpan.FromSeconds(20))
            {
                await Task.Delay(350);
                try { current = ReadConnection(); if (Probe(current)) return current; }
                catch (IOException) { }
                catch (ArgumentException) { }
                catch (InvalidOperationException) { }
            }
            throw new InvalidOperationException("本地服务在 20 秒内未响应。请点击重新连接；已有任务会保留，客户端不会重复派单。");
        });
    }
}
