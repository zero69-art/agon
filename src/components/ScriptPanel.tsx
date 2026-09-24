import { Clapperboard, Sparkles } from 'lucide-react';
import { DEMO_SCRIPT, DEMO_TITLE, splitText, wordCount } from '../lib/sceneBuilder';
import { formatTime } from '../lib/rng';
import type { Project } from '../lib/types';
import { Btn } from './ui';

interface Props {
  project: Project;
  dirty: boolean;
  onScript: (s: string) => void;
  onBuild: () => void;
  onLoadSample: (title: string, script: string) => void;
}

export function ScriptPanel({ project, dirty, onScript, onBuild, onLoadSample }: Props) {
  const words = wordCount(project.script);
  const sceneCount = splitText(project.script).length;
  const est = (words / project.wpm) * 60 + sceneCount * 1.4 + (project.introCard ? 3.2 : 0) + (project.outroCard ? 3.2 : 0);

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-tangerine">Story</div>
        <h2 className="mt-1 font-display text-xl font-bold tracking-tight">Write your movie</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">
          Write the story. Agon turns it into animated 3D scenes automatically.
        </p>
      </div>

      <div className="relative min-h-[260px] flex-1">
        <textarea
          value={project.script}
          onChange={(e) => onScript(e.target.value)}
          placeholder={'A fox walks through a quiet forest at sunset…\n\nThen a stranger appears.'}
          spellCheck={false}
          className="h-full min-h-[260px] w-full resize-none rounded-xl border border-line bg-surface-2 p-3.5 font-body text-[14px] leading-relaxed text-cream placeholder:text-dim focus:border-line-2 focus:outline-none"
        />
        {!project.script.trim() && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <Btn variant="ghost" onClick={() => onLoadSample(DEMO_TITLE, DEMO_SCRIPT)} className="pointer-events-auto !py-1.5 text-xs">
              <Sparkles size={13} /> Use sample story
            </Btn>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between font-mono text-[10px] text-muted">
        <span>{words} words · {sceneCount} scenes</span>
        <span>≈ {formatTime(est)}</span>
      </div>

      <Btn variant="primary" onClick={onBuild} disabled={!project.script.trim()} className="w-full !py-3">
        <Clapperboard size={16} />
        {project.scenes.length ? 'Update movie' : 'Build movie'}
      </Btn>

      {dirty && <p className="-mt-1 text-[11px] text-tangerine">Script changed. Build the movie again to update the preview.</p>}
    </div>
  );
}
