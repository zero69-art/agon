import { ArrowDown, ArrowUp, Lock, Plus, Shuffle, Trash2, Unlock } from 'lucide-react';
import { BACKGROUNDS, MOTIFS, TEXT_ANIMS, type Project, type Scene } from '../lib/types';
import { computeDuration } from '../lib/sceneBuilder';
import { Btn, Chip, IconBtn, PaletteSwatches, Section, Slider } from './ui';

interface Props {
  project: Project;
  scene: Scene | null;
  onChange: (id: string, patch: Partial<Scene>) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onAddAfter: (id: string) => void;
  onRandomize: (id: string) => void;
}

export function ScenePanel({ project, scene, onChange, onDelete, onMove, onAddAfter, onRandomize }: Props) {
  if (!scene) {
    return (
      <div className="p-6 text-center">
        <div className="mx-auto mb-3 h-12 w-12 rounded-2xl border border-dashed border-line-2" />
        <p className="text-sm text-muted">Select a scene on the timeline to fine-tune its look, text and timing.</p>
      </div>
    );
  }
  const index = project.scenes.findIndex((s) => s.id === scene.id);
  const words = scene.text.trim() ? scene.text.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-tangerine">
            Scene {index + 1} of {project.scenes.length}
          </div>
          <div className="font-mono text-[11px] text-muted">
            {words} words · {scene.duration.toFixed(1)}s
          </div>
        </div>
        <div className="flex gap-1">
          <IconBtn onClick={() => onMove(scene.id, -1)} disabled={index === 0} title="Move earlier">
            <ArrowUp size={15} />
          </IconBtn>
          <IconBtn onClick={() => onMove(scene.id, 1)} disabled={index === project.scenes.length - 1} title="Move later">
            <ArrowDown size={15} />
          </IconBtn>
          <IconBtn onClick={() => onAddAfter(scene.id)} title="Add a scene after this one">
            <Plus size={15} />
          </IconBtn>
          <IconBtn onClick={() => onDelete(scene.id)} title="Delete scene" className="hover:!text-red-300">
            <Trash2 size={15} />
          </IconBtn>
        </div>
      </div>

      <Section title="Text">
        <textarea
          value={scene.text}
          onChange={(e) => onChange(scene.id, { text: e.target.value, duration: scene.locked ? scene.duration : computeDuration(e.target.value, project.wpm) })}
          rows={3}
          className="w-full resize-y rounded-xl border border-line bg-surface-2 p-3 text-[14px] leading-relaxed text-cream focus:border-line-2 focus:outline-none"
        />
      </Section>

      <Section
        title="Duration"
        action={
          <button
            type="button"
            onClick={() => onChange(scene.id, scene.locked ? { locked: false, duration: computeDuration(scene.text, project.wpm) } : { locked: true })}
            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted hover:text-cream"
          >
            {scene.locked ? <Lock size={11} /> : <Unlock size={11} />} {scene.locked ? 'manual' : 'auto'}
          </button>
        }
      >
        <Slider
          label="Scene length"
          value={scene.duration}
          min={1.5}
          max={30}
          step={0.1}
          display={`${scene.duration.toFixed(1)}s`}
          onChange={(v) => onChange(scene.id, { duration: v, locked: true })}
        />
      </Section>

      <Section
        title="Look"
        action={
          <button type="button" onClick={() => onRandomize(scene.id)} className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted hover:text-cream">
            <Shuffle size={11} /> surprise me
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 text-xs text-muted">Palette</div>
            <PaletteSwatches value={scene.palette} onChange={(i) => onChange(scene.id, { palette: i })} size="sm" />
          </div>
          <div>
            <div className="mb-1.5 text-xs text-muted">Background</div>
            <div className="grid grid-cols-2 gap-1.5">
              {BACKGROUNDS.map((b) => (
                <Chip key={b.id} active={scene.bg === b.id} onClick={() => onChange(scene.id, { bg: b.id })} className="!text-left" title={b.hint}>
                  <span className="block">{b.label}</span>
                  <span className={`block text-[10px] ${scene.bg === b.id ? 'text-ink/60' : 'text-muted'}`}>{b.hint}</span>
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-xs text-muted">Illustration</div>
            <div className="flex flex-wrap gap-1.5">
              {MOTIFS.map((m) => (
                <Chip key={m.id} active={scene.motif === m.id} onClick={() => onChange(scene.id, { motif: m.id })}>
                  {m.label}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-xs text-muted">Text animation</div>
            <div className="flex flex-wrap gap-1.5">
              {TEXT_ANIMS.map((a) => (
                <Chip key={a.id} active={scene.textAnim === a.id} onClick={() => onChange(scene.id, { textAnim: a.id })}>
                  {a.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Btn variant="outline" className="w-full" onClick={() => onAddAfter(scene.id)}>
        <Plus size={16} /> Add scene after this
      </Btn>
    </div>
  );
}
