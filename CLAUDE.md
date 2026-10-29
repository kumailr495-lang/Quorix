# Quorix

The owner works from an Android phone through Claude Code cloud sessions. Never suggest installing desktop software; prefer browser/cloud tooling.

## Creative toolkit (declared in `.claude/settings.json`)

| Plugin | Use it for |
|---|---|
| `impeccable` | `/impeccable polish`, `audit`, `critique` and other commands: frontend design quality and anti-pattern checks |
| `ui-ux-pro-max` | Style, color, typography, and UX databases; stack guides incl. Three.js, React, Tailwind, Flutter |
| `superpowers` | brainstorming, writing-plans, TDD, systematic-debugging, verification-before-completion |
| `example-skills` | frontend-design, algorithmic-art (p5.js), canvas-design, webapp-testing, theme-factory, web-artifacts-builder, slack-gif-creator |

## Cloud container notes

- Chromium is preinstalled. Node `require('playwright')` works with no options.
- Python Playwright (pip) must be pointed at the bundled browser:
  `chromium.launch(executable_path='/opt/pw-browsers/chromium-1243/chrome-linux64/chrome')`
- WebGL/Three.js renders headless with `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`.
- Available: ffmpeg, ImageMagick (`convert`), Pillow, numpy, uv, bun. No Blender/GIMP/Inkscape (desktop apps).
- pip packages do not persist between sessions; reinstall as needed:
  `pip3 install playwright imageio scikit-image opencv-python-headless trimesh opensimplex`
