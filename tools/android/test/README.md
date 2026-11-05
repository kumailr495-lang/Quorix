# Wrapper server test (cloud or any desktop with a JDK, ffmpeg and Playwright)
Runs the app's loopback server (`LocalServer.java`) on a desktop JVM and has headless Chromium play and seek videos through it.
```
cd tools/android/test && mkdir -p out media
javac -d out ../src/com/buddyapps/lumiere/LocalServer.java ServerTest.java
ffmpeg -f lavfi -i testsrc2=size=1280x720:rate=30 -f lavfi -i sine -t 20 -c:v libvpx-vp9 -b:v 1M -c:a libopus media/clip.webm
ffmpeg -i media/clip.webm -c copy media/clip.mkv; ffmpeg -i media/clip.webm -c copy media/clip.mp4
cp index.html media/; java -cp out ServerTest media 47821 &   # prints BASE and TOKEN; then run pw.cjs with them
```
Checks: HEAD and byte ranges (200 / 206 / 416), the token, path traversal and the Host check, and playback with two seeks in WebM, MKV and
MP4 (VP9: the open-source Chromium build has no H.264; Android's WebView has). 2026-11-05: all passed, 0-1 dropped frames per clip.
