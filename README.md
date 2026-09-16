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
