import { PALETTES } from '../lib/palettes';
import { getTimeline } from '../lib/timeline';
import type { Project } from '../lib/types';
import { usePlayer, type Player } from '../lib/player';

interface Props {
  project: Project;
  player: Player;
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export function Timeline({ project, player, selectedId, onSelect, disabled }: Props) {
  usePlayer(player);
  const tl = getTimeline(project);
  if (!tl.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line px-4 py-5 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
        timeline · build scenes from your script to begin
      </div>
    );
  }
  const time = player.time;
  return (
    <div className="rounded-2xl border border-line bg-surface p-2.5">
      <div className="mb-2 flex items-center justify-between px-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
        <span>timeline · {project.scenes.length} scenes</span>
        <span>click a scene to edit</span>
      </div>
      <div className="flex h-[68px] gap-1">
        {tl.map((item) => {
          const pal = item.scene ? PALETTES[item.scene.palette % PALETTES.length] : null;
          const active = item.scene ? item.scene.id === selectedId : false;
          const isCurrent = time >= item.start && time < item.start + item.duration;
          const local = isCurrent ? (time - item.start) / item.duration : time >= item.start + item.duration ? 1 : 0;
          const label = item.kind === 'scene' ? String(item.index + 1).padStart(2, '0') : item.kind === 'intro' ? 'TITLE' : 'END';
          return (
            <button
              key={`${item.kind}-${item.scene?.id ?? item.index}`}
              type="button"
              disabled={disabled}
              style={{ flexGrow: item.duration, flexBasis: 0 }}
              onClick={() => {
                player.seek(item.start + 0.01);
                if (item.scene) onSelect(item.scene.id);
              }}
              className={`group relative min-w-[30px] overflow-hidden rounded-lg border text-left transition-all ${
                active ? 'border-cream ring-1 ring-cream/40' : isCurrent ? 'border-tangerine/70' : 'border-line hover:border-line-2'
              }`}
            >
              <div
                className="absolute inset-0"
                style={{ background: pal ? `linear-gradient(135deg, ${pal.bg[0]}, ${pal.bg[1]})` : 'linear-gradient(135deg,#1c1b24,#24232e)' }}
              />
              <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: pal?.accent ?? '#ff6a2b', opacity: 0.85 }} />
              <div className="absolute inset-y-0 left-0 bg-white/10" style={{ width: `${local * 100}%` }} />
              {isCurrent && <div className="absolute inset-y-0 w-0.5 bg-cream shadow-[0_0_8px_rgba(244,239,228,0.8)]" style={{ left: `calc(${local * 100}% - 1px)` }} />}
              <div className="relative flex h-full flex-col justify-between p-2">
                <span className="font-mono text-[10px] text-white/70">{label}</span>
                <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] leading-tight text-white/90">
                  {item.scene?.text ?? (item.kind === 'intro' ? project.title || 'Untitled' : 'The End')}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
