import { useEffect, useRef } from 'react';
import { Maximize2, Pause, Play, Repeat, RotateCcw } from 'lucide-react';
import { renderFrame } from '../lib/renderer';
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
  const hostRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLCanvasElement>(null);
  const directorRef = useRef<any>(null);
  const projectRef = useRef(project);
  const endedRef = useRef(onEnded);
  usePlayer(player);

  const { w, h } = canvasSize(project.aspect, project.quality);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  useEffect(() => {
    endedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let alive = true;

    const boot = () => {
      const create = (window as any).__AGON_CREATE_THREE_DIRECTOR__;
      if (typeof create !== 'function') {
        onCanvas(fallbackRef.current);
        return;
      }
      create(host, project.scenes.length).then((director: any) => {
        if (!alive) {
          director?.dispose?.();
          return;
        }
        directorRef.current = director;
        onCanvas(director.canvas);
      }).catch(() => onCanvas(fallbackRef.current));
    };

    if (typeof (window as any).__AGON_CREATE_THREE_DIRECTOR__ === 'function') boot();
    else window.addEventListener('agon-three-director-ready', boot);

    return () => {
      alive = false;
      window.removeEventListener('agon-three-director-ready', boot);
      directorRef.current?.dispose?.();
      directorRef.current = null;
      onCanvas(null);
    };
  }, [onCanvas, project.aspect]);

  useEffect(() => {
    const canvas = fallbackRef.current;
    const ctx = canvas?.getContext('2d') ?? null;
    if (!ctx) return;

    let raf = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.1);
      previous = now;
      const p = projectRef.current;
      const total = totalDuration(p);

      if (player.playing) {
        player.time += dt;
        if (player.time >= total) {
          if (player.loop) player.time = 0;
          else {
            player.time = total;
            player.playing = false;
            player.emit();
            endedRef.current();
          }
        }
        player.emit();
      }

      const hit = itemAt(getTimeline(p), Math.min(player.time, Math.max(0, total - 0.001)));
      const scene = hit?.item.scene ?? null;
      const local = hit?.local ?? 0;

      if (directorRef.current) directorRef.current.render(p, scene, local, player.time);
      else renderFrame(ctx, p, player.time, canvas.width, canvas.height);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [player]);

  useEffect(() => {
    const canvas = fallbackRef.current;
    if (canvas) {
      canvas.width = w;
      canvas.height = h;
    }
  }, [w, h]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-black">
        <div ref={hostRef} className="w-full overflow-hidden bg-black" style={{ aspectRatio: w + ' / ' + h }} />
        <canvas ref={fallbackRef} className="absolute inset-0 -z-10 h-full w-full object-contain" width={w} height={h} />
        {exporting && <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white">REC</div>}
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2.5">
        <button type="button" disabled={exporting || !project.scenes.length} onClick={() => { if (player.time >= totalDuration(project) && !player.playing) player.seek(0); player.toggle(); }} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-tangerine text-ink" aria-label={player.playing ? 'Pause' : 'Play'}>
          {player.playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <IconBtn disabled={exporting} onClick={() => player.seek(0)} title="Restart"><RotateCcw size={16} /></IconBtn>
        <div className="font-mono text-[12px] text-cream/85">{formatTime(player.time)} <span className="text-dim">/ {formatTime(totalDuration(project))}</span></div>
        <IconBtn active={player.loop} disabled={exporting} onClick={() => player.setLoop(!player.loop)} title="Loop"><Repeat size={16} /></IconBtn>
        <IconBtn onClick={() => void (directorRef.current?.canvas ?? fallbackRef.current)?.requestFullscreen?.()} title="Fullscreen"><Maximize2 size={16} /></IconBtn>
      </div>
    </div>
  );
}
