import { Download, FolderOpen, Trash2, Film, Clock } from 'lucide-react';
import type { ExportedClip, Project } from '../lib/types';
import { totalDuration } from '../lib/timeline';
import { formatTime, slugify } from '../lib/rng';
import { Btn, Section } from './ui';

interface Props {
  library: Project[];
  clips: ExportedClip[];
  currentId: string;
  onLoad: (p: Project) => void;
  onDelete: (id: string) => void;
}

function fmtBytes(n: number): string {
  if (n > 1e9) return `${(n / 1e9).toFixed(2)} GB`;
  if (n > 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  return `${Math.round(n / 1e3)} KB`;
}

export function LibraryPanel({ library, clips, currentId, onLoad, onDelete }: Props) {
  return (
    <div className="flex h-full flex-col gap-5 p-4">
      <div>
        <h2 className="font-display text-lg font-bold tracking-tight">Library</h2>
        <p className="text-[13px] leading-snug text-muted">Projects are saved in this browser. Make as many as you like — there is no cap.</p>
      </div>

      <Section title={`Saved projects · ${library.length}`}>
        {library.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-4 text-center text-[13px] text-muted">Nothing saved yet. Hit “Save” in the top bar.</div>
        ) : (
          <ul className="space-y-2">
            {library.map((p) => (
              <li key={p.id} className={`rounded-xl border p-3 ${p.id === currentId ? 'border-tangerine/50 bg-tangerine/5' : 'border-line bg-surface-2'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-display text-[15px] font-semibold">{p.title || 'Untitled'}</div>
                    <div className="font-mono text-[11px] text-muted">
                      {p.scenes.length} scenes · {formatTime(totalDuration(p))} · {p.aspect} · {new Date(p.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Btn variant="ghost" className="!px-2 !py-1.5" onClick={() => onLoad(p)} title="Open">
                      <FolderOpen size={15} />
                    </Btn>
                    <Btn variant="danger" className="!px-2 !py-1.5" onClick={() => onDelete(p.id)} title="Delete">
                      <Trash2 size={15} />
                    </Btn>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Rendered clips · ${clips.length}`}>
        {clips.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-4 text-center text-[13px] text-muted">
            <Film size={18} className="mx-auto mb-1 opacity-60" />
            Rendered videos from this session appear here.
          </div>
        ) : (
          <ul className="space-y-2">
            {clips.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface-2 p-3">
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium">{c.title || 'Untitled'}</div>
                  <div className="flex items-center gap-1 font-mono text-[11px] text-muted">
                    <Clock size={11} /> {formatTime(c.duration)} · {fmtBytes(c.size)} · {c.mime.includes('mp4') ? 'MP4' : 'WebM'}
                  </div>
                </div>
                <a
                  href={c.url}
                  download={`${slugify(c.title)}.${c.mime.includes('mp4') ? 'mp4' : 'webm'}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-mint px-3 py-1.5 text-[13px] font-medium text-ink hover:brightness-105"
                >
                  <Download size={14} /> Save
                </a>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
