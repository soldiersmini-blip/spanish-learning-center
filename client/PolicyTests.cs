using System;
using System.IO;
internal static class PolicyTests
{
    private static int Main()
    {
        string[] blocked = { "http://admin.linarchive.com/", "https://admin.linarchive.com.evil.example/", "https://admin.linarchive.com@evil.example/", "https://user@admin.linarchive.com/", "https://admin.linarchive.com:8443/", "file:///C:/Windows/win.ini", "javascript:alert(1)", "data:text/html,hello", "https://spanish.linarchive.com/", null, "" };
        foreach (string value in blocked) if (ClientPolicy.IsConsole(value)) throw new Exception("Navigation boundary accepted: " + value);
        if (!ClientPolicy.IsConsole(ClientPolicy.ConsoleUrl) || !ClientPolicy.IsConsole("https://admin.linarchive.com:443/#business")) throw new Exception("Canonical console was rejected");
        if (ClientPolicy.IsExternalWebsite("file:///C:/Windows/win.ini") || ClientPolicy.IsExternalWebsite("javascript:alert(1)") || ClientPolicy.IsExternalWebsite("https://user:secret@example.com/")) throw new Exception("Unsafe external launch accepted");
        if (!ClientPolicy.IsExternalWebsite("https://linarchive.com/")) throw new Exception("External website rejected");
        const string origin = "http://127.0.0.1:6047";
        string[] localBlocked = { "http://localhost:6047/", "http://127.1:6047/", "http://2130706433:6047/", "http://127.0.0.1:6048/", "http://127.0.0.1:6047.evil.example/", "http://127.0.0.1:6047@evil.example/", "http://user@127.0.0.1:6047/", "https://127.0.0.1:6047/", "http://127.0.0.1:6047\\@evil.example/", "file:///C:/secret", "http://[::1]:6047/", " http://127.0.0.1:6047/", null };
        foreach (string value in localBlocked) if (ClientPolicy.IsLocal(value, origin)) throw new Exception("Local boundary accepted untrusted navigation");
        foreach (string value in new[] { origin, origin + "/", origin + "/guide", origin + "/#" + new string('a', 64) })
            if (!ClientPolicy.IsLocal(value, origin)) throw new Exception("Trusted local navigation rejected");
        if (ClientPolicy.IsLocalOrigin("http://127.0.0.1:65536") || ClientPolicy.IsLocalOrigin("http://127.0.0.1:0") || ClientPolicy.IsLocalOrigin(origin + "/api") || ClientPolicy.IsLocalOrigin(origin + "#secret")) throw new Exception("Invalid connection origin accepted");
        if (ClientPolicy.IsTrustedNavigation(ClientPolicy.ConsoleUrl, true, origin) || ClientPolicy.IsTrustedNavigation(origin + "/", false, origin)) throw new Exception("Cross-mode navigation accepted");
        const string token = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        string json = "{\"url\":\"" + origin + "\",\"token\":\"" + token + "\",\"pid\":123}";
        var connection = LocalConnection.Parse(json);
        string navigation = connection.NewNavigationUrl;
        if (navigation == connection.NewNavigationUrl || !ClientPolicy.IsLocal(navigation, origin) || new Uri(navigation).Query.Contains(token) || new Uri(navigation).Fragment != "#" + token) throw new Exception("Reconnect must load a fresh document without putting credentials in the query");
        if (connection.Origin != origin || connection.ProcessId != 123 || connection.HomeUrl != origin + "/#" + token || !connection.ContainsCredential("https://example.com/#" + token)) throw new Exception("Connection binding failed");
        foreach (string invalid in new[] { json.Replace(origin, "http://localhost:6047"), json.Replace(token, "bad"), json.Replace("123", "0"), json.Replace(origin, origin + "/api"), json.Replace(origin, "https://evil.example"), new string(' ', 4097) })
        {
            bool rejected = false;
            try { LocalConnection.Parse(invalid); } catch (InvalidDataException) { rejected = true; }
            if (!rejected) throw new Exception("Invalid local connection accepted");
        }
        Console.WriteLine("PASS: cloud origin, exact local origin/port, mode isolation, fragment session binding, credential validation, dangerous URLs");
        return 0;
    }
}
