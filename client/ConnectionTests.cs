using System;
using System.IO;
using System.Net;
using System.Diagnostics;
using System.Threading.Tasks;
internal static class ConnectionTests
{
    static void Check(bool value,string message) { if (!value) throw new Exception(message); }
    static void Stop(LocalConnection c) {
        if(c==null)return;
        try { var r=(HttpWebRequest)WebRequest.Create(c.Origin+"/stop");r.Proxy=null;r.Timeout=2000;r.KeepAlive=false;r.CachePolicy=new System.Net.Cache.RequestCachePolicy(System.Net.Cache.RequestCacheLevel.NoCacheNoStore);using(var response=r.GetResponse()){} } catch {}
        try { using(var p=Process.GetProcessById(c.ProcessId))p.WaitForExit(4000); } catch(ArgumentException){}
    }
    static async Task Run(string node,string fixture) {
        string root=Path.Combine(Path.GetTempPath(),"linarchive-connect-test-"+Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);File.Copy(fixture,Path.Combine(root,"server.cjs"));
        LocalConnection first=null,second=null;
        try {
            var workbench=new LocalWorkbench(root,node);
            var a=workbench.ConnectAsync(true);var b=workbench.ConnectAsync(true);
            Check(Object.ReferenceEquals(a,b),"Repeated clicks must share one connection task");
            first=await a;Check(LocalWorkbench.Probe(first),"Fresh service did not connect");Console.WriteLine("startup passed");
            Check(File.ReadAllLines(Path.Combine(root,"starts.txt")).Length==1,"Duplicate process startup");
            Stop(first);second=await workbench.ConnectAsync(true);
            Check(first.ProcessId!=second.ProcessId&&LocalWorkbench.Probe(second),"Stopped service did not recover");
            Console.WriteLine("recovery passed");
            Check(File.ReadAllLines(Path.Combine(root,"starts.txt")).Length==2,"Recovery started duplicate processes");
            File.WriteAllText(Path.Combine(root,"unresponsive"),"fixture");
            var timer=Stopwatch.StartNew();bool rejected=false;
            try { await workbench.ConnectAsync(true); }catch(InvalidOperationException){rejected=true;}
            Check(rejected&&timer.Elapsed.TotalSeconds<28,"Unresponsive service must terminate connection wait");
            Check(File.ReadAllLines(Path.Combine(root,"starts.txt")).Length==2,"Unresponsive live service must not be duplicated");
            Console.WriteLine("PASS: shared startup, one process, stopped-service recovery, bounded failure, no duplicate execution");
        } finally {
            Stop(second);Stop(first);
            string target=Path.GetFullPath(root),prefix=Path.GetFullPath(Path.GetTempPath()).TrimEnd(Path.DirectorySeparatorChar)+Path.DirectorySeparatorChar+"linarchive-connect-test-";
            if(!target.StartsWith(prefix,StringComparison.OrdinalIgnoreCase))throw new Exception("TEMP_PATH_REJECTED");
            Directory.Delete(target,true);
        }
    }
    static int Main(string[] args) { try{Run(args[0],args[1]).GetAwaiter().GetResult();return 0;}catch(Exception e){Console.WriteLine(e.GetType().Name+": "+e.Message);return 1;} }
}
