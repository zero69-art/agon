import { Film, FilePlus2 } from 'lucide-react';
import { Btn } from './ui';

interface Props {
  title: string;
  onTitle: (t: string) => void;
  onNew: () => void;
  onExportVideo: () => void;
  compact?: boolean;
  exporting?: boolean;
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#ff6a2b" />
      <path d="M12 9.5v13l10-6.5-10-6.5z" fill="#0c0b10" />
    </svg>
  );
}

export function Header({ title, onTitle, onNew, onExportVideo, compact, exporting }: Props) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-ink/85 px-4 backdrop-blur">
      <div className="flex shrink-0 items-center gap-2.5">
        <Logo />
        <div className="leading-none">
          <div className="font-display text-[18px] font-bold tracking-tight text-cream">Agon</div>
          {!compact && <div className="font-mono text-[8px] uppercase tracking-[0.24em] text-muted">story to movie</div>}
        </div>
      </div>
      <div className="hidden h-6 w-px bg-line sm:block" />
      <input
        value={title}
        onChange={(e) => onTitle(e.target.value)}
        placeholder="Untitled movie"
        className="min-w-0 flex-1 rounded bg-transparent font-display text-[15px] font-semibold text-cream placeholder:text-dim focus:outline-none"
        aria-label="Project title"
      />
      <Btn variant="ghost" onClick={onNew} title="New movie" aria-label="New movie" className="!h-9 !px-2.5" disabled={exporting}>
        <FilePlus2 size={15} />
        <span className="hidden sm:inline">New</span>
      </Btn>
      <Btn variant="primary" onClick={onExportVideo} title="Export video" aria-label="Export video" className="!h-9 !px-3" disabled={exporting}>
        <Film size={15} />
        <span>{exporting ? 'Rendering…' : 'Export'}</span>
      </Btn>
    </header>
  );
}
