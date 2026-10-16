# Salvo

Battleship for the iPhone Duo foldable, played live on a 3D model of the phone in the browser.

The phone sits half-folded like an old travel Battleship case. The lid shows enemy waters (your target grid), the base shows your own fleet and the FIRE control, and the outer display on the back of the lid faces the player across the table, so both players get a screen. Standard rules: 10×10 waters, five ships (carrier, battleship, cruiser, submarine, destroyer), alternating shots. Play against a hunt/target AI admiral or hand the far side to a friend. Sounds (sonar ping, shell whistle, splash, explosion, sunk siren, fanfare) are synthesized with Web Audio.

Built by Chris DiMarco with Claude (Claude Code / JARVIS) on 2026-10-07, inside a local "duo-studio" workspace that extends an open-source iPhone Duo fold viewer.

## Run it

You need Python 3.12 and a Chromium-based browser. The Apple 3D model and screen images are not in this repo (see below), so download them first:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-assets.txt
python scripts/prepare-assets.py
```

If you use the python.org build of Python and the download fails with an SSL error, run it as:

```sh
SSL_CERT_FILE=$(.venv/bin/python -c 'import certifi;print(certifi.where())') .venv/bin/python scripts/prepare-assets.py
```

Then serve the folder over HTTP (opening `index.html` as a file cannot load the model):

```sh
python3 scripts/serve.py 8767
```

Open <http://127.0.0.1:8767/?app=salvo>.

`scripts/serve.py` is a no-cache static server, so edited ES modules reload. `python3 -m http.server 8767 --bind 127.0.0.1` also works.

## How the viewer picks the app

- `main.js` reads the `?app=<name>` query parameter once the model has loaded and calls `startLiveMode(name)`.
- `live.js` does `import('./apps/<name>/app.js')`. Salvo exports `layout = 'halves'`, so `live.js` hands it to `live-halves.js`, which poses the phone like a laptop and mounts three live DOM screens (`lid`, `base`, `outer`) with three.js `CSS3DRenderer`. The lid and outer screens ride a hinge group, so the game stays live at any fold angle.
- Without the query parameter, pick **Salvo — Interactive** from the "App mockup" dropdown under Screen UI.
- The dropdown also lists Computer, Duomatic, Epoch and Waterhole. Those apps live in the original duo-studio workspace and are not in this repo, so choosing them shows an error.

Panel buttons in live mode: Fold / unfold, Your side, Their side, New game, Sound, Reset demo.

## Files

| Path | Purpose |
| --- | --- |
| `apps/salvo/app.js` | Game state, turns, AI timing, panel triggers |
| `apps/salvo/game.js` | Rules, seeded fleet placement, hunt/target AI |
| `apps/salvo/views.js` | Lid, base and outer screen rendering |
| `apps/salvo/sound.js` | Synthesized sound effects |
| `apps/salvo/styles/`, `apps/salvo/fonts/` | Salvo styles and fonts (Saira Stencil One, Barlow Condensed) |
| `index.html`, `main.js`, `ui.js`, `style.css` | The iPhone Duo fold viewer |
| `live.js`, `live-halves.js` | Mount live app screens on the 3D model |
| `vendor/` | three.js r186 (with CSS3DRenderer and USDLoader), modern-screenshot, Octicons license |
| `scripts/prepare-assets.py` | Downloads and prepares the Apple model and screen images into `assets/` |
| `scripts/serve.py` | No-cache dev server. It also hosts the Epoch app's API through `epoch_api.py`, which Salvo does not use |
| `scripts/*` (other) | Promo, demo and trailer renderers from the duo-studio workspace; not needed to play |

## Not in this repo

- `assets/` (about 183 MB in the original workspace). The iPhone Duo model, textures and UI images belong to Apple and are excluded from the upstream project's license; `scripts/prepare-assets.py` downloads them from Apple's URLs. The rest of that folder was a render cache for promo videos.
- `.venv/`, `__pycache__/`.

## Credits and license

- Viewer: the iPhone Duo fold preview by jadon7 (<https://github.com/jadon7/iphone-duo>), MIT, see `LICENSE` and `THIRD_PARTY_NOTICES.md`. The local clone's origin was <https://github.com/chuspeeism/iphone-duo>.
- Salvo game code: Chris DiMarco, built with Claude.
- Fonts: Saira Stencil One and Barlow Condensed, SIL Open Font License.
- Apple models and imagery are not included. iPhone and Apple are trademarks of Apple Inc.

Original location: `/Users/chrisdimarco/Projects/duo-studio/apps/salvo` (viewer files from `/Users/chrisdimarco/Projects/duo-studio/`). Backed up 2026-10-16.
