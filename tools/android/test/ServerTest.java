import com.buddyapps.lumiere.LocalServer;
import com.buddyapps.lumiere.Proxy;
import java.io.*;
import java.util.Map;
// desktop test of the wrapper's loopback server: serves DIR as the asset root and as /m/<token>/<name> (the "phone's videos")
// usage: java -cp out ServerTest DIR PORT   -> prints the base URL and the token, then serves until killed
public class ServerTest {
    public static void main(String[] a) throws Exception {
        final File dir = new File(a[0]); LocalServer s = new LocalServer();
        LocalServer.Source files = new LocalServer.Source() {
            public LocalServer.Resource get(String path, Map<String, String> q) throws IOException {
                final File f = new File(dir, path.startsWith("/") ? path.substring(1) : path); if (!f.isFile()) return null;
                final String t = LocalServer.mime(f.getName());
                return new LocalServer.Resource() { public long length() { return f.length(); } public String type() { return t; }
                    public InputStream open(long off) throws IOException { FileInputStream in = new FileInputStream(f); in.getChannel().position(off); return in; } };
            } };
        s.assets(files); s.route("/m/", files, true);
        Proxy px = new Proxy(); px.allowLoopbackHttp = true; s.route("/p/", px, true);   // v9: the film pass-through, tested against this server itself
        int p = s.start(Integer.parseInt(a[1]), 5);
        System.out.println("BASE " + s.base() + " TOKEN " + s.token); System.out.flush();
        Thread.sleep(Long.MAX_VALUE);
    }
}
