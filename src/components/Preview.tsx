import { useEffect, useRef, useState } from 'react';
import { Maximize2, Mic, MicOff, Pause, Play, Repeat, RotateCcw } from 'lucide-react';
import { renderFrame } from '../lib/renderer';
import { music } from '../lib/music';
import { getTimeline, itemAt, totalDuration } from '../lib/timeline';
import { canvasSize, type Project } from '../lib/types';
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

export function Preview({ project, player, onCanvas, onEnded, exporting }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement>(null);
  const directorRef = useRef<any>(null);
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

    const start = () => {
      const factory = (window as any).__AGON_CREATE_THREE_DIRECTOR__;
      if (typeof factory !== 'function') {
        setThreeError('3D runtime did not load.');
        onCanvas(fallbackCanvasRef.current);
        return;
      }
      void factory(host, project.scenes.length).then((director: any) => {
        if (!alive) {
          director?.dispose?.();
          return;
        }
        directorRef.current = director;
        onCanvas(director.canvas);
        setThreeError(null);
        setThreeReady(true);
      }).catch((error: unknown) => {
        if (!alive) return;
        setThreeError(error instanceof Error ? error.message : '3D runtime failed.');
        onCanvas(fallbackCanvasRef.current);
      });
    };

    if (typeof (window as any).__AGON_CREATE_THREE_DIRECTOR__ === 'function') start();
    else window.addEventListener('agon-three-director-ready', start);

    return () => {
      alive = false;
      window.removeEventListener('agon-three-director-ready', start);
      directorRef.current?.dispose?.();
      directorRef.current = null;
      onCanvas(null);
    };
  }, [onCanvas, project.aspect, project.scenes.length]);

  useEffect(() => {
    const director = directorRef.current;
    if (!director || !threeReady) return;
    director.setOutputSize?.(exporting ? { w, h } : null);
    onCanvas(director.canvas);
  }, [exporting, h, onCanvas, threeReady, w]);

  useEffect(() => {
    const canvas = fallbackCanvasRef.current;
    if (!canvas) return;
    canvas.width = w;
    canvas.height = h;
  }, [w, h]);

  useEffect(() => {
    const canvas = fallbackCanvasRef.current;
    const ctx = canvas?.getContext('2d') ?? null;
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();

    const narrate = (p: Project) => {
      if (!player.narration || typeof speechSynthesis === 'undefined') return;
      const hit = itemAt(getTimeline(p), player.time);
      const id = hit ? hit.item.scene?.id ?? hit.item.kind : null;
      if (id === lastSpoken.current) return;
      lastSpoken.current = id;
      speechSynthesis.cancel();
      const raw = hit?.item.scene?.text ?? '';
      const text = raw.replace(/^\s*[^:]{1,32}:\s*/, '');
      if (!text) return;
      const utterance = new SpeechSynthesisUtterance(text);
      music.setDucked(true);
      utterance.onend = () => music.setDucked(false);
      utterance.onerror = () => music.setDucked(false);
      speechSynthesis.speak(utterance);
    };

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const p = projectRef.current;
      const tot = totalDuration(p);

      if (player.playing) {
        player.time += dt;
        if (player.time >= tot) {
          if (player.loop) player.time = 0;
          else {
            player.time = tot;
            player.playing = false;
            player.emit();
            onEndedRef.current();
          }
        }
        narrate(p);
        player.emit();
      }

      const hit = itemAt(getTimeline(p), Math.min(player.time, Math.max(0, tot - 0.001)));
      const scene = hit?.item.scene ?? null;
      const local = hit?.local ?? 0;

      if (directorRef.current && threeReady) directorRef.current.render(p, scene, local, player.time);
      else renderFrame(ctx, p, player.time, canvas.width, canvas.height);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [player, threeReady]);

  const hit = itemAt(getTimeline(project), Math.min(player.time, Math.max(0, total - 0.001)));
  const dialogue = hit?.item.scene?.text ?? '';
  const match = dialogue.match(/^\s*([^:]{1,32}):\s*(.+)$/s);
  const currentDialogue = match ? { speaker: match[1].trim(), line: match[2].trim() } : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-black">
        <div ref={stageRef} className="relative w-full overflow-hidden bg-black" style={{ aspectRatio: w + ' / ' + h }} />
        <canvas
          ref={fallbackCanvasRef}
          className={threeReady ? 'hidden' : 'absolute inset-0 block h-full w-full object-contain'}
          width={w}
          height={h}
        />
        {currentDialogue && threeReady && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 flex justify-center">
            <div className="max-w-[82%] rounded-xl bg-black/70 px-4 py-2 text-center backdrop-blur">
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/55">{currentDialogue.speaker}</div>
              <div className="text-sm text-white">{currentDialogue.line}</div>
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/80">
          {threeReady ? '3D live' : threeError ? '3D fallback' : 'loading 3D'}
        </div>
        {threeError && (
          <div className="pointer-events-none absolute inset-x-4 top-12 rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
            {threeError}
          </div>
        )}
        {exporting && (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-cream">
            REC
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
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-tangerine text-ink"
          aria-label={player.playing ? 'Pause' : 'Play'}
        >
          {player.playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <IconBtn disabled={exporting} onClick={() => player.seek(0)} title="Restart"><RotateCcw size={16} /></IconBtn>
        <div className="font-mono text-[12px] text-cream/85">{formatTime(player.time)} <span className="text-dim">/ {formatTime(total)}</span></div>
        <input min={0} max={Math.max(0.1, total)} step={0.05} value={Math.min(player.time, total)} disabled={exporting} onChange={(e) => player.seek(parseFloat(e.target.value))} type="range" className="min-w-[120px] flex-1 accent-tangerine" aria-label="Seek" />
        <IconBtn active={player.loop} disabled={exporting} onClick={() => player.setLoop(!player.loop)} title="Loop playback"><Repeat size={16} /></IconBtn>
        <IconBtn active={player.narration} disabled={exporting || typeof speechSynthesis === 'undefined'} onClick={() => player.setNarration(!player.narration)} title="Read scenes aloud">
          {player.narration ? <Mic size={16} /> : <MicOff size={16} />}
        </IconBtn>
        <IconBtn onClick={() => void (directorRef.current?.canvas ?? fallbackCanvasRef.current)?.requestFullscreen?.()} title="Fullscreen"><Maximize2 size={16} /></IconBtn>
      </div>
    </div>
  );
}
