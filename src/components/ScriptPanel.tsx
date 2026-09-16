import { Clapperboard, Shuffle, Sparkles, Wand2 } from 'lucide-react';
import { DEMO_SCRIPT, DEMO_TITLE, splitText, wordCount } from '../lib/sceneBuilder';
import { formatTime } from '../lib/rng';
import type { Project } from '../lib/types';
import { Btn } from './ui';

interface Props {
  project: Project;
  dirty: boolean;
  onScript: (s: string) => void;
  onBuild: () => void;
  onShuffle: () => void;
  onLoadSample: (title: string, script: string) => void;
  onGoForge: () => void;
}

export function ScriptPanel({ project, dirty, onScript, onBuild, onShuffle, onLoadSample, onGoForge }: Props) {
  const words = wordCount(project.script);
  const sceneCount = splitText(project.script).length;
  const est = (words / project.wpm) * 60 + sceneCount * 1.4 + (project.introCard ? 3.2 : 0) + (project.outroCard ? 3.2 : 0);

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div>
        <h2 className="font-display text-lg font-bold tracking-tight">Script</h2>
        <p className="text-[13px] leading-snug text-muted">
          Every sentence or line becomes an animated scene. Words like <span className="text-cream/80">ocean</span>, <span className="text-cream/80">forest</span>,{' '}
          <span className="text-cream/80">city</span>, <span className="text-cream/80">stars</span> or <span className="text-cream/80">love</span> pick the visuals automatically.
        </p>
        <p className="mt-2 rounded-lg border border-tangerine/20 bg-tangerine/5 px-2.5 py-2 text-[12px] leading-snug text-tangerine/90">
          Dialogue tip: write <span className="font-mono">MAYA: We should go.</span> to show a speaker label and read only the spoken line aloud.
        </p>
      </div>
      <div className="relative flex min-h-[220px] flex-1 flex-col">
        <textarea
          value={project.script}
          onChange={(e) => onScript(e.target.value)}
          placeholder={'Once upon a time, in a city that never slept…\n\nWrite as much as you like — there is no limit.'}
          spellCheck={false}
          className="h-full min-h-[220px] w-full flex-1 resize-none rounded-xl border border-line bg-surface-2 p-3.5 font-body text-[14px] leading-relaxed text-cream placeholder:text-dim focus:border-line-2 focus:outline-none"
        />
        {!project.script.trim() && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <div className="pointer-events-auto flex gap-2">
              <Btn variant="ghost" onClick={() => onLoadSample(DEMO_TITLE, DEMO_SCRIPT)} className="!py-1.5 text-xs">
                <Sparkles size={14} /> Load sample
              </Btn>
              <Btn variant="ghost" onClick={onGoForge} className="!py-1.5 text-xs">
                <Wand2 size={14} /> Generate a story
              </Btn>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between font-mono text-[11px] text-muted">
        <span>
          {words} words · {sceneCount} scene{sceneCount === 1 ? '' : 's'}
        </span>
        <span>≈ {formatTime(est)} runtime</span>
      </div>
      <div className="flex gap-2">
        <Btn variant="primary" onClick={onBuild} disabled={!project.script.trim()} className="flex-1 relative">
          <Clapperboard size={16} />
          {project.scenes.length ? 'Rebuild scenes' : 'Build scenes'}
          {dirty && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-mint ring-2 ring-ink" />}
        </Btn>
        <Btn variant="ghost" onClick={onShuffle} disabled={!project.scenes.length} title="Randomize every scene's look">
          <Shuffle size={16} /> Shuffle looks
        </Btn>
      </div>
      {dirty && <p className="-mt-1 text-[12px] text-mint/90">Script changed since the last build — rebuild to update the scenes.</p>}
    </div>
  );
}
