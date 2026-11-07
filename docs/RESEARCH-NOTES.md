# Research notes (what was looked at, what was decided)

## Reference sites you gave
- https://velvet-movies.netlify.app ("Velvet Row: Virtual Cinema") - fetched. A walkable 3D cinema where you play your own films/links on screens 1-3, with ticket counter, sit/stand, house lights, doors, ambient sound, a low-graphics mode and an FPS counter. It confirms the product direction. Adopted: house-light behaviour, sit/stand, user video as the core feature, FPS/scale readout (brightness panel), adaptive quality instead of a manual low-graphics switch.
- https://arfadh-sunhan.github.io/Velvet-Movies/ , https://aethoflix-blond.vercel.app - the fetch tool got a client error; https://cinemaplay.live - blocked the request. Not inspected. Please screenshot anything you want copied from them.
- Searches for open-source "three.js walkable cinema" repos returned only panorama viewers and small demos - nothing worth vendoring. Only library code was reused (three.js r169 + GLTFLoader + BufferGeometryUtils from the old APK).

## Technical findings
- three.js VideoTexture refreshes through requestVideoFrameCallback and is bound to one <video>: v3 keeps ONE persistent <video> + ONE VideoTexture and swaps the source (https://threejs.org/docs/pages/VideoTexture.html).
- A WebView file input does nothing unless the host app implements WebChromeClient.onShowFileChooser. The old wrapper does (the picker opens in your video at 0:15), so the proven wrapper is reused as-is.
- Android WebView autoplay is governed by setMediaPlaybackRequiresUserGesture; the wrapper already references it; v3 additionally unlocks audio on the first tap.
- Device budgets (itel P65 class): measured in tests - 35-40 draw calls, <= 147k triangles in the heaviest hall view, 8 point lights, no shadows, render scale governor 0.55x-1.5x.

## Decision: modelling pipeline
The brief asked for Manifold-3d (WASM) + a 4x4 texture atlas. In this environment npm/WASM downloads are impossible and the atlas fights decimation, so v3 uses:
1. signed-distance modelling (cm units; boxes, cylinders, lathes, sectors, smooth union/subtract) - a union is always one fused solid;
2. surface nets at ~1.2-2 cm -> ~90k triangles, snapped onto the exact surface;
3. colour-aware quadric edge-collapse decimation -> LOD0/1/2 (seat 2600 / 1000 / 380 tris) that keeps material borders (gold plate, walnut inlay);
4. normals from the SDF gradient, ambient occlusion baked into float vertex colours, one shared tileable detail texture.
Trade-off: no per-material texture detail (wood grain, brushed metal) - shapes and colour zones carry the look. If you want textured materials later, add a second UV set + an atlas bake; the pipeline has the zone information needed.

## v4 research and technical decisions (2026-10-29)
### Reference sites
- velvet-movies.netlify.app was the main product reference: booking, sit and stand, house lights, your own video.
- aethoflix-blond.vercel.app answered the fetch tool with HTTP 451.
- cinemaplay.live blocked automated requests.
- Neither of those two could be inspected. Screenshots from you are still the best way to copy anything from them.

### People
- Skinned characters use the standard three.js `SkinnedMesh` and `Skeleton`, built at runtime from the bone table in the GLB extras.
- All motion is procedural (no animation files), which keeps the APK small and lets poses blend freely (sit, clap, cheer, look-at).

### Faces
- One canvas atlas, projected in the character's bind-pose space by an `onBeforeCompile` patch.
- Lesson: never call `floor()` on an interpolated varying that should be an integer.

### Screen spill without stalls
- `getImageData` on a canvas that a video was drawn into forces a synchronous GPU readback. Phones stall for a long time on that; we measured up to 3 s in SwiftShader.
- v4 instead does two things:
  - House films report their average colour analytically.
  - Your video is sampled asynchronously with `createImageBitmap(video, {resizeWidth: 8, resizeHeight: 4})` into a `willReadFrequently` (CPU-backed) canvas.
  - References: [MDN createImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap) and [MDN willReadFrequently](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext).

### Crowd sound
- Procedural WebAudio, no samples:
  - Applause is a noise buffer shaped into many short claps.
  - Cheers are formant-filtered noise.
  - Laughs are pitched, gated voices.
  - The crowd murmur follows the number of nearby NPCs.

### Navigation
- A grid A* with a binary heap on typed arrays, plus a start/end path cache.
- Many arrivals start at the same street door, which is why the cache pays off: cold 2 ms, cached 0.001 ms.

### Testing
- The real engine runs headless in Chromium with SwiftShader WebGL2 via Playwright.
- This made it possible to check rendering, the booking flow and your-own-film playback without a phone.
- It does **not** predict phone performance.
