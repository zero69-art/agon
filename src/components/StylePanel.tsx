import { RectangleHorizontal, RectangleVertical, Square } from 'lucide-react';
import { ASPECTS, FONTS, TRANSITIONS, type Project } from '../lib/types';
import { FONT_FAMILY } from '../lib/renderer';
import { PRESETS } from '../lib/presets';
import { Chip, PaletteSwatches, Section, Slider, Toggle } from './ui';

interface Props {
  project: Project;
  onChange: (patch: Partial<Project>) => void;
  onWpm: (wpm: number) => void;
  onPaletteAll: (i: number) => void;
  onPreset: (id: string) => void;
}

const ASPECT_ICON = { '16:9': RectangleHorizontal, '9:16': RectangleVertical, '1:1': Square };

export function StylePanel({ project, onChange, onWpm, onPaletteAll, onPreset }: Props) {
  const allSame = project.scenes.length > 0 && project.scenes.every((s) => s.palette === project.scenes[0].palette) ? project.scenes[0].palette : null;
  return (
    <div className="space-y-6 p-4">
      <Section title="Start with a look">
        <div className="grid gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onPreset(preset.id)}
              className="group flex items-start gap-3 rounded-xl border border-line bg-surface-2 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-line-2 hover:bg-surface-3"
            >
              <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_14px_currentColor]" style={{ backgroundColor: preset.accent, color: preset.accent }} />
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-cream">{preset.label}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted">{preset.description}</span>
              </span>
              <span className="ml-auto text-muted opacity-0 transition-opacity group-hover:opacity-100">→</span>
            </button>
          ))}
        </div>
      </Section>
      <Section title="Format">
        <div className="grid grid-cols-3 gap-2">
          {ASPECTS.map((a) => {
            const Icon = ASPECT_ICON[a.id];
            const active = project.aspect === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onChange({ aspect: a.id })}
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition-all ${
                  active ? 'border-cream bg-cream text-ink' : 'border-line bg-surface-2 text-cream/80 hover:border-line-2'
                }`}
              >
                <Icon size={20} />
                <span className="text-[13px] font-semibold">{a.label}</span>
                <span className={`font-mono text-[10px] ${active ? 'text-ink/60' : 'text-muted'}`}>{a.hint}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Typeface">
        <div className="grid grid-cols-2 gap-2">
          {FONTS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onChange({ font: f.id })}
              className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                project.font === f.id ? 'border-cream bg-cream text-ink' : 'border-line bg-surface-2 text-cream/85 hover:border-line-2'
              }`}
            >
              <span className="block text-[19px] leading-none" style={{ fontFamily: FONT_FAMILY[f.id], fontWeight: 700 }}>
                Aa
              </span>
              <span className={`mt-1 block font-mono text-[10px] uppercase tracking-[0.15em] ${project.font === f.id ? 'text-ink/60' : 'text-muted'}`}>
                {f.label} · {f.sample}
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Transition">
        <div className="flex flex-wrap gap-1.5">
          {TRANSITIONS.map((t) => (
            <Chip key={t.id} active={project.transition === t.id} onClick={() => onChange({ transition: t.id })}>
              {t.label}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Pacing">
        <Slider label="Reading pace" value={project.wpm} min={100} max={260} step={5} onChange={onWpm} display={`${project.wpm} wpm`} />
        <p className="text-[12px] text-muted">Scene lengths are calculated from their word count. Slower pace = longer scenes.</p>
      </Section>

      <Section title="Cards">
        <div className="space-y-2">
          <Toggle checked={project.introCard} onChange={(v) => onChange({ introCard: v })} label="Title card" hint="Opens with the story title" />
          <Toggle checked={project.outroCard} onChange={(v) => onChange({ outroCard: v })} label="End card" hint='Closes with "The End"' />
        </div>
      </Section>

      <Section title="Palette for every scene">
        <PaletteSwatches value={allSame} onChange={onPaletteAll} />
        <p className="text-[12px] text-muted">Applies one color world to all scenes. You can still override individual scenes.</p>
      </Section>
    </div>
  );
}
