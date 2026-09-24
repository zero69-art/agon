import { ASPECTS, CAMERA_MOTIONS, MUSIC_MOODS, type Project } from '../lib/types';
import { Btn, Chip, Section, Slider } from './ui';

interface Props {
  project: Project;
  onChange: (patch: Partial<Project>) => void;
  onWpm: (wpm: number) => void;
  onExport: () => void;
  onCancelExport?: () => void;
  exportError?: string | null;
  supported?: boolean;
  exporting: boolean;
  webcodecsProgress?: number | null;
}

export function SimpleControls({
  project,
  onChange,
  onWpm,
  onExport,
  onCancelExport,
  exportError,
  supported = true,
  exporting,
  webcodecsProgress = null,
}: Props) {
  const musicChoices = MUSIC_MOODS.filter((m) => ['none', 'dreamy', 'cinematic', 'upbeat', 'ambient'].includes(m.id));
  const cameraChoices = CAMERA_MOTIONS.filter((c) => ['still', 'push', 'drift', 'orbit'].includes(c.id));

  return (
    <div className="space-y-6 p-4">
      <Section title="Format">
        <div className="grid grid-cols-3 gap-1.5">
          {ASPECTS.map((a) => (
            <Chip key={a.id} active={project.aspect === a.id} onClick={() => onChange({ aspect: a.id })} className="!px-2.5">
              {a.id}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Music">
        <div className="grid grid-cols-2 gap-1.5">
          {musicChoices.map((m) => (
            <Chip key={m.id} active={project.music === m.id} onClick={() => onChange({ music: m.id })} className="!text-left !px-2.5">
              {m.label}
            </Chip>
          ))}
        </div>
        <Slider
          label="Volume"
          value={project.musicVolume}
          min={0}
          max={1}
          step={0.01}
          display={project.music === 'none' ? 'off' : `${Math.round(project.musicVolume * 100)}%`}
          onChange={(v) => onChange({ musicVolume: v })}
          disabled={project.music === 'none'}
        />
      </Section>

      <Section title="Camera">
        <div className="grid grid-cols-2 gap-1.5">
          {cameraChoices.map((camera) => (
            <Chip
              key={camera.id}
              active={project.scenes.length > 0 && project.scenes.every((s) => s.camera === camera.id)}
              onClick={() => onChange({ scenes: project.scenes.map((s) => ({ ...s, camera: camera.id })) })}
              className="!text-left !px-2.5"
            >
              <span className="block">{camera.label}</span>
              <span className="block text-[10px] text-muted">{camera.hint}</span>
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Pacing">
        <Slider label="Reading pace" value={project.wpm} min={110} max={220} step={5} onChange={onWpm} display={`${project.wpm} wpm`} />
      </Section>

      <Section title="Quality">
        <div className="grid grid-cols-3 gap-1.5">
          {(['standard', 'high', 'ultra'] as const).map((quality) => (
            <Chip key={quality} active={project.quality === quality} onClick={() => onChange({ quality })} className="!px-2">
              {quality}
            </Chip>
          ))}
        </div>
        <div className="text-[10px] leading-relaxed text-muted">
          Higher quality uses more GPU and export bandwidth.
        </div>
      </Section>

      <Section title="Export">
        <div className="rounded-xl border border-line bg-surface-2 px-3 py-2.5">
          <div className="text-[13px] font-medium text-cream">3D movie</div>
          <div className="mt-1 text-[11px] leading-relaxed text-muted">
            Characters, environments and animation are selected from your story.
          </div>
        </div>
        {!supported && (
          <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-2 text-[11px] leading-relaxed text-red-200">
            This browser cannot record video from the current renderer. Use the latest Chrome or Edge.
          </div>
        )}
        {exportError && (
          <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-2 text-[11px] leading-relaxed text-red-200">
            {exportError}
          </div>
        )}
        {exporting ? (
          <Btn variant="outline" className="w-full !py-3" onClick={onCancelExport}>
            {webcodecsProgress !== null ? `Rendering ${Math.round(webcodecsProgress * 100)}%` : 'Stop render'}
          </Btn>
        ) : (
          <Btn variant="primary" className="w-full !py-3" onClick={onExport} disabled={!supported || !project.scenes.length}>
            Export video
          </Btn>
        )}
      </Section>
    </div>
  );
}
