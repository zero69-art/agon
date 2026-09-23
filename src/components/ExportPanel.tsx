import { useEffect, useState } from 'react';
import { Download, Film, Loader2, X } from 'lucide-react';
import { canvasSize, type ExportedClip, type Project } from '../lib/types';
import { totalDuration } from '../lib/timeline';
import { formatTime, slugify } from '../lib/rng';
import { usePlayer, type Player } from '../lib/player';
import { Btn, Chip, Section } from './ui';

interface Props {
  project: Project;
  player: Player;
  exporting: boolean;
  supported: boolean;
  mime: string;
  latest: ExportedClip | null;
  error: string | null;
  onChange: (patch: Partial<Project>) => void;
  onStart: () => void;
  onCancel: () => void;
}

export function ExportPanel({ project, player, exporting, supported, mime, latest, error, onChange, onStart, onCancel }: Props) {
  usePlayer(player);
  const total = totalDuration(project);
  const { w, h } = canvasSize(project.aspect, project.quality);
  const progress = exporting && total > 0 ? Math.min(1, player.time / total) : 0;
  const ext = mime.includes('mp4') ? 'MP4' : 'WebM';
  const [tabHidden, setTabHidden] = useState(() => typeof document !== 'undefined' && document.hidden);

  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return (
    <div className="space-y-6 p-4">
      <Section title="Render quality">
        <div className="flex flex-wrap gap-1.5">
          <Chip active={project.quality === 'standard'} onClick={() => onChange({ quality: 'standard' })} disabled={exporting}>
            Standard · {canvasSize(project.aspect, 'standard').h}p
          </Chip>
          <Chip active={project.quality === 'high'} onClick={() => onChange({ quality: 'high' })} disabled={exporting}>
            High · {canvasSize(project.aspect, 'high').h}p
          </Chip>
          <Chip active={project.quality === 'ultra'} onClick={() => onChange({ quality: 'ultra' })} disabled={exporting}>
            Ultra · {canvasSize(project.aspect, 'ultra').h}p (4K)
          </Chip>
        </div>
        {project.quality === 'ultra' && (
          <p className="text-[12px] text-muted">4K renders take more CPU to draw live — expect slower, choppier preview on lower-end machines during export.</p>
        )}
        <dl className="grid grid-cols-2 gap-y-1.5 rounded-xl border border-line bg-surface-2 p-3 font-mono text-[11px]">
          <dt className="text-muted">Resolution</dt>
          <dd className="text-right text-cream/85">
            {w} × {h}
          </dd>
          <dt className="text-muted">Duration</dt>
          <dd className="text-right text-cream/85">{formatTime(total)}</dd>
          <dt className="text-muted">Container</dt>
          <dd className="text-right text-cream/85">{supported ? ext : 'unsupported'}</dd>
          <dt className="text-muted">Audio</dt>
          <dd className="text-right text-cream/85">{project.music === 'none' ? 'silent' : project.music}</dd>
        </dl>
      </Section>

      <Section title="Render">
        {!exporting ? (
          <Btn variant="primary" className="w-full !py-3" onClick={onStart} disabled={!supported || !project.scenes.length} aria-label={`Render video ${formatTime(total)}`}>
            <Film size={16} aria-hidden /> Render video · {formatTime(total)}
          </Btn>
        ) : (
          <div className="space-y-2 rounded-xl border border-tangerine/40 bg-tangerine/5 p-3">
            <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-tangerine">
              <span className="inline-flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" aria-hidden /> rendering
              </span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-tangerine transition-[width]" style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-muted">
                {formatTime(player.time)} / {formatTime(total)}
              </span>
              <button type="button" onClick={onCancel} className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-tangerine" aria-label="Cancel render">
                <X size={12} aria-hidden /> Cancel
              </button>
            </div>
            {tabHidden && (
              <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-2 text-[12px] leading-snug text-amber-100" role="status">
                This tab is in the background. Browsers throttle hidden tabs — frames may drop. Bring Agon to the front to finish a clean render.
              </p>
            )}
          </div>
        )}
        <p className="text-[12px] leading-snug text-muted">
          Rendering happens in real time inside your browser — a 3-minute video takes about 3 minutes. Keep this tab visible while it records. Videos of any length,
          as many as you like.
        </p>
        {!supported && <p className="text-[12px] text-red-300">This browser can’t record canvas video. Try Chrome, Edge or Firefox.</p>}
        {error && <p className="rounded-lg border border-red-300/30 bg-red-300/10 p-2 text-[12px] leading-snug text-red-200" role="alert">{error}</p>}
      </Section>

      {latest && (
        <Section title="Latest render">
          <div className="space-y-2 rounded-xl border border-mint/30 bg-mint/5 p-3">
            <video src={latest.url} controls className="w-full rounded-lg bg-black" />
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium">{latest.title}</div>
                <div className="font-mono text-[11px] text-muted">
                  {formatTime(latest.duration)} · {(latest.size / 1e6).toFixed(1)} MB
                </div>
              </div>
              <a
                href={latest.url}
                download={`${slugify(latest.title)}.${latest.mime.includes('mp4') ? 'mp4' : 'webm'}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-mint px-3 py-1.5 text-[13px] font-medium text-ink hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint"
              >
                <Download size={14} aria-hidden /> Download
              </a>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}
