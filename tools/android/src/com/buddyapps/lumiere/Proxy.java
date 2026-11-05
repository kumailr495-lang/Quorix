package com.buddyapps.lumiere;

// LUMIERE v9 - the app's server passes a film from the web through to the page: /p/<token>/?u=<https url>. To the WebView the film then
// comes from the app's own origin, so its picture can be a WebGL texture and its sound can go through Web Audio (archive.org sends no
// CORS headers, so v8 had to show the open films through a hole in the screen). Byte ranges are forwarded, so seeking works and Chromium
// buffers as usual. Plain Java (no Android classes): tools/android/test runs it on a desktop JVM.
// Security: https only (plain http only for the loopback test upstream when allowLoopbackHttp is set); the route needs the per-launch
// token like the other media routes; redirects are followed only to https; nothing is cached on disk.

import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

public class Proxy implements LocalServer.Source {
    public boolean allowLoopbackHttp = false;
    private final Map<String, long[]> lengths = new LinkedHashMap<String, long[]>(16, 0.75f, true) { protected boolean removeEldestEntry(Map.Entry<String, long[]> e) { return size() > 32; } };
    private final Map<String, String> types = new LinkedHashMap<>();

    private URL check(String u) throws IOException {
        if (u == null || u.length() > 2048) throw new IOException("no url");
        URL url = new URL(u); String p = url.getProtocol().toLowerCase(Locale.ROOT), h = url.getHost().toLowerCase(Locale.ROOT);
        boolean loop = h.equals("127.0.0.1") || h.equals("localhost");
        if (p.equals("https") && !loop) return url;
        if (p.equals("http") && loop && allowLoopbackHttp) return url;
        throw new IOException("only https links");
    }

    private HttpURLConnection open(URL url, String range) throws IOException {
        for (int hop = 0; hop < 6; hop++) {
            HttpURLConnection c = (HttpURLConnection) url.openConnection(); c.setInstanceFollowRedirects(false); c.setConnectTimeout(12000); c.setReadTimeout(20000);
            c.setRequestProperty("User-Agent", "Lumiere/9 (Android cinema app)"); c.setRequestProperty("Accept-Encoding", "identity"); if (range != null) c.setRequestProperty("Range", range);
            int code = c.getResponseCode();
            if (code >= 300 && code < 400) { String loc = c.getHeaderField("Location"); c.disconnect(); if (loc == null) throw new IOException("redirect without location"); url = check(new URL(url, loc).toString()); continue; }
            if (code >= 400) { c.disconnect(); throw new IOException("upstream " + code); }
            return c;
        }
        throw new IOException("too many redirects");
    }

    @Override public LocalServer.Resource get(String path, Map<String, String> query) throws IOException {
        final URL url = check(query.get("u")); final String key = url.toString();
        long[] len; String type;
        synchronized (this) { len = lengths.get(key); type = types.get(key); }
        if (len == null) {
            // the first request learns the size and the type from a one-byte range (some hosts refuse HEAD)
            HttpURLConnection c = open(url, "bytes=0-0"); long total = -1;
            String cr = c.getHeaderField("Content-Range"); if (cr != null && cr.contains("/")) { try { total = Long.parseLong(cr.substring(cr.lastIndexOf('/') + 1).trim()); } catch (NumberFormatException e) { total = -1; } }
            if (total < 0 && c.getResponseCode() == 200) total = c.getContentLengthLong();
            type = c.getContentType(); c.disconnect();
            if (type == null || type.startsWith("application/octet") || type.startsWith("binary")) type = LocalServer.mime(url.getPath());
            len = new long[] { total };
            synchronized (this) { lengths.put(key, len); types.put(key, type); }
        }
        final long total = len[0]; final String t = type;
        return new LocalServer.Resource() {
            public long length() { return total; }
            public String type() { return t; }
            public InputStream open(long offset) throws IOException {
                final HttpURLConnection c = Proxy.this.open(url, offset > 0 || total > 0 ? "bytes=" + offset + "-" : null);
                if (offset > 0 && c.getResponseCode() == 200) { InputStream in = c.getInputStream(); long skip = offset; while (skip > 0) { long n = in.skip(skip); if (n <= 0) break; skip -= n; } return new Closing(in, c); }
                return new Closing(c.getInputStream(), c);
            }
        };
    }

    static final class Closing extends FilterInputStream {
        final HttpURLConnection c; Closing(InputStream in, HttpURLConnection c) { super(in); this.c = c; }
        @Override public void close() throws IOException { try { super.close(); } finally { c.disconnect(); } }
    }
}
