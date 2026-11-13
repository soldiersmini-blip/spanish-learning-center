using System;
using System.Text.RegularExpressions;

internal static class ClientPolicy
{
    internal const string ConsoleUrl = "https://admin.linarchive.com/#business/spanish/image-factory";
    internal static bool IsConsole(string value)
    {
        Uri uri;
        return Uri.TryCreate(value, UriKind.Absolute, out uri) && uri.Scheme == Uri.UriSchemeHttps &&
            uri.Host == "admin.linarchive.com" && uri.IsDefaultPort && String.IsNullOrEmpty(uri.UserInfo);
    }
    internal static bool IsExternalWebsite(string value)
    {
        Uri uri;
        return Uri.TryCreate(value, UriKind.Absolute, out uri) && uri.Scheme == Uri.UriSchemeHttps && String.IsNullOrEmpty(uri.UserInfo);
    }
    internal static bool IsLocalOrigin(string value)
    {
        if (value == null || !Regex.IsMatch(value, @"\Ahttp://127\.0\.0\.1:[1-9][0-9]{0,4}/?\z")) return false;
        Uri uri;
        return Uri.TryCreate(value, UriKind.Absolute, out uri) && uri.Port > 0 && uri.Port <= 65535 && String.IsNullOrEmpty(uri.UserInfo);
    }
    internal static bool IsLocal(string value, string origin)
    {
        if (!IsLocalOrigin(origin) || value == null) return false;
        origin = origin.TrimEnd('/');
        if (!value.StartsWith(origin + "/", StringComparison.Ordinal) && value != origin) return false;
        Uri uri, trusted;
        return Uri.TryCreate(value, UriKind.Absolute, out uri) && Uri.TryCreate(origin, UriKind.Absolute, out trusted) &&
            uri.Scheme == Uri.UriSchemeHttp && uri.Host == "127.0.0.1" && uri.Port == trusted.Port && String.IsNullOrEmpty(uri.UserInfo);
    }
    internal static bool IsTrustedNavigation(string value, bool local, string localOrigin)
    {
        return local ? IsLocal(value, localOrigin) : IsConsole(value);
    }
}

