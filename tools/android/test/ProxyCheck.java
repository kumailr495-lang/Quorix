import com.buddyapps.lumiere.Proxy;
// v11: the wrapper refuses links to the phone's own network (Proxy.publicHttps, used by the film proxy and by downloads).
// usage (tools/android/test): javac -d out ../src/com/buddyapps/lumiere/LocalServer.java ../src/com/buddyapps/lumiere/Proxy.java ProxyCheck.java && java -cp out ProxyCheck
public class ProxyCheck {
    public static void main(String[] a) {
        String[][] cases = { {"https://93.184.216.34/film.mp4", "ok"}, {"http://93.184.216.34/film.mp4", "no"}, {"https://192.168.1.1/admin", "no"}, {"https://10.0.0.5/x", "no"},
            {"https://172.16.3.4/x", "no"}, {"https://127.0.0.1:47821/x", "no"}, {"https://169.254.169.254/latest/meta-data", "no"}, {"https://[fd12:3456::1]/x", "no"},
            {"https://[fe80::1]/x", "no"}, {"https://100.64.1.1/x", "no"}, {"https://0.0.0.0/x", "no"}, {"file:///sdcard/x", "no"}, {"javascript:alert(1)", "no"}, {"https://[2606:4700::1111]/x", "ok"} };
        int bad = 0;
        for (String[] c : cases) { String got; try { Proxy.publicHttps(c[0]); got = "ok"; } catch (Exception e) { got = "no"; }
            boolean pass = got.equals(c[1]); if (!pass) bad++; System.out.println((pass ? "PASS " : "FAIL ") + c[0] + " -> " + got); }
        System.out.println(bad == 0 ? "all address checks passed" : bad + " failed"); System.exit(bad);
    }
}
