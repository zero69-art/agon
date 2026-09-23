import { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Mic, MicOff, Pause, Play, Repeat, RotateCcw } from 'lucide-react';
import { renderFrame } from '../lib/renderer';
import { music } from '../lib/music';
import { getTimeline, itemAt, totalDuration } from '../lib/timeline';
import { canvasSize, type Project, type Scene } from '../lib/types';
import { formatTime } from '../lib/rng';
import { usePlayer, type Player } from '../lib/player';
import { IconBtn } from './ui';

interface Props {
  project: Project;
  player: Player;
  onCanvas: (c: HTMLCanvasElement | null) => void;
  onEnded: () => void;
  exporting: boolean;
}

interface ThreeDirector {
  canvas: HTMLCanvasElement;
  render: (project: Project, scene: Scene | null, local: number, globalTime: number) => void;
  dispose: () => void;
  setOutputSize?: (size: { w: number; h: number } | null) => void;
}

export function Preview({ project, player, onCanvas, onEnded, exporting }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement>(null);
  const directorRef = useRef<ThreeDirector | null>(null);
  const projectRef = useRef(project);
  const onEndedRef = useRef(onEnded);
  const lastSpoken = useRef<string | null>(null);
  const [threeReady, setThreeReady] = useState(false);
  const [threeError, setThreeError] = useState<string | null>(null);
  usePlayer(player);

  const { w, h } = canvasSize(project.aspect, project.quality);
  const total = totalDuration(project);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    let alive = true;
    const host = stageRef.current;
    if (!host) return;

    setThreeReady(false);
    setThreeError(null);
    onCanvas(null);

    const startDirector = () => {
      const factory = (window as Window & {
        __AGON_CREATE_THREE_DIRECTOR__?: (host: HTMLDivElement, sceneCount: number) => Promise<ThreeDirector>;
      }).__AGON_CREATE_THREE_DIRECTOR__;
      if (!factory) {
        setThreeError('3D runtime is not ready.');
        const fallback = fallbackCanvasRef.current;
        if (fallback) onCanvas(fallback);
        return;
      }
      void factory(host, project.scenes.length)
        .then((director) => {
          if (!alive) {
            director.dispose();
            return;
          }
          directorRef.current = director;
          onCanvas(director.canvas);
          setThreeReady(true);
        })
        .catch((error) => {
          if (!alive) return;
          setThreeError(error instanceof Error ? error.message : '3D runtime failed to load.');
          const fallback = fallbackCanvasRef.current;
          if (fallback) onCanvas(fallback);
        });
    };

    const ready = (window as Window & { __AGON_CREATE_THREE_DIRECTOR__?: unknown }).__AGON_CREATE_THREE_DIRECTOR__;
    if (ready) startDirector();
    else window.addEventListener('agon-three-director-ready', startDirector);

    return () => {
      alive = false;
      window.removeEventListener('agon-three-director-ready', startDirector);
      const director = directorRef.current;
      directorRef.current = null;
      director?.dispose();
      onCanvas(null);
    };
  }, [onCanvas, project.aspect]);

  useEffect(() => {
    const director = directorRef.current;
    if (!director || !threeReady) return;
    director.setOutputSize?.(exporting ? { w, h } : null);
    onCanvas(director.canvas);
  }, [exporting, h, onCanvas, threeReady, w]);

  useEffect(() => {
    const families = ['"Bricolage Grotesque"', '"Fraunces"', '"DM Mono"', '"Nunito"', '"Instrument Sans"'];
    Promise.all(families.map((f) => document.fonts.load('700 40px ' + f).catch(() => undefined))).catch(() => undefined);
  }, []);

  useEffect(() => {
    const fallback = fallbackCanvasRef.current;
    if (!fallback) return;
    fallback.width = w;
    fallback.height = h;
  }, [w, h]);

  useEffect(() => {
    const fallback = fallbackCanvasRef.current;
    const fallbackCtx = fallback?.getContext('2d') ?? null;
    if (!fallbackCtx) return;

    let raf = 0;
    let last = performance.now();
    let lastEmit = 0;

    const narrate = (p: Project) => {
      if (!player.narration || typeof speechSynthesis === 'undefined') return;
      const hit = itemAt(getTimeline(p), player.time);
      const id = hit ? (hit.item.scene?.id ?? hit.item.kind) : null;
      if (id === lastSpoken.current) return;
      lastSpoken.current = id;
      speechSynthesis.cancel();

      const rawText = hit?.item.scene?.text ?? (hit?.item.kind === 'intro' ? p.title : hit?.item.kind === 'outro' ? 'The end.' : '');
      const text = rawText.replace(/^\s*[^:]{1,32}:\s*/, '');
      if (!text) return;

      const u = new SpeechSynthesisUtterance(text);
      u.rate = p.narrationRate || Math.min(1.4, Math.max(0.85, p.wpm / 160));
      u.pitch = p.narrationPitch || 1;
      if (p.narrationVoice) {
        const voice = speechSynthesis.getVoices().find((x) => x.name === p.narrationVoice);
        if (voice) u.voice = voice;
      }
      music.setDucked(true);
      u.onend = () => music.setDucked(false);
      u.onerror = () => music.setDucked(false);
      speechSynthesis.speak(u);
    };

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const p = projectRef.current;
      const tot = totalDuration(p);

      if (player.playing) {
        player.time += dt;
        if (player.time >= tot) {
          if (player.loop) {
            player.time = 0;
          } else {
            player.time = tot;
            player.playing = false;
            player.emit();
            onEndedRef.current();
          }
        }

        narrate(p);
        if (now - lastEmit > 80) {
          lastEmit = now;
          player.emit();
        }
      }

      const hit = itemAt(getTimeline(p), Math.min(player.time, Math.max(0, tot - 0.001)));
      const currentScene: Scene | null = hit?.item.scene ?? null;
      const local = hit?.local ?? 0;

      if (directorRef.current && threeReady) {
        directorRef.current.render(p, currentScene, local, player.time);
      } else {
        renderFrame(fallbackCtx, p, player.time, fallback.width, fallback.height);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [player, threeReady]);

  const currentDialogue = useMemo(() => {
    const hit = itemAt(getTimeline(project), Math.min(player.time, Math.max(0, total - 0.001)));
    const text = hit?.item.scene?.text ?? '';
    const match = text.match(/^\s*([^:]{1,32}):\s*(.+)$/s);
    return match ? { speaker: match[1].trim(), line: match[2].trim() } : null;
  }, [player.time, project, total]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-black shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
        <div
          ref={stageRef}
          className="relative w-full overflow-hidden bg-black lg:h-[min(58vh,620px)]"
          style={{ aspectRatio: w + ' / ' + h }}
        />
        <canvas
          ref={fallbackCanvasRef}
          className={threeReady ? 'pointer-events-none absolute inset-0 hidden h-full w-full object-contain' : 'absolute inset-0 block h-full w-full object-contain'}
          width={w}
          height={h}
        />

        {currentDialogue && threeReady && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 flex justify-center">
            <div className="max-w-[82%] rounded-xl border border-white/10 bg-black/70 px-4 py-2.5 text-center shadow-2xl backdrop-blur-md">
              <div className="mb-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/55">{currentDialogue.speaker}</div>
              <div className="text-sm font-medium leading-relaxed text-white">{currentDialogue.line}</div>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/80 backdrop-blur">
          <span className={'h-2 w-2 rounded-full ' + (threeReady ? 'bg-mint' : threeError ? 'bg-red-400' : 'animate-pulse bg-tangerine')} />
          {threeReady ? '3D live' : threeError ? '3D fallback' : 'loading 3D'}
        </div>

        <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/70 backdrop-blur">
          {w}×{h}
        </div>

        {threeError && (
          <div className="pointer-events-none absolute inset-x-4 top-12 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-200 backdrop-blur">
            {threeError}
          </div>
        )}

        {exporting && (
          <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-cream backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            rec
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2.5">
        <button
          type="button"
          disabled={exporting || !project.scenes.length}
          onClick={() => {
            if (player.time >= total && !player.playing) player.seek(0);
            player.toggle();
          }}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tangerine text-ink shadow-[0_10px_28px_-10px_rgba(255,106,43,0.8)] transition hover:bg-tangerine-2 active:scale-95 disabled:opacity-40"
          aria-label={player.playing ? 'Pause' : 'Play'}
        >
          {player.playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>

        <IconBtn disabled={exporting} onClick={() => player.seek(0)} title="Restart">
          <RotateCcw size={16} />
        </IconBtn>

        <div className="font-mono text-[12px] tabular-nums text-cream/85">
          {formatTime(player.time)} <span className="text-dim">/ {formatTime(total)}</span>
        </div>

        <input
          type="range"
          min={0}
          max={Math.max(0.1, total)}
          step={0.05}
          value={Math.min(player.time, total)}
          disabled={exporting}
          onChange={(e) => player.seek(parseFloat(e.target.value))}
          className="min-w-[120px] flex-1 accent-tangerine"
          aria-label="Seek"
        />

        <IconBtn active={player.loop} disabled={exporting} onClick={() => player.setLoop(!player.loop)} title="Loop playback">
          <Repeat size={16} />
        </IconBtn>

        <IconBtn
          active={player.narration}
          disabled={exporting || typeof speechSynthesis === 'undefined'}
          onClick={() => player.setNarration(!player.narration)}
          title="Read scenes aloud (preview only)"
        >
          {player.narration ? <Mic size={16} /> : <MicOff size={16} />}
        </IconBtn>

        <IconBtn onClick={() => {
          const canvas = directorRef.current?.canvas ?? fallbackCanvasRef.current;
          void canvas?.requestFullscreen?.();
        }} title="Fullscreen">
          <Maximize2 size={16} />
        </IconBtn>
      </div>
    </div>
  );
}
