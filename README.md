# Agon

Agon is a free, browser-native story-to-video creator. It turns text into animated scenes with procedural backgrounds, local music, narration, and export directly from the browser.

## Why it is deployment-ready and free

- No backend required
- No paid AI API required
- Runs fully in the browser with local rendering and local media generation
- Works as a static site on any CDN or static host
- No subscription layer is required

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview -- --host 0.0.0.0
```

## Deployment targets

This app is designed for free deployment on:

- GitHub Pages
- Cloudflare Pages
- Netlify
- Vercel static hosting

## Quality and export

- Uses the browser's native canvas recorder
- Prefers MP4 when available for smoother compatibility
- Renders in real time with local procedural animation and music
- Keeps everything offline-first and zero-cost

## Dialogue and voice

Write dialogue lines with a speaker prefix, for example `MAYA: We should go.`. Agon renders the speaker as a cinematic lower-third and uses the browser's selected speech voice during preview while lowering the music automatically. Browser speech audio cannot be captured by web apps, so final voiceover audio must be recorded or added as a local audio track in a later creator workflow.

## Creator export kit

Use **Export kit** in the app header to download a local creator bundle containing:

- the editable Agon project JSON
- timed `.srt` and `.vtt` captions
- a Blender Python bridge
- an FFmpeg PowerShell render helper

The normal browser export needs no extra software. The Blender and FFmpeg files are optional local workflows for creators who want advanced rendering or encoding.


## OmniRoute integration

Agon can use a local or self-hosted OmniRoute instance as its AI director while keeping the built-in offline story generator as a fallback.

- Default OmniRoute URL: `http://localhost:20128`
- Health check: `GET /api/health`
- Model discovery: `/api/v1/models` or `/v1/models`
- Movie generation: `POST /api/v1/chat/completions`
- Default routing model: `auto/quality`

The connection settings live in the Story Forge panel and are stored locally in the browser. No OmniRoute or provider key is bundled into the application.

## Quaternius 3D assets

Agon can render human characters with Quaternius' CC0 **Universal Base Characters** and animate them with the CC0 **Universal Animation Library**. The browser loads these GLB assets at runtime, while `public/credits/QUATERNIUS.txt` records the sources and license.

Official packs:
- https://quaternius.com/packs/universalbasecharacters.html
- https://quaternius.com/packs/universalanimationlibrary.html

For 3D scenes, **Auto** uses Quaternius for human characters and Agon's procedural runtime for animal/robot characters. 3D projects use the real-time capture export path so imported models and animations are included in the video.


## Free movie asset sources

Agon now has a runtime asset registry for free/CC0 movie assets. The active runtime set includes KayKit Crew, KayKit Forest Nature, Kenney Nature and KayKit Space Base, alongside the existing Quaternius human and animation runtime. Assets are cached when available and every 3D scene keeps a procedural fallback.

The source catalog and license notes live in `src/lib/assetRegistry.ts` and `public/credits/FREE_3D_ASSETS.txt`.
