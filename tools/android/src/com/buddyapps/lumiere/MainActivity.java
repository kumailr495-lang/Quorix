package com.buddyapps.lumiere;

// LUMIERE v9 Android wrapper (tools/android/build.sh). The game is the web app in assets/www, served by LocalServer on the loopback
// interface (http://127.0.0.1:47821), together with the phone's videos (/m/<token>/<id>, byte ranges), their thumbnails and scrub
// frames (/t/<token>/<id>?ms=), and films downloaded for offline play (/f/<token>/<name>). One origin for all of it, so the film can be
// drawn on the 3D screen as a WebGL texture and its sound can run through Web Audio.
// Also: immersive full screen into the display cutout (photo 11: the left strip), safe-area insets passed to the page, pause and resume
// passed to the page (the frozen picture after returning to the app), hardware decoder list and device info for the in-game
// diagnostics page, vibration patterns for the seat shake, film downloads with progress.

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentUris;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.res.AssetFileDescriptor;
import android.content.res.AssetManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.media.MediaCodecInfo;
import android.media.MediaCodecList;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.MediaStore;
import android.util.DisplayMetrics;
import android.util.Size;
import android.view.DisplayCutout;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity extends Activity {
    static final int PICK = 1, PERM = 2, MIC = 3, PORT = 47821;
    android.webkit.PermissionRequest micReq;
    WebView web;
    FrameLayout root;
    View custom;
    WebChromeClient.CustomViewCallback customCb;
    ValueCallback<Uri[]> pickCb;
    LocalServer server;
    String startError = null;
    final Map<String, byte[]> thumbs = new LinkedHashMap<String, byte[]>(64, 0.75f, true) {
        @Override protected boolean removeEldestEntry(Map.Entry<String, byte[]> e) { return size() > 160; }
    };
    final Map<String, Thread> downloads = new HashMap<>();
    MediaMetadataRetriever mmr; long mmrId = -1;
    android.media.MediaPlayer ap; volatile boolean apReady = false, apPlay = false; volatile double apWant = 0, apRate = 1, apVol = 1;   // v14b the film's sound when the WebView cannot decode it
    void stopAudio() { android.media.MediaPlayer m = ap; ap = null; apReady = false; if (m != null) { try { m.stop(); } catch (Exception e) { /* not started */ } try { m.release(); } catch (Exception e) { /* released */ } } }

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 28) {   // draw into the display cutout too (no black strip at the camera side, photo 11)
            WindowManager.LayoutParams a = getWindow().getAttributes();
            a.layoutInDisplayCutoutMode = Build.VERSION.SDK_INT >= 30 ? WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS : WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(a);
        }
        if (Build.VERSION.SDK_INT >= 30) getWindow().setDecorFitsSystemWindows(false);
        root = new FrameLayout(this); root.setBackgroundColor(0xff000000);
        web = new WebView(this); web.setBackgroundColor(0xff000000);
        WebView.setWebContentsDebuggingEnabled(false);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false); s.setAllowContentAccess(false); s.setSupportZoom(false); s.setBuiltInZoomControls(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW); s.setCacheMode(WebSettings.LOAD_DEFAULT);
        { byte[] kb = new byte[16]; new java.security.SecureRandom().nextBytes(kb); StringBuilder ks = new StringBuilder(); for (byte x : kb) ks.append(String.format(java.util.Locale.ROOT, "%02x", x)); bridgeKey = ks.toString(); }
        web.addJavascriptInterface(new Media(), "LumiereMedia");
        web.setWebViewClient(new Client());
        web.setWebChromeClient(new Chrome());
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override public WindowInsets onApplyWindowInsets(View v, WindowInsets in) {
                sendInsets(in);
                // v14 (the user's screenshots: the clock and the navigation keys over the game): bars a swipe or the keyboard brought back
                // hide again after 2.5 s, also when the window's focus never changed
                if (Build.VERSION.SDK_INT >= 30 && in.isVisible(WindowInsets.Type.systemBars())) { v.removeCallbacks(rehide); v.postDelayed(rehide, 2500); }
                return in;
            }
        });
        if (Build.VERSION.SDK_INT < 30) getWindow().getDecorView().setOnSystemUiVisibilityChangeListener(new View.OnSystemUiVisibilityChangeListener() {
            @Override public void onSystemUiVisibilityChange(int vis) { if ((vis & View.SYSTEM_UI_FLAG_FULLSCREEN) == 0) { View d = getWindow().getDecorView(); d.removeCallbacks(rehide); d.postDelayed(rehide, 2500); } }
        });
        setContentView(root);
        immersive();
        startServer();
        // v11: always a fresh load, with this launch's bridge key in the fragment (a restored page would hold the last launch's key)
        String url = server != null ? server.base() + "/index.html?app=1#k=" + bridgeKey : "about:blank";
        web.loadUrl(url);
    }

    void startServer() {
        try {
            server = new LocalServer();
            server.assets(new LocalServer.Source() { public LocalServer.Resource get(String path, Map<String, String> q) throws IOException { return asset(path); } });
            server.route("/m/", new LocalServer.Source() { public LocalServer.Resource get(String path, Map<String, String> q) throws IOException { return media(Long.parseLong(path)); } }, true);
            server.route("/t/", new LocalServer.Source() { public LocalServer.Resource get(String path, Map<String, String> q) throws IOException { return thumb(Long.parseLong(path), q); } }, true);
            server.route("/f/", new LocalServer.Source() { public LocalServer.Resource get(String path, Map<String, String> q) throws IOException { return film(path); } }, true);
            server.route("/p/", new Proxy(), true);   // v9: a film from the web, passed through so the page can use its picture and sound
            server.start(PORT, 10);
        } catch (Exception e) { startError = String.valueOf(e); server = null; }
    }

    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }
    @Override protected void onPause() { js("window.__lumiereLifecycle && window.__lumiereLifecycle('pause')"); web.onPause(); try { if (ap != null && ap.isPlaying()) ap.pause(); } catch (Exception e) { /* not ready */ } super.onPause(); }
    @Override protected void onResume() { super.onResume(); web.onResume(); immersive(); js("window.__lumiereLifecycle && window.__lumiereLifecycle('resume')"); }
    @Override protected void onDestroy() {
        stopAudio();
        if (web != null) { web.destroy(); web = null; }
        if (server != null) server.stop();
        synchronized (this) { if (mmr != null) { try { mmr.release(); } catch (Exception e) { /* released */ } mmr = null; } }
        super.onDestroy();
    }
    @Override public void onWindowFocusChanged(boolean f) { super.onWindowFocusChanged(f); if (f) immersive(); }

    @Override public void onBackPressed() {
        if (custom != null) { hideCustom(); return; }
        if (web != null && web.canGoBack()) { web.goBack(); return; }
        super.onBackPressed();
    }

    final Runnable rehide = new Runnable() { @Override public void run() { immersive(); } };

    @SuppressWarnings("deprecation")
    void immersive() {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) { c.hide(WindowInsets.Type.systemBars()); c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE); }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }
    }

    /** the cutout's safe insets in CSS pixels, as --sal/--sar/--sat/--sab on the page (buttons stay clear of the camera hole) */
    void sendInsets(WindowInsets in) {
        int l = 0, r = 0, t = 0, b = 0;
        if (Build.VERSION.SDK_INT >= 28) { DisplayCutout c = in.getDisplayCutout(); if (c != null) { l = c.getSafeInsetLeft(); r = c.getSafeInsetRight(); t = c.getSafeInsetTop(); b = c.getSafeInsetBottom(); } }
        float d = getResources().getDisplayMetrics().density;
        js(String.format(Locale.ROOT, "window.__lumiereInsets && window.__lumiereInsets(%.1f,%.1f,%.1f,%.1f)", l / d, r / d, t / d, b / d));
    }

    void hideCustom() {
        if (custom == null) return;
        root.removeView(custom); custom = null; web.setVisibility(View.VISIBLE);
        if (customCb != null) customCb.onCustomViewHidden(); customCb = null;
    }

    // v11 the bridge is visible to every frame in the page (addJavascriptInterface has no per-origin switch), so a video site's embed could
    // call it. Every method therefore wants this launch's key, which only the game's own page is given.
    String bridgeKey = "";
    boolean granted() { return checkSelfPermission(permission()) == PackageManager.PERMISSION_GRANTED; }
    boolean key(String k) { return k != null && !bridgeKey.isEmpty() && java.security.MessageDigest.isEqual(bridgeKey.getBytes(), k.getBytes()); }
    void js(final String code) { runOnUiThread(new Runnable() { public void run() { if (web != null) web.evaluateJavascript(code, null); } }); }

    static String q(String s) { return JSONObject.quote(s == null ? "" : s); }

    // ---------------------------------------------------------------- the system picker (fallback for <input type=file>)
    @Override protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req != PICK || pickCb == null) return;
        Uri[] out = null;
        if (res == RESULT_OK && data != null) {
            if (data.getClipData() != null) { out = new Uri[data.getClipData().getItemCount()]; for (int i = 0; i < out.length; i++) out[i] = data.getClipData().getItemAt(i).getUri(); }
            else if (data.getData() != null) out = new Uri[] { data.getData() };
        }
        pickCb.onReceiveValue(out); pickCb = null;
    }

    @Override public void onRequestPermissionsResult(int req, String[] perms, int[] res) {
        super.onRequestPermissionsResult(req, perms, res);
        if (req == MIC) { final android.webkit.PermissionRequest r = micReq; micReq = null; if (r != null) { if (res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED) r.grant(new String[] { android.webkit.PermissionRequest.RESOURCE_AUDIO_CAPTURE }); else r.deny(); } return; }
        if (req != PERM) return;
        boolean ok = res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED;
        js("window.__lumiereMediaPermission && window.__lumiereMediaPermission(" + ok + ")");
    }

    static String permission() { return Build.VERSION.SDK_INT >= 33 ? Manifest.permission.READ_MEDIA_VIDEO : Manifest.permission.READ_EXTERNAL_STORAGE; }

    // ---------------------------------------------------------------- window.LumiereMedia
    class Media {
        @JavascriptInterface public boolean hasPermission(String k) { if (!key(k)) return false; return checkSelfPermission(permission()) == PackageManager.PERMISSION_GRANTED; }
        @JavascriptInterface public void requestPermission(String k) { if (!key(k)) return;
            runOnUiThread(new Runnable() { public void run() {
                if (granted()) js("window.__lumiereMediaPermission && window.__lumiereMediaPermission(true)");
                else requestPermissions(new String[] { permission() }, PERM);
            } });
        }
        @JavascriptInterface public String base(String k) { if (!key(k)) return ""; return server == null ? "" : server.base(); }
        @JavascriptInterface public String proxyBase(String k) { if (!key(k)) return ""; return server == null ? "" : server.base() + "/p/" + server.token + "/?u="; }
        @JavascriptInterface public String serverError(String k) { if (!key(k)) return ""; return startError == null ? "" : startError; }
        /** every video on the phone, newest first: [{ id, name, title, dur (ms), size, date (s), album, w, h, mime, url, thumb }] */
        @JavascriptInterface public String list(String k) { if (!key(k)) return "";
            JSONArray out = new JSONArray();
            if (!granted() || server == null) return out.toString();
            String[] cols = { MediaStore.Video.Media._ID, MediaStore.Video.Media.DISPLAY_NAME, MediaStore.Video.Media.DURATION, MediaStore.Video.Media.SIZE,
                MediaStore.Video.Media.DATE_ADDED, MediaStore.Video.Media.BUCKET_DISPLAY_NAME, MediaStore.Video.Media.WIDTH, MediaStore.Video.Media.HEIGHT,
                MediaStore.Video.Media.MIME_TYPE, MediaStore.Video.Media.TITLE };
            Cursor c = null;
            try {
                c = getContentResolver().query(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, cols, null, null, MediaStore.Video.Media.DATE_ADDED + " DESC");
                while (c != null && c.moveToNext() && out.length() < 3000) {
                    JSONObject o = new JSONObject(); long id = c.getLong(0);
                    o.put("id", id); o.put("name", c.isNull(1) ? "Video" : c.getString(1)); o.put("dur", c.getLong(2)); o.put("size", c.getLong(3));
                    o.put("date", c.getLong(4)); o.put("album", c.isNull(5) ? "" : c.getString(5)); o.put("w", c.getInt(6)); o.put("h", c.getInt(7));
                    o.put("mime", c.isNull(8) ? "" : c.getString(8)); o.put("title", c.isNull(9) ? "" : c.getString(9));
                    o.put("url", server.base() + "/m/" + server.token + "/" + id); o.put("thumb", server.base() + "/t/" + server.token + "/" + id);
                    out.put(o);
                }
            } catch (Exception e) { /* an empty list: the tablet says there are no videos */ }
            finally { if (c != null) c.close(); }
            return out.toString();
        }
        /** a frame of a video at ms (scrub preview), w pixels wide */
        @JavascriptInterface public String frameUrl(String k, long id, long ms, int w) { if (!key(k)) return ""; return server == null ? "" : server.base() + "/t/" + server.token + "/" + id + "?ms=" + ms + "&w=" + w; }
        /** the phone's video decoders: [{ name, type, hw, maxW, maxH }] (the diagnostics page and the "this file may stutter" hint) */
        @JavascriptInterface public String codecs(String k) { if (!key(k)) return "";
            JSONArray out = new JSONArray();
            try {
                for (MediaCodecInfo ci : new MediaCodecList(MediaCodecList.REGULAR_CODECS).getCodecInfos()) {
                    if (ci.isEncoder()) continue;
                    for (String t : ci.getSupportedTypes()) {
                        if (!t.startsWith("video/")) continue;
                        JSONObject o = new JSONObject(); o.put("name", ci.getName()); o.put("type", t);
                        boolean hw = Build.VERSION.SDK_INT >= 29 ? ci.isHardwareAccelerated() : !(ci.getName().startsWith("OMX.google.") || ci.getName().startsWith("c2.android."));
                        o.put("hw", hw);
                        try { MediaCodecInfo.VideoCapabilities v = ci.getCapabilitiesForType(t).getVideoCapabilities(); if (v != null) { o.put("maxW", v.getSupportedWidths().getUpper()); o.put("maxH", v.getSupportedHeights().getUpper()); } } catch (Exception e) { /* no caps */ }
                        out.put(o);
                    }
                }
            } catch (Exception e) { /* empty */ }
            return out.toString();
        }
        @JavascriptInterface public String info(String k) { if (!key(k)) return "";
            JSONObject o = new JSONObject();
            try {
                o.put("android", Build.VERSION.RELEASE); o.put("sdk", Build.VERSION.SDK_INT); o.put("model", Build.MANUFACTURER + " " + Build.MODEL);
                PackageInfo p = WebView.getCurrentWebViewPackage(); o.put("webview", p == null ? "" : p.packageName + " " + p.versionName);
                o.put("server", server == null ? ("down: " + startError) : server.base()); o.put("app", "9.00");
                DisplayMetrics m = getResources().getDisplayMetrics(); o.put("screen", m.widthPixels + "x" + m.heightPixels + " @" + m.density);
            } catch (Exception e) { /* partial */ }
            return o.toString();
        }
        /** seat shake: timings (ms) and amplitudes (0..255), as JSON arrays */
        @JavascriptInterface public void vibrate(String k, String timingsJson, String ampsJson) { if (!key(k)) return;
            try {
                JSONArray t = new JSONArray(timingsJson), a = new JSONArray(ampsJson); long[] tt = new long[t.length()]; int[] aa = new int[t.length()];
                for (int i = 0; i < tt.length; i++) { tt[i] = Math.max(0, Math.min(2000, t.getLong(i))); aa[i] = Math.max(0, Math.min(255, i < a.length() ? a.getInt(i) : 128)); }
                Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (v == null || !v.hasVibrator()) return;
                if (v.hasAmplitudeControl()) v.vibrate(VibrationEffect.createWaveform(tt, aa, -1)); else v.vibrate(VibrationEffect.createWaveform(tt, -1));
            } catch (Exception e) { /* no vibration */ }
        }
        @JavascriptInterface public void stopVibrate(String k) { if (!key(k)) return; Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE); if (v != null) v.cancel(); }
        /** download a film for offline play into the app's Movies folder; progress arrives as window.__lumiereDownload(name, done, total, state) */
        @JavascriptInterface public void download(String k, final String url, final String name) { if (!key(k)) return;
            if (!name.matches("[A-Za-z0-9._-]{1,80}") || url == null || url.length() > 2048 || !url.toLowerCase(java.util.Locale.ROOT).startsWith("https://")) return;   // v11: https only
            synchronized (downloads) { if (downloads.containsKey(name) || downloads.size() >= 3) return; }
            Thread t = new Thread(new Runnable() { public void run() { fetch(url, name); } }, "dl-" + name);
            synchronized (downloads) { downloads.put(name, t); } t.start();
        }
        @JavascriptInterface public void cancelDownload(String k, String name) { if (!key(k)) return; synchronized (downloads) { Thread t = downloads.remove(name); if (t != null) t.interrupt(); } }
        /** films already on the phone: [{ name, size, url }] */
        @JavascriptInterface public String downloaded(String k) { if (!key(k)) return "";
            JSONArray out = new JSONArray();
            File d = filmsDir(); File[] fs = d == null ? null : d.listFiles();
            if (fs != null && server != null) for (File f : fs) { if (f.getName().endsWith(".part")) continue; try { JSONObject o = new JSONObject(); o.put("name", f.getName()); o.put("size", f.length()); o.put("url", server.base() + "/f/" + server.token + "/" + f.getName()); out.put(o); } catch (Exception e) { /* skip */ } }
            return out.toString();
        }
        @JavascriptInterface public boolean removeDownload(String k, String name) { if (!key(k)) return false; File d = filmsDir(); if (d == null || !name.matches("[A-Za-z0-9._-]{1,80}")) return false; return new File(d, name).delete(); }
        // v14b (the user, 11-26: "the audio doesnt work ... its only working for blender movies"): a film whose sound the WebView cannot
        // decode (AC-3, E-AC-3, DTS, or AAC inside an MKV) still plays its picture there; the platform's own player plays its sound (no
        // picture), kept in step with the page's video by audioSync (position, playing, speed, volume)
        @JavascriptInterface public boolean audioStart(String k, final String url, final double sec, final double rate, final double vol) { if (!key(k)) return false;
            if (url == null || !(url.startsWith("http://127.0.0.1:") || url.startsWith("https://"))) return false;
            runOnUiThread(new Runnable() { public void run() {
                stopAudio();
                try { android.media.MediaPlayer m = new android.media.MediaPlayer(); m.setAudioStreamType(android.media.AudioManager.STREAM_MUSIC); m.setDataSource(url);
                    m.setOnPreparedListener(new android.media.MediaPlayer.OnPreparedListener() { public void onPrepared(android.media.MediaPlayer mp) {
                        try { mp.seekTo((int) (Math.max(0, apWant) * 1000)); mp.setVolume((float) apVol, (float) apVol); if (Build.VERSION.SDK_INT >= 23) mp.setPlaybackParams(mp.getPlaybackParams().setSpeed((float) Math.max(0.5, Math.min(2.0, apRate)))); if (apPlay) mp.start(); apReady = true; } catch (Exception e) { /* a stream that will not seek */ } } });
                    m.setOnErrorListener(new android.media.MediaPlayer.OnErrorListener() { public boolean onError(android.media.MediaPlayer mp, int w, int x) { apReady = false; return true; } });
                    ap = m; apReady = false; apWant = sec; apRate = rate; apVol = vol; apPlay = true; m.prepareAsync();
                } catch (Exception e) { ap = null; }
            } });
            return true;
        }
        @JavascriptInterface public void audioSync(String k, final double sec, final boolean playing, final double rate, final double vol) { if (!key(k)) return;
            runOnUiThread(new Runnable() { public void run() {
                apWant = sec; apPlay = playing; apRate = rate; apVol = vol; final android.media.MediaPlayer m = ap; if (m == null || !apReady) return;
                try { m.setVolume((float) vol, (float) vol);
                    if (!playing) { if (m.isPlaying()) m.pause(); return; }
                    if (Build.VERSION.SDK_INT >= 23) { float sp = (float) Math.max(0.5, Math.min(2.0, rate)); if (Math.abs(m.getPlaybackParams().getSpeed() - sp) > 0.01) m.setPlaybackParams(m.getPlaybackParams().setSpeed(sp)); }
                    if (Math.abs(m.getCurrentPosition() / 1000.0 - sec) > 0.25) m.seekTo((int) (sec * 1000));
                    if (!m.isPlaying()) m.start();
                } catch (Exception e) { /* not ready yet */ }
            } });
        }
        @JavascriptInterface public void audioStop(String k) { if (!key(k)) return; runOnUiThread(new Runnable() { public void run() { stopAudio(); } }); }
    }

    static final long MAX_FILM = 4L * 1024 * 1024 * 1024;
    File filmsDir() { File d = getExternalFilesDir(Environment.DIRECTORY_MOVIES); if (d != null && !d.exists()) d.mkdirs(); return d; }

    void fetch(String url, String name) {
        File dir = filmsDir(); if (dir == null) { js("window.__lumiereDownload&&window.__lumiereDownload(" + q(name) + ",0,0,'error')"); return; }
        File part = new File(dir, name + ".part"), done = new File(dir, name);
        HttpURLConnection c = null;
        try {
            long have = part.exists() ? part.length() : 0;
            // v11: redirects are followed by hand, each hop checked like the first (https, a public host): an https start cannot hand the
            // download on to a machine on the phone's own network
            URL at = Proxy.publicHttps(url); int code = 0;
            for (int hop = 0; ; hop++) {
                if (hop > 6) throw new IOException("too many redirects");
                c = (HttpURLConnection) at.openConnection(); c.setInstanceFollowRedirects(false); c.setConnectTimeout(15000); c.setReadTimeout(30000);
                if (have > 0) c.setRequestProperty("Range", "bytes=" + have + "-");
                code = c.getResponseCode();
                if (code < 300 || code >= 400) break;
                String loc = c.getHeaderField("Location"); c.disconnect(); c = null; if (loc == null) throw new IOException("redirect without location");
                at = Proxy.publicHttps(new URL(at, loc).toString());
            }
            boolean resume = code == 206;
            if (code != 200 && code != 206) throw new IOException("HTTP " + code);
            long total = c.getContentLengthLong(); if (total > 0 && resume) total += have; if (!resume) have = 0;
            if (total > MAX_FILM) throw new IOException("too large");
            InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(part, resume);
            byte[] buf = new byte[256 * 1024]; int n; long last = 0;
            try {
                while ((n = in.read(buf)) > 0) {
                    if (Thread.currentThread().isInterrupted()) throw new IOException("cancelled");
                    if (have + n > MAX_FILM) throw new IOException("too large");   // v11: a download cannot fill the phone
                    out.write(buf, 0, n); have += n; long now = System.currentTimeMillis();
                    if (now - last > 400) { last = now; js("window.__lumiereDownload&&window.__lumiereDownload(" + q(name) + "," + have + "," + total + ",'progress')"); }
                }
            } finally { out.close(); in.close(); }
            if (!part.renameTo(done)) throw new IOException("rename");
            js("window.__lumiereDownload&&window.__lumiereDownload(" + q(name) + "," + have + "," + have + ",'done')");
        } catch (Exception e) {
            js("window.__lumiereDownload&&window.__lumiereDownload(" + q(name) + ",0,0," + q("error: " + e.getMessage()) + ")");
        } finally { if (c != null) c.disconnect(); synchronized (downloads) { downloads.remove(name); } }
    }

    // ---------------------------------------------------------------- what the server sends
    LocalServer.Resource asset(final String path) throws IOException {
        final String name = "www" + path, type = LocalServer.mime(path);
        final AssetManager am = getAssets();
        long len = -1;
        try { AssetFileDescriptor fd = am.openFd(name); len = fd.getLength(); fd.close(); } catch (IOException e) { /* compressed in the APK: length unknown */ }
        if (len < 0) {   // compressed entries: read once into memory (scripts, json, small images), so the length is known
            InputStream in = am.open(name); ByteArrayOutputStream o = new ByteArrayOutputStream(); byte[] b = new byte[65536]; int n;
            while ((n = in.read(b)) > 0) o.write(b, 0, n); in.close(); final byte[] data = o.toByteArray();
            return new LocalServer.Resource() {
                public long length() { return data.length; } public String type() { return type; }
                public InputStream open(long off) { return new ByteArrayInputStream(data, (int) off, data.length - (int) off); }
            };
        }
        final long L = len;
        return new LocalServer.Resource() {
            public long length() { return L; } public String type() { return type; }
            public InputStream open(long off) throws IOException { InputStream in = am.open(name, AssetManager.ACCESS_STREAMING); skip(in, off); return in; }
        };
    }

    LocalServer.Resource media(long id) throws IOException {
        final Uri uri = ContentUris.withAppendedId(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, id);
        String t = getContentResolver().getType(uri); if (t == null || t.equals("video/x-matroska")) t = "video/webm";   // Chromium demuxes Matroska as WebM
        final String type = t;
        AssetFileDescriptor fd = getContentResolver().openAssetFileDescriptor(uri, "r"); if (fd == null) throw new IOException("no file");
        long len = fd.getLength(); if (len < 0) len = fd.getParcelFileDescriptor().getStatSize(); fd.close();
        final long L = len;
        return new LocalServer.Resource() {
            public long length() { return L; } public String type() { return type; }
            public InputStream open(long off) throws IOException {
                android.os.ParcelFileDescriptor pfd = getContentResolver().openFileDescriptor(uri, "r"); if (pfd == null) throw new IOException("no file");
                FileInputStream in = new android.os.ParcelFileDescriptor.AutoCloseInputStream(pfd);
                try { in.getChannel().position(off); } catch (IOException e) { skip(in, off); }   // a pipe from the provider: skip instead
                return in;
            }
        };
    }

    LocalServer.Resource film(String name) throws IOException {
        if (!name.matches("[A-Za-z0-9._-]{1,80}")) throw new IOException("bad name");
        final File f = new File(filmsDir(), name); if (!f.isFile()) throw new IOException("missing");
        final String type = LocalServer.mime(name);
        return new LocalServer.Resource() {
            public long length() { return f.length(); } public String type() { return type; }
            public InputStream open(long off) throws IOException { FileInputStream in = new FileInputStream(f); in.getChannel().position(off); return in; }
        };
    }

    LocalServer.Resource thumb(long id, Map<String, String> qs) throws IOException {
        final String key; byte[] jpg;
        long ms = qs.containsKey("ms") ? Long.parseLong(qs.get("ms")) : -1; int w = qs.containsKey("w") ? Math.max(64, Math.min(640, Integer.parseInt(qs.get("w")))) : 320;
        key = id + ":" + (ms < 0 ? -1 : ms / 2000) + ":" + w;   // scrub frames are cached per 2 s
        synchronized (thumbs) { jpg = thumbs.get(key); }
        if (jpg == null) {
            Uri uri = ContentUris.withAppendedId(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, id); Bitmap bm = null;
            if (ms < 0) {
                if (Build.VERSION.SDK_INT >= 29) bm = getContentResolver().loadThumbnail(uri, new Size(w, w * 9 / 16), null);
                else bm = MediaStore.Video.Thumbnails.getThumbnail(getContentResolver(), id, MediaStore.Video.Thumbnails.MINI_KIND, null);
            } else synchronized (this) {
                if (mmr == null || mmrId != id) { if (mmr != null) mmr.release(); mmr = new MediaMetadataRetriever(); mmr.setDataSource(this, uri); mmrId = id; }
                if (Build.VERSION.SDK_INT >= 27) bm = mmr.getScaledFrameAtTime(ms * 1000, MediaMetadataRetriever.OPTION_CLOSEST_SYNC, w, w * 9 / 16);
                else { Bitmap full = mmr.getFrameAtTime(ms * 1000, MediaMetadataRetriever.OPTION_CLOSEST_SYNC); if (full != null) bm = Bitmap.createScaledBitmap(full, w, Math.max(1, w * full.getHeight() / Math.max(1, full.getWidth())), true); }
            }
            if (bm == null) throw new IOException("no frame");
            ByteArrayOutputStream o = new ByteArrayOutputStream(); bm.compress(Bitmap.CompressFormat.JPEG, 78, o); jpg = o.toByteArray();
            synchronized (thumbs) { thumbs.put(key, jpg); }
        }
        final byte[] data = jpg;
        return new LocalServer.Resource() {
            public long length() { return data.length; } public String type() { return "image/jpeg"; }
            public InputStream open(long off) { return new ByteArrayInputStream(data, (int) off, data.length - (int) off); }
        };
    }

    static void skip(InputStream in, long n) throws IOException { while (n > 0) { long k = in.skip(n); if (k <= 0) { if (in.read() < 0) break; k = 1; } n -= k; } }

    // ---------------------------------------------------------------- navigation, chrome: file chooser, full-screen video
    class Client extends WebViewClient {
        @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
            Uri u = req.getUrl(); String sc = u.getScheme() == null ? "" : u.getScheme().toLowerCase(java.util.Locale.ROOT);
            if ("http".equals(sc) && "127.0.0.1".equals(u.getHost()) && server != null && u.getPort() == server.port) return false;
            // v11: a frame (a video embed) cannot start other apps through intent: or market: links; only the page itself opens web links
            if (req.isForMainFrame() && ("https".equals(sc) || "http".equals(sc))) { try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (ActivityNotFoundException e) { /* no browser: stay */ } }
            return true;
        }
    }

    class Chrome extends WebChromeClient {
        @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
            if (pickCb != null) pickCb.onReceiveValue(null);
            pickCb = cb;
            // v14c Music Night: the page asks for video or audio ("video/*,audio/*"); the picker offers what the page accepts
            java.util.ArrayList<String> types = new java.util.ArrayList<>();
            if (p != null && p.getAcceptTypes() != null) for (String a : p.getAcceptTypes()) for (String t : a.split(",")) { t = t.trim(); if (t.startsWith("video/") || t.startsWith("audio/")) types.add(t); }
            if (types.isEmpty()) types.add("video/*");
            Intent i = new Intent(Intent.ACTION_GET_CONTENT); i.addCategory(Intent.CATEGORY_OPENABLE);
            if (types.size() == 1) i.setType(types.get(0)); else { i.setType("*/*"); i.putExtra(Intent.EXTRA_MIME_TYPES, types.toArray(new String[0])); }
            try { startActivityForResult(Intent.createChooser(i, null), PICK); return true; }
            catch (ActivityNotFoundException e) { pickCb = null; return false; }
        }
        @Override public void onShowCustomView(View view, CustomViewCallback cb) {
            if (custom != null) { cb.onCustomViewHidden(); return; }
            custom = view; customCb = cb; root.addView(view, new FrameLayout.LayoutParams(-1, -1)); web.setVisibility(View.GONE); immersive();
        }
        @Override public void onHideCustomView() { hideCustom(); }
        // v14b voice in Play together (the user, 11-26: "proximity chat ... the voice thing like in insta"): the page may use the microphone
        // (only the app's own page asks; the Android permission is asked the first time)
        @Override public void onPermissionRequest(final android.webkit.PermissionRequest r) {
            runOnUiThread(new Runnable() { public void run() {
                boolean ours = r.getOrigin() != null && "127.0.0.1".equals(r.getOrigin().getHost()); boolean mic = false;
                for (String x : r.getResources()) if (android.webkit.PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(x)) mic = true;
                if (!ours || !mic) { r.deny(); return; }
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) { r.grant(new String[] { android.webkit.PermissionRequest.RESOURCE_AUDIO_CAPTURE }); return; }
                micReq = r; requestPermissions(new String[] { Manifest.permission.RECORD_AUDIO }, MIC);
            } });
        }
    }
}
