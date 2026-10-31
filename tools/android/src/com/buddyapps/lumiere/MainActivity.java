package com.buddyapps.lumiere;

// LUMIERE v8 Android wrapper (tools/android/build.sh). The game is the web app in assets/www, served at
// https://appassets.androidplatform.net (a real https origin, so fetch, video and Web Audio behave as in a browser).
// New in v8: window.LumiereMedia, the media bridge the in-game tablet uses to list the phone's videos (MediaStore), show their
// thumbnails (/thumb/<id>) and stream them (/media/<id>, with HTTP range requests so long videos seek instantly).

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.AssetFileDescriptor;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.util.Size;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity extends Activity {
    static final String HOST = "appassets.androidplatform.net", START = "https://" + HOST + "/index.html?app=1";
    static final int PICK = 1, PERM = 2;
    WebView web;
    FrameLayout root;
    View custom;
    WebChromeClient.CustomViewCallback customCb;
    ValueCallback<Uri[]> pickCb;
    final Map<Long, byte[]> thumbs = new LinkedHashMap<Long, byte[]>(64, 0.75f, true) {
        @Override protected boolean removeEldestEntry(Map.Entry<Long, byte[]> e) { return size() > 120; }
    };

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        root = new FrameLayout(this); root.setBackgroundColor(0xff000000);
        web = new WebView(this); web.setBackgroundColor(0xff000000);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false); s.setAllowContentAccess(false); s.setSupportZoom(false); s.setBuiltInZoomControls(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW); s.setCacheMode(WebSettings.LOAD_DEFAULT);
        web.addJavascriptInterface(new Media(), "LumiereMedia");
        web.setWebViewClient(new Client());
        web.setWebChromeClient(new Chrome());
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        immersive();
        if (state == null || web.restoreState(state) == null) web.loadUrl(START);
    }

    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }
    @Override protected void onPause() { web.onPause(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); web.onResume(); immersive(); }
    @Override protected void onDestroy() { if (web != null) { web.destroy(); web = null; } super.onDestroy(); }
    @Override public void onWindowFocusChanged(boolean f) { super.onWindowFocusChanged(f); if (f) immersive(); }

    @Override public void onBackPressed() {
        if (custom != null) { hideCustom(); return; }
        if (web != null && web.canGoBack()) { web.goBack(); return; }   // the game keeps a history entry and turns Back into its own menus
        super.onBackPressed();
    }

    void immersive() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }

    void hideCustom() {
        if (custom == null) return;
        root.removeView(custom); custom = null; web.setVisibility(View.VISIBLE);
        if (customCb != null) customCb.onCustomViewHidden(); customCb = null;
    }

    void js(final String code) { runOnUiThread(new Runnable() { public void run() { if (web != null) web.evaluateJavascript(code, null); } }); }

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
        if (req != PERM) return;
        boolean ok = res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED;
        js("window.__lumiereMediaPermission && window.__lumiereMediaPermission(" + ok + ")");
    }

    static String permission() { return Build.VERSION.SDK_INT >= 33 ? Manifest.permission.READ_MEDIA_VIDEO : Manifest.permission.READ_EXTERNAL_STORAGE; }

    // ---------------------------------------------------------------- window.LumiereMedia
    class Media {
        @JavascriptInterface public boolean hasPermission() { return checkSelfPermission(permission()) == PackageManager.PERMISSION_GRANTED; }
        @JavascriptInterface public void requestPermission() {
            runOnUiThread(new Runnable() { public void run() {
                if (hasPermission()) js("window.__lumiereMediaPermission && window.__lumiereMediaPermission(true)");
                else requestPermissions(new String[] { permission() }, PERM);
            } });
        }
        /** every video on the phone, newest first: [{ id, name, dur (ms), size, date (s), album, w, h }] */
        @JavascriptInterface public String list() {
            JSONArray out = new JSONArray();
            if (!hasPermission()) return out.toString();
            String[] cols = { MediaStore.Video.Media._ID, MediaStore.Video.Media.DISPLAY_NAME, MediaStore.Video.Media.DURATION, MediaStore.Video.Media.SIZE,
                MediaStore.Video.Media.DATE_ADDED, MediaStore.Video.Media.BUCKET_DISPLAY_NAME, MediaStore.Video.Media.WIDTH, MediaStore.Video.Media.HEIGHT };
            Cursor c = null;
            try {
                c = getContentResolver().query(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, cols, null, null, MediaStore.Video.Media.DATE_ADDED + " DESC");
                while (c != null && c.moveToNext() && out.length() < 2000) {
                    JSONObject o = new JSONObject();
                    o.put("id", c.getLong(0)); o.put("name", c.isNull(1) ? "Video" : c.getString(1)); o.put("dur", c.getLong(2)); o.put("size", c.getLong(3));
                    o.put("date", c.getLong(4)); o.put("album", c.isNull(5) ? "" : c.getString(5)); o.put("w", c.getInt(6)); o.put("h", c.getInt(7));
                    out.put(o);
                }
            } catch (Exception e) { /* an empty list: the tablet says there are no videos */ }
            finally { if (c != null) c.close(); }
            return out.toString();
        }
        @JavascriptInterface public String thumbUrl(long id) { return "https://" + HOST + "/thumb/" + id; }
        @JavascriptInterface public String videoUrl(long id) { return "https://" + HOST + "/media/" + id; }
    }

    // ---------------------------------------------------------------- serving: the game's files, thumbnails, the phone's videos
    class Client extends WebViewClient {
        @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest req) {
            Uri u = req.getUrl();
            if (!HOST.equals(u.getHost())) return null;
            String path = u.getPath() == null ? "/" : u.getPath();
            try {
                if (path.startsWith("/media/")) return media(Long.parseLong(path.substring(7)), header(req, "Range"));
                if (path.startsWith("/thumb/")) return thumb(Long.parseLong(path.substring(7)));
                return asset(path.equals("/") ? "/index.html" : path, header(req, "Range"));
            } catch (Exception e) {
                return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", null, new ByteArrayInputStream(new byte[0]));
            }
        }
        @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
            Uri u = req.getUrl();
            if (HOST.equals(u.getHost())) return false;
            try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (ActivityNotFoundException e) { /* no browser: stay */ }
            return true;
        }
    }

    static String header(WebResourceRequest req, String name) {
        for (Map.Entry<String, String> e : req.getRequestHeaders().entrySet()) if (e.getKey().equalsIgnoreCase(name)) return e.getValue();
        return null;
    }

    static String mime(String path) {
        String p = path.toLowerCase(Locale.ROOT); int dot = p.lastIndexOf('.'); String x = dot < 0 ? "" : p.substring(dot + 1);
        switch (x) {
            case "html": return "text/html"; case "js": case "mjs": return "text/javascript"; case "css": return "text/css"; case "json": return "application/json";
            case "png": return "image/png"; case "jpg": case "jpeg": return "image/jpeg"; case "webp": return "image/webp"; case "svg": return "image/svg+xml";
            case "woff2": return "font/woff2"; case "woff": return "font/woff"; case "ttf": return "font/ttf"; case "glb": return "model/gltf-binary";
            case "ogg": case "opus": return "audio/ogg"; case "mp3": return "audio/mpeg"; case "mp4": return "video/mp4"; case "webm": return "video/webm";
            case "wasm": return "application/wasm"; default: return "application/octet-stream";
        }
    }

    WebResourceResponse asset(String path, String range) throws IOException {
        if (path.contains("..")) throw new IOException("bad path");
        String name = "www" + path, type = mime(path);
        Map<String, String> h = new HashMap<>(); h.put("Access-Control-Allow-Origin", "*"); h.put("Cache-Control", "no-cache");
        String enc = type.startsWith("text/") || type.equals("application/json") || type.equals("image/svg+xml") ? "utf-8" : null;
        if (range != null || type.startsWith("video/")) {
            AssetFileDescriptor fd = null;
            try { fd = getAssets().openFd(name); } catch (IOException e) { /* compressed in the APK: no ranges */ }
            if (fd != null) return ranged(fd, type, range, h);
        }
        return new WebResourceResponse(type, enc, 200, "OK", h, getAssets().open(name, android.content.res.AssetManager.ACCESS_STREAMING));
    }

    WebResourceResponse media(long id, String range) throws IOException {
        Uri uri = ContentUris.withAppendedId(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, id);
        ContentResolver cr = getContentResolver(); String type = cr.getType(uri); if (type == null) type = "video/mp4";
        AssetFileDescriptor fd = cr.openAssetFileDescriptor(uri, "r");
        if (fd == null) throw new IOException("no file");
        Map<String, String> h = new HashMap<>(); h.put("Access-Control-Allow-Origin", "*");
        return ranged(fd, type, range, h);
    }

    /** a 200 with the whole file, or a 206 with the requested byte range ("bytes=a-" or "bytes=a-b") */
    static WebResourceResponse ranged(AssetFileDescriptor fd, String type, String range, Map<String, String> h) throws IOException {
        long len = fd.getLength(); if (len < 0) len = fd.getParcelFileDescriptor().getStatSize();
        long a = 0, b = len - 1; boolean part = false;
        if (range != null && range.startsWith("bytes=")) {
            String[] r = range.substring(6).split(",")[0].trim().split("-", -1);
            if (r[0].isEmpty() && r.length > 1 && !r[1].isEmpty()) { a = Math.max(0, len - Long.parseLong(r[1].trim())); }
            else { a = Long.parseLong(r[0].trim()); if (r.length > 1 && !r[1].trim().isEmpty()) b = Math.min(len - 1, Long.parseLong(r[1].trim())); }
            part = true;
        }
        if (a > b || a >= len) { h.put("Content-Range", "bytes */" + len); fd.close(); return new WebResourceResponse(type, null, 416, "Range Not Satisfiable", h, new ByteArrayInputStream(new byte[0])); }
        FileInputStream in = fd.createInputStream(); long skip = a; while (skip > 0) { long n = in.skip(skip); if (n <= 0) break; skip -= n; }
        final long count = b - a + 1;
        InputStream body = new FilterInputStream(in) {
            long left = count;
            @Override public int read() throws IOException { if (left <= 0) return -1; int c = super.read(); if (c >= 0) left--; return c; }
            @Override public int read(byte[] buf, int off, int n) throws IOException { if (left <= 0) return -1; int k = super.read(buf, off, (int) Math.min(n, left)); if (k > 0) left -= k; return k; }
        };
        h.put("Accept-Ranges", "bytes"); h.put("Content-Length", String.valueOf(count));
        if (part) h.put("Content-Range", "bytes " + a + "-" + b + "/" + len);
        return new WebResourceResponse(type, null, part ? 206 : 200, part ? "Partial Content" : "OK", h, body);
    }

    WebResourceResponse thumb(long id) throws IOException {
        byte[] jpg;
        synchronized (thumbs) { jpg = thumbs.get(id); }
        if (jpg == null) {
            Uri uri = ContentUris.withAppendedId(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, id); Bitmap bm;
            if (Build.VERSION.SDK_INT >= 29) bm = getContentResolver().loadThumbnail(uri, new Size(320, 180), null);
            else bm = MediaStore.Video.Thumbnails.getThumbnail(getContentResolver(), id, MediaStore.Video.Thumbnails.MINI_KIND, null);
            if (bm == null) throw new IOException("no thumbnail");
            ByteArrayOutputStream o = new ByteArrayOutputStream(); bm.compress(Bitmap.CompressFormat.JPEG, 82, o); jpg = o.toByteArray();
            synchronized (thumbs) { thumbs.put(id, jpg); }
        }
        Map<String, String> h = new HashMap<>(); h.put("Cache-Control", "max-age=3600");
        return new WebResourceResponse("image/jpeg", null, 200, "OK", h, new ByteArrayInputStream(jpg));
    }

    // ---------------------------------------------------------------- chrome: file chooser, full-screen video, console
    class Chrome extends WebChromeClient {
        @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
            if (pickCb != null) pickCb.onReceiveValue(null);
            pickCb = cb;
            Intent i = new Intent(Intent.ACTION_GET_CONTENT); i.addCategory(Intent.CATEGORY_OPENABLE); i.setType("video/*");
            try { startActivityForResult(Intent.createChooser(i, null), PICK); return true; }
            catch (ActivityNotFoundException e) { pickCb = null; js("window.__lumiereNativeLoadError && window.__lumiereNativeLoadError('No video picker is available')"); return false; }
        }
        @Override public void onShowCustomView(View view, CustomViewCallback cb) {
            if (custom != null) { cb.onCustomViewHidden(); return; }
            custom = view; customCb = cb; root.addView(view, new FrameLayout.LayoutParams(-1, -1)); web.setVisibility(View.GONE); immersive();
        }
        @Override public void onHideCustomView() { hideCustom(); }
    }
}
