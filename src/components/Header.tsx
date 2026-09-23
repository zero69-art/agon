import { Check, Download, FilePlus2, Film, Infinity as InfinityIcon, Save, Upload } from 'lucide-react';
import { Btn } from './ui';

interface Props {
  title: string;
  onTitle: (t: string) => void;
  onSave: () => void;
  onNew: () => void;
  /** Download project kit (JSON, captions, helpers). */
  onExportKit: () => void;
  /** Jump to video render / start export flow. */
  onExportVideo: () => void;
  onImport: (file: File) => void;
  saved: boolean;
  compact?: boolean;
  exporting?: boolean;
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="#ff6a2b" />
      <path d="M12 9.5v13l10-6.5-10-6.5z" fill="#0c0b10" />
      <circle cx="8" cy="8" r="1.6" fill="#0c0b10" opacity="0.55" />
      <circle cx="8" cy="24" r="1.6" fill="#0c0b10" opacity="0.55" />
      <circle cx="24" cy="8" r="1.6" fill="#0c0b10" opacity="0.55" />
      <circle cx="24" cy="24" r="1.6" fill="#0c0b10" opacity="0.55" />
    </svg>
  );
}

export function Header({
  title,
  onTitle,
  onSave,
  onNew,
  onExportKit,
  onExportVideo,
  onImport,
  saved,
  compact,
  exporting,
}: Props) {
  const importId = 'agon-project-import';
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-ink/80 px-3 backdrop-blur sm:px-4">
      <div className="flex items-center gap-2.5">
        <Logo />
        <div className="leading-none">
          <div className="font-display text-[19px] font-bold tracking-tight text-cream">Agon</div>
          {!compact && <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted">text → motion</div>}
        </div>
      </div>
      <div className="mx-1 hidden h-6 w-px bg-line sm:block" />
      <input
        value={title}
        onChange={(e) => onTitle(e.target.value)}
        placeholder="Untitled story"
        className="min-w-0 flex-1 bg-transparent font-display text-[15px] font-semibold text-cream placeholder:text-dim focus:outline-none focus-visible:ring-2 focus-visible:ring-tangerine/50 rounded sm:text-base"
        aria-label="Project title"
      />
      <div className="hidden items-center gap-1.5 rounded-full border border-mint/30 bg-mint/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-mint md:flex">
        <InfinityIcon size={12} aria-hidden /> unlimited · free · local
      </div>
      <Btn variant="ghost" onClick={onNew} title="New project" aria-label="New project" className="!px-2.5" disabled={exporting}>
        <FilePlus2 size={16} aria-hidden />
        <span className="hidden sm:inline">New</span>
      </Btn>
      <Btn variant={saved ? 'mint' : 'outline'} onClick={onSave} title="Save to library" aria-label={saved ? 'Saved' : 'Save to library'} className="!px-2.5" disabled={exporting}>
        {saved ? <Check size={16} aria-hidden /> : <Save size={16} aria-hidden />}
        <span className="hidden sm:inline">{saved ? 'Saved' : 'Save'}</span>
      </Btn>
      <input
        id={importId}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
      />
      <label
        htmlFor={importId}
        className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-line-2 px-3.5 py-2 text-sm font-medium text-cream transition-all hover:bg-surface-2 focus-within:ring-2 focus-within:ring-tangerine/50 ${exporting ? 'pointer-events-none opacity-40' : ''}`}
      >
        <Upload size={16} aria-hidden />
        <span className="hidden sm:inline">Import</span>
      </label>
      <Btn variant="outline" onClick={onExportKit} title="Download project kit (JSON, captions, helpers)" aria-label="Export kit" className="!px-2.5" disabled={exporting}>
        <Download size={16} aria-hidden />
        <span className="hidden sm:inline">Export kit</span>
      </Btn>
      <Btn variant="primary" onClick={onExportVideo} title="Render and download video" aria-label="Export video" className="!px-2.5" disabled={exporting}>
        <Film size={16} aria-hidden />
        <span className="hidden sm:inline">Export Video</span>
      </Btn>
    </header>
  );
}
