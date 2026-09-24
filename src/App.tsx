import { useCallback, useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { ScriptPanel } from './components/ScriptPanel';
import { Preview } from './components/Preview';
import { Timeline } from './components/Timeline';
import { SimpleControls } from './components/SimpleControls';
import { Player, useMediaQuery } from './lib/player';
import { music } from './lib/music';
import { useVideoExport } from './lib/useVideoExport';
import { blankProject, buildScenes, createProject, retimeScenes } from './lib/sceneBuilder';
import { loadCurrent, saveCurrent } from './lib/storage';
import { totalDuration } from './lib/timeline';
import type { ExportedClip, Project } from './lib/types';

export default function App() {
  const playerRef = useRef<Player | null>(null);
  if (!playerRef.current) playerRef.current = new Player();
  const player = playerRef.current;

  const [project, setProject] = useState<Project>(() => loadCurrent() ?? createProject());
  const [builtScript, setBuiltScript] = useState(() => project.script);
  const [selectedId, setSelectedId] = useState<string | null>(() => project.scenes[0]?.id ?? null);
  const [, setClips] = useState<ExportedClip[]>([]);
  const [playing, setPlaying] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const projectRef = useRef(project);
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const videoExport = useVideoExport({
    project,
    projectRef,
    player,
    canvasRef,
    isDesktop,
    setRightTab: () => {},
    setMobileTab: () => {},
    setClips,
  });

  const { exporting, exportError, startExport, cancelExport, recorderRef, webcodecsProgress } = videoExport;

  useEffect(() => {
    const id = window.setTimeout(() => saveCurrent(project), 400);
    return () => window.clearTimeout(id);
  }, [project]);

  useEffect(() => player.subscribe(() => setPlaying(player.playing)), [player]);

  useEffect(() => {
    if (playing) music.start(project.music);
    else music.stop();
  }, [playing, project.music]);

  useEffect(() => {
    music.setVolume(project.musicVolume);
  }, [project.musicVolume]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden && exporting && !videoExport.preferWebCodecs) {
        cancelExport();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [cancelExport, exporting, videoExport.preferWebCodecs]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || exporting) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (player.time >= totalDuration(projectRef.current) && !player.playing) player.seek(0);
        player.toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [player, exporting]);

  const update = useCallback((patch: Partial<Project>) => {
    setProject((p) => ({ ...p, ...patch, updatedAt: Date.now() }));
  }, []);

  const loadScript = (title: string, script: string) => {
    const scenes = buildScenes(script, project.wpm, project.basePalette);
    update({ title, script, scenes });
    setBuiltScript(script);
    setSelectedId(scenes[0]?.id ?? null);
    player.pause();
    player.seek(0);
  };

  const buildFromScript = () => {
    const scenes = buildScenes(project.script, project.wpm, project.basePalette);
    update({ scenes });
    setBuiltScript(project.script);
    setSelectedId(scenes[0]?.id ?? null);
    player.pause();
    player.seek(0);
  };

  const setWpm = (wpm: number) => update({ wpm, scenes: retimeScenes(project.scenes, wpm) });

  const newProject = () => {
    const p = blankProject();
    setProject(p);
    setBuiltScript('');
    setSelectedId(null);
    player.pause();
    player.seek(0);
  };

  const onEnded = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      window.setTimeout(() => {
        if (rec.state !== 'inactive') {
          try {
            rec.requestData();
          } catch {
            // Some browsers do not support requestData during shutdown.
          }
          rec.stop();
        }
      }, 120);
    }
  }, [recorderRef]);

  const onCanvas = useCallback((c: HTMLCanvasElement | null) => {
    canvasRef.current = c;
  }, []);

  const dirty = project.script.trim() !== builtScript.trim();

  const exportVideo = () => {
    void startExport();
  };

  const headerProps = {
    title: project.title,
    onTitle: (title: string) => update({ title }),
    onNew: newProject,
    onExportVideo: exportVideo,
    exporting,
  };

  const lockClass = exporting ? 'pointer-events-none opacity-55' : '';

  if (isDesktop) {
    return (
      <div className="flex h-screen flex-col overflow-hidden text-cream">
        <Header {...headerProps} exportError={exportError} />
        <main className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)_280px]">
          <aside className={`min-h-0 overflow-y-auto border-r border-line bg-surface/35 ${lockClass}`}>
            <ScriptPanel
              project={project}
              dirty={dirty}
              onScript={(script) => update({ script })}
              onBuild={buildFromScript}
              onLoadSample={loadScript}
            />
          </aside>

          <section className="min-h-0 overflow-y-auto bg-ink px-5 py-5">
            <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4">
              <Preview project={project} player={player} onCanvas={onCanvas} onEnded={onEnded} exporting={exporting} />
              <Timeline project={project} player={player} selectedId={selectedId} onSelect={setSelectedId} disabled={exporting} />
            </div>
          </section>

          <aside className={`min-h-0 overflow-y-auto border-l border-line bg-surface/35 ${lockClass}`}>
            <SimpleControls
            project={project}
            onChange={update}
            onWpm={setWpm}
            onExport={exportVideo}
            onCancelExport={videoExport.cancelExport}
            exportError={videoExport.exportError}
            supported={videoExport.supported}
            exporting={exporting}
            webcodecsProgress={webcodecsProgress}
          />
          </aside>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-cream">
      <Header {...headerProps} compact />
      <main className="flex flex-col gap-3 p-3">
        <section className="rounded-2xl border border-line bg-surface/55">
          <ScriptPanel
            project={project}
            dirty={dirty}
            onScript={(script) => update({ script })}
            onBuild={buildFromScript}
            onLoadSample={loadScript}
          />
        </section>

        <Preview project={project} player={player} onCanvas={onCanvas} onEnded={onEnded} exporting={exporting} />

        <Timeline project={project} player={player} selectedId={selectedId} onSelect={setSelectedId} disabled={exporting} />

        <section className={`rounded-2xl border border-line bg-surface/55 ${lockClass}`}>
          <SimpleControls
            project={project}
            onChange={update}
            onWpm={setWpm}
            onExport={exportVideo}
            onCancelExport={cancelExport}
            exportError={exportError}
            supported={videoExport.supported}
            exporting={exporting}
            webcodecsProgress={webcodecsProgress}
          />
        </section>
      </main>
    </div>
  );
}
