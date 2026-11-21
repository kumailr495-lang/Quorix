package com.buddyapps.lumiere;

// LUMIERE v9 - the app's own little web server on the loopback interface (127.0.0.1 only; nothing outside the phone can reach it).
// The WebView loads the game from it, so the game, the phone's videos and the downloaded films share one origin: the picture can be
// a WebGL texture, the sound can go through Web Audio, and seeking uses ordinary HTTP byte ranges, which Chromium's media stack
// handles the same way it does on any website. (v8 answered video requests inside shouldInterceptRequest; on the phone that path
// failed with "file could not be played".)
// Plain Java with no Android classes, so tools/android/test runs it on a desktop JVM against headless Chromium.
// Security: binds to the loopback address only; requests must name this host (no DNS-rebinding from a web page); media, frame and
// download paths need the per-launch random token; asset paths cannot climb out of the asset root; no CORS headers are sent.

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class LocalServer {
    /** something the server can send: its length (or -1 when unknown), its type, and a stream from a byte offset */
    public interface Resource { long length(); String type(); InputStream open(long offset) throws IOException; }
    /** maps a request path (after the route prefix) to a resource; null = 404 */
    public interface Source { Resource get(String path, Map<String, String> query) throws IOException; }

    public final String token;
    public int port;
    private ServerSocket server;
    private final ExecutorService pool = Executors.newFixedThreadPool(8);
    private final Map<String, Source> routes = new HashMap<>();
    private final Map<String, Boolean> needsToken = new HashMap<>();
    private Source assets;
    private volatile boolean running;

    public LocalServer() {
        byte[] b = new byte[16]; new SecureRandom().nextBytes(b); StringBuilder s = new StringBuilder();
        for (byte x : b) s.append(String.format(Locale.ROOT, "%02x", x)); token = s.toString();
    }
    /** "/m/" -> source; protected routes are reached as /m/<token>/... */
    public void route(String prefix, Source src, boolean protectedRoute) { routes.put(prefix, src); needsToken.put(prefix, protectedRoute); }
    public void assets(Source src) { assets = src; }

    /** binds the first free port from `first` (a fixed port keeps the page's origin, and so its saved settings, the same every launch) */
    public int start(int first, int tries) throws IOException {
        IOException last = null;
        for (int p = first; p < first + tries; p++) {
            try {
                ServerSocket s = new ServerSocket(); s.setReuseAddress(true); s.bind(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), p), 64);
                server = s; port = p; running = true; break;
            } catch (IOException e) { last = e; }
        }
        if (server == null) throw last != null ? last : new IOException("no port");
        Thread t = new Thread(new Runnable() { public void run() { acceptLoop(); } }, "lumiere-http"); t.setDaemon(true); t.start();
        return port;
    }
    public void stop() { running = false; try { if (server != null) server.close(); } catch (IOException e) { /* closing */ } pool.shutdownNow(); }
    public String base() { return "http://127.0.0.1:" + port; }

    private void acceptLoop() {
        while (running) {
            try { final Socket c = server.accept(); pool.execute(new Runnable() { public void run() { serve(c); } }); }
            catch (IOException e) { if (!running) return; }
        }
    }

    private void serve(Socket c) {
        try {
            c.setSoTimeout(15000); c.setTcpNoDelay(true);
            InputStream in = new BufferedInputStream(c.getInputStream(), 8192); OutputStream out = c.getOutputStream();
            for (int n = 0; n < 200; n++) {   // keep-alive: Chromium reuses the connection for the next range request
                String line = readLine(in); if (line == null || line.isEmpty()) break;
                Map<String, String> h = new HashMap<>(); String l;
                while ((l = readLine(in)) != null && !l.isEmpty()) { int i = l.indexOf(':'); if (i > 0) h.put(l.substring(0, i).trim().toLowerCase(Locale.ROOT), l.substring(i + 1).trim()); }
                boolean keep = handle(line, h, out);
                out.flush();
                if (!keep) break;
            }
        } catch (SocketTimeoutException e) { /* idle connection */ }
        catch (IOException e) { /* the player closed the connection mid-file (normal when it seeks) */ }
        finally { try { c.close(); } catch (IOException e) { /* closed */ } }
    }

    private static String readLine(InputStream in) throws IOException {
        StringBuilder s = new StringBuilder(); int b, n = 0;
        while ((b = in.read()) >= 0) { if (b == '\n') break; if (b != '\r') s.append((char) b); if (++n > 16384) throw new IOException("header too long"); }
        return b < 0 && s.length() == 0 ? null : s.toString();
    }

    private boolean handle(String requestLine, Map<String, String> h, OutputStream out) throws IOException {
        String[] p = requestLine.split(" "); if (p.length < 3) { status(out, 400, "Bad Request", false); return false; }
        String method = p[0], target = p[1]; boolean head = method.equals("HEAD");
        boolean keep = !"close".equalsIgnoreCase(h.get("connection"));
        if (!method.equals("GET") && !head) { status(out, 405, "Method Not Allowed", keep); return keep; }
        String host = h.get("host"); if (host == null || !(host.equals("127.0.0.1:" + port) || host.equals("localhost:" + port))) { status(out, 403, "Forbidden", false); return false; }
        String path = target, qs = ""; int q = target.indexOf('?'); if (q >= 0) { path = target.substring(0, q); qs = target.substring(q + 1); }
        path = decode(path);
        if (path.contains("..") || path.contains("\\") || path.indexOf('\0') >= 0) { status(out, 400, "Bad Request", keep); return keep; }
        Map<String, String> query = new HashMap<>();
        for (String kv : qs.split("&")) { int e = kv.indexOf('='); if (e > 0) query.put(decode(kv.substring(0, e)), decode(kv.substring(e + 1))); }
        Resource r = null;
        try {
            for (Map.Entry<String, Source> e : routes.entrySet()) {
                String pre = e.getKey();
                if (!path.startsWith(pre)) continue;
                String rest = path.substring(pre.length());
                if (needsToken.get(pre)) {
                    if (!rest.startsWith(token + "/")) { status(out, 403, "Forbidden", keep); return keep; }
                    rest = rest.substring(token.length() + 1);
                }
                r = e.getValue().get(rest, query); break;
            }
            if (r == null && assets != null && !path.startsWith("/m/") && !path.startsWith("/t/") && !path.startsWith("/f/")) r = assets.get(path.equals("/") ? "/index.html" : path, query);
        } catch (IOException e) { r = null; }
        if (r == null) { status(out, 404, "Not Found", keep); return keep; }
        long len = r.length(); String range = h.get("range"); long a = 0, b = len - 1; boolean part = false;
        if (range != null && range.startsWith("bytes=") && len >= 0) {
            String[] rr = range.substring(6).split(",")[0].trim().split("-", -1);
            try {
                if (rr[0].isEmpty() && rr.length > 1 && !rr[1].isEmpty()) a = Math.max(0, len - Long.parseLong(rr[1].trim()));
                else { a = Long.parseLong(rr[0].trim()); if (rr.length > 1 && !rr[1].trim().isEmpty()) b = Math.min(len - 1, Long.parseLong(rr[1].trim())); }
                part = true;
            } catch (NumberFormatException e) { part = false; a = 0; b = len - 1; }
            if (part && (a > b || a >= len)) {
                String hd = "HTTP/1.1 416 Range Not Satisfiable\r\nContent-Range: bytes */" + len + "\r\nContent-Length: 0\r\n" + (keep ? "" : "Connection: close\r\n") + "\r\n";
                out.write(hd.getBytes(StandardCharsets.US_ASCII)); return keep;
            }
        }
        StringBuilder hd = new StringBuilder();
        hd.append(part ? "HTTP/1.1 206 Partial Content\r\n" : "HTTP/1.1 200 OK\r\n");
        hd.append("Content-Type: ").append(r.type()).append("\r\n").append("Accept-Ranges: bytes\r\n").append("Cache-Control: no-cache\r\n");
        hd.append("X-Content-Type-Options: nosniff\r\n");
        if (len >= 0) { hd.append("Content-Length: ").append(b - a + 1).append("\r\n"); if (part) hd.append("Content-Range: bytes ").append(a).append('-').append(b).append('/').append(len).append("\r\n"); }
        else keep = false;
        if (!keep) hd.append("Connection: close\r\n");
        hd.append("\r\n");
        out.write(hd.toString().getBytes(StandardCharsets.US_ASCII));
        if (head) return keep;
        InputStream body = r.open(a);
        try {
            byte[] buf = new byte[256 * 1024]; long left = len >= 0 ? b - a + 1 : Long.MAX_VALUE;
            while (left > 0) { int n = body.read(buf, 0, (int) Math.min(buf.length, left)); if (n < 0) break; out.write(buf, 0, n); left -= n; }
        } finally { body.close(); }
        return keep;
    }

    private static void status(OutputStream out, int code, String msg, boolean keep) throws IOException {
        byte[] body = msg.getBytes(StandardCharsets.UTF_8);
        String hd = "HTTP/1.1 " + code + " " + msg + "\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: " + body.length + "\r\n" + (keep ? "" : "Connection: close\r\n") + "\r\n";
        out.write(hd.getBytes(StandardCharsets.US_ASCII)); out.write(body);
    }

    private static String decode(String s) {
        try { return java.net.URLDecoder.decode(s.replace("+", "%2B"), "UTF-8"); } catch (Exception e) { return s; }
    }

    public static String mime(String path) {
        String p = path.toLowerCase(Locale.ROOT); int dot = p.lastIndexOf('.'); String x = dot < 0 ? "" : p.substring(dot + 1);
        switch (x) {
            case "html": return "text/html; charset=utf-8"; case "js": case "mjs": return "text/javascript; charset=utf-8"; case "css": return "text/css; charset=utf-8";
            case "json": return "application/json"; case "png": return "image/png"; case "jpg": case "jpeg": return "image/jpeg"; case "webp": return "image/webp";
            case "svg": return "image/svg+xml"; case "woff2": return "font/woff2"; case "woff": return "font/woff"; case "ttf": return "font/ttf"; case "glb": return "model/gltf-binary";
            case "ogg": case "opus": return "audio/ogg"; case "mp3": return "audio/mpeg"; case "wav": return "audio/wav"; case "m4a": return "audio/mp4";
            case "mp4": case "m4v": return "video/mp4"; case "webm": case "mkv": return "video/webm"; case "mov": return "video/quicktime";
            case "3gp": return "video/3gpp"; case "ts": return "video/mp2t"; case "wasm": return "application/wasm"; case "txt": return "text/plain; charset=utf-8";
            default: return "application/octet-stream";
        }
    }
}
