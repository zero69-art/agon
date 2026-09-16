import { useEffect, useState } from 'react';
import { Headphones, Square } from 'lucide-react';
import { MUSIC_MOODS, type Project } from '../lib/types';
import { Btn, Chip, Section, Slider } from './ui';

interface Props {
  project: Project;
  onChange: (patch: Partial<Project>) => void;
  previewing: boolean;
  onPreview: (v: boolean) => void;
}

function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return;
    const load = () => setVoices(speechSynthesis.getVoices());
    load();
    speechSynthesis.addEventListener('voiceschanged', load);
    return () => speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);
  return voices;
}

export function MusicPanel({ project, onChange, previewing, onPreview }: Props) {
  const voices = useVoices();

  return (
    <div className="space-y-6 p-4">
      <Section title="Background music">
        <div className="grid grid-cols-2 gap-2">
          {MUSIC_MOODS.map((m) => {
            const active = project.music === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onChange({ music: m.id })}
                className={`rounded-xl border px-3 py-3 text-left transition-all ${
                  active ? 'border-cream bg-cream text-ink' : 'border-line bg-surface-2 text-cream/85 hover:border-line-2'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-[15px] font-bold">{m.label}</span>
                  <span className={`font-mono text-[10px] ${active ? 'text-ink/60' : 'text-muted'}`}>{m.bpm} bpm</span>
                </div>
                <span className={`mt-0.5 block text-[12px] leading-snug ${active ? 'text-ink/70' : 'text-muted'}`}>{m.desc}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[12px] text-muted">
          Every track is generated live in your browser and plays for as long as your video runs — no loops, no licenses, no limits.
        </p>
      </Section>

      <Section title="Mix">
        <Slider
          label="Music volume"
          value={project.musicVolume}
          min={0}
          max={1}
          step={0.01}
          display={`${Math.round(project.musicVolume * 100)}%`}
          onChange={(v) => onChange({ musicVolume: v })}
          disabled={project.music === 'none'}
        />
        <Btn variant={previewing ? 'mint' : 'ghost'} onClick={() => onPreview(!previewing)} disabled={project.music === 'none'} className="w-full">
          {previewing ? <Square size={15} /> : <Headphones size={15} />}
          {previewing ? 'Stop audition' : 'Audition this track'}
        </Btn>
        <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-3 py-2.5">
          <div>
            <div className="text-[13px] font-medium">Beat-synced visuals</div>
            <div className="text-[12px] text-muted">Pulse the scene gently in time with the tempo</div>
          </div>
          <Chip active={project.beatSync} onClick={() => onChange({ beatSync: !project.beatSync })} disabled={project.music === 'none'}>
            {project.beatSync ? 'On' : 'Off'}
          </Chip>
        </div>
      </Section>

      <Section title="Narration">
        <p className="text-[12px] text-muted">
          Reads dialogue and narration aloud during preview with your browser's built-in voices. Music automatically ducks while a voice speaks.
          Browser speech cannot be captured into an exported video, so use a recorded/uploaded voice track for final voiceover.
        </p>
        <label className="block text-[12px] text-muted">
          Voice
          <select
            value={project.narrationVoice}
            onChange={(e) => onChange({ narrationVoice: e.target.value })}
            disabled={typeof speechSynthesis === 'undefined'}
            className="mt-1 w-full rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-[13px] text-cream/90"
          >
            <option value="">System default</option>
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} {v.lang ? `(${v.lang})` : ''}
              </option>
            ))}
          </select>
        </label>
        <Slider
          label="Speaking rate"
          value={project.narrationRate}
          min={0.6}
          max={1.6}
          step={0.05}
          display={`${project.narrationRate.toFixed(2)}×`}
          onChange={(v) => onChange({ narrationRate: v })}
        />
        <Slider
          label="Pitch"
          value={project.narrationPitch}
          min={0.5}
          max={1.5}
          step={0.05}
          display={project.narrationPitch.toFixed(2)}
          onChange={(v) => onChange({ narrationPitch: v })}
        />
      </Section>
    </div>
  );
}
