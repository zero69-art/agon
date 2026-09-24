import { useEffect, useRef } from 'react';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const projectRef = useRef(project);
  const dirtyRef = useRef(true);
  const onEndedRef = useRef(onEnded);
  const lastSpoken = useRef<string | null>(null);
  usePlayer(player);

  const { w, h } = canvasSize(project.aspect, project.quality);
  const total = totalDuration(project);

  useEffect(() => {
    projectRef.current = project;
    dirtyRef.current = true;
  }, [project]);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    onCanvas(canvasRef.current);
    return () => onCanvas(null);
  }, [onCanvas]);

  useEffect(
    () =>
      player.subscribe(() => {
        dirtyRef.current = true;
        if (!player.playing) {
          if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
          music.setDucked(false);
          lastSpoken.current = null;
        }
      }),
    [player],
  );

  useEffect(() => {
    const markDirty = () => {
      dirtyRef.current = true;
    };
    window.addEventListener('agon-three-assets-ready', markDirty);
    return () => window.removeEventListener('agon-three-assets-ready', markDirty);
  }, []);

  useEffect(() => {
    const families = ['"Bricolage Grotesque"', '"Fraunces"', '"DM Mono"', '"Nunito"', '"Instrument Sans"'];
    Promise.all(families.map((f) => document.fonts.load(`700 40px ${f}`).catch(() => undefined))).then(() => {
      dirtyRef.current = true;
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
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
        const v = speechSynthesis.getVoices().find((x) => x.name === p.narrationVoice);
        if (v) u.voice = v;
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
          if (player.loop) player.time = 0;
          else {
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
        dirtyRef.current = true;
      }
      if (dirtyRef.current) {
        // paused at the very start: show a poster frame instead of the blank first frame
        const renderT = !player.playing && player.time === 0 && tot > 0 ? Math.min(1.1, tot * 0.5) : player.time;
        renderFrame(ctx, p, renderT, canvas.width, canvas.height);
        dirtyRef.current = false;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [player, w, h]);

  const disabled = exporting;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-black shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
        <div className="w-full lg:h-[min(58vh,620px)]" style={{ aspectRatio: `${w} / ${h}` }}>
          <canvas ref={canvasRef} width={w} height={h} className="block h-full w-full object-contain" />
        </div>
        {exporting && (
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-cream backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> rec
          </div>
        )}
        <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cream/70 backdrop-blur">
          {w}×{h}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2.5">
        <button
          type="button"
          disabled={disabled || !project.scenes.length}
          onClick={() => {
            if (player.time >= total && !player.playing) player.seek(0);
            player.toggle();
          }}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tangerine text-ink shadow-[0_10px_28px_-10px_rgba(255,106,43,0.8)] transition hover:bg-tangerine-2 active:scale-95 disabled:opacity-40"
          aria-label={player.playing ? 'Pause' : 'Play'}
        >
          {player.playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>
        <IconBtn
          disabled={disabled}
          onClick={() => {
            player.seek(0);
          }}
          title="Restart"
        >
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
          disabled={disabled}
          onChange={(e) => player.seek(parseFloat(e.target.value))}
          className="min-w-[120px] flex-1 accent-tangerine"
          aria-label="Seek"
        />
        <IconBtn active={player.loop} disabled={disabled} onClick={() => player.setLoop(!player.loop)} title="Loop playback">
          <Repeat size={16} />
        </IconBtn>
        <IconBtn
          active={player.narration}
          disabled={disabled || typeof speechSynthesis === 'undefined'}
          onClick={() => player.setNarration(!player.narration)}
          title="Read scenes aloud (preview only)"
        >
          {player.narration ? <Mic size={16} /> : <MicOff size={16} />}
        </IconBtn>
        <IconBtn onClick={() => canvasRef.current?.requestFullscreen?.()} title="Fullscreen">
          <Maximize2 size={16} />
        </IconBtn>
      </div>
    </div>
  );
}
