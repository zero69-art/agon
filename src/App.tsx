import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Film, Library, Music2, Palette, SlidersHorizontal, Wand2 } from 'lucide-react';
import fixWebmDuration from 'fix-webm-duration';
import { Header } from './components/Header';
import { ScriptPanel } from './components/ScriptPanel';
import { StoryForge } from './components/StoryForge';
import { LibraryPanel } from './components/LibraryPanel';
import { Preview } from './components/Preview';
import { Timeline } from './components/Timeline';
import { StylePanel } from './components/StylePanel';
import { ScenePanel } from './components/ScenePanel';
import { MusicPanel } from './components/MusicPanel';
import { ExportPanel } from './components/ExportPanel';
import { TabBar } from './components/ui';
import { Player, useMediaQuery } from './lib/player';
import { music } from './lib/music';
import { blankProject, buildScenes, createProject, makeScene, randomizeScene, retimeScenes } from './lib/sceneBuilder';
import { loadCurrent, loadLibrary, removeFromLibrary, saveCurrent, saveToLibrary } from './lib/storage';
import { totalDuration } from './lib/timeline';
import { slugify, uid } from './lib/rng';
import type { ExportedClip, Project, Scene } from './lib/types';

type LeftTab = 'script' | 'forge' | 'library';
type RightTab = 'look' | 'scene' | 'sound' | 'export';
type MobileTab = LeftTab | RightTab;

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? '';
}

export default function App() {
  const playerRef = useRef<Player | null>(null);
  if (!playerRef.current) playerRef.current = new Player();
  const player = playerRef.current;

  const [project, setProject] = useState<Project>(() => loadCurrent() ?? createProject());
  const [builtScript, setBuiltScript] = useState(() => project.script);
  const [selectedId, setSelectedId] = useState<string | null>(() => project.scenes[0]?.id ?? null);
  const [library, setLibrary] = useState<Project[]>(() => loadLibrary());
  const [clips, setClips] = useState<ExportedClip[]>([]);
  const [leftTab, setLeftTab] = useState<LeftTab>('script');
  const [rightTab, setRightTab] = useState<RightTab>('look');
  const [mobileTab, setMobileTab] = useState<MobileTab>('script');
  const [exporting, setExporting] = useState(false);
  const [musicPreview, setMusicPreview] = useState(false);
  const [saved, setSaved] = useState(false);
  const [playing, setPlaying] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const cancelRef = useRef(false);
  const projectRef = useRef(project);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const mime = useMemo(pickMime, []);
  const supported = typeof HTMLCanvasElement !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype && mime !== '';

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  // autosave
  useEffect(() => {
    const id = window.setTimeout(() => saveCurrent(project), 400);
    return () => window.clearTimeout(id);
  }, [project]);

  // track play state
  useEffect(() => player.subscribe(() => setPlaying(player.playing)), [player]);

  // music follows playback (or audition)
  useEffect(() => {
    if (playing || musicPreview) music.start(project.music);
    else music.stop();
  }, [playing, musicPreview, project.music]);

  useEffect(() => {
    music.setVolume(project.musicVolume);
  }, [project.musicVolume]);

  // keyboard: space toggles play when not typing
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

  const updateScene = useCallback((id: string, patch: Partial<Scene>) => {
    setProject((p) => ({ ...p, scenes: p.scenes.map((s) => (s.id === id ? { ...s, ...patch } : s)), updatedAt: Date.now() }));
  }, []);

  const selectScene = (id: string) => {
    setSelectedId(id);
    setRightTab('scene');
    if (!isDesktop) setMobileTab('scene');
  };

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

  const shuffleLooks = () => update({ scenes: project.scenes.map(randomizeScene) });

  const setWpm = (wpm: number) => update({ wpm, scenes: retimeScenes(project.scenes, wpm) });

  const paletteAll = (i: number) => update({ basePalette: i, scenes: project.scenes.map((s) => ({ ...s, palette: i })) });

  const deleteScene = (id: string) => {
    const idx = project.scenes.findIndex((s) => s.id === id);
    const scenes = project.scenes.filter((s) => s.id !== id);
    update({ scenes });
    setSelectedId(scenes[Math.min(idx, scenes.length - 1)]?.id ?? null);
  };

  const moveScene = (id: string, dir: -1 | 1) => {
    const idx = project.scenes.findIndex((s) => s.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= project.scenes.length) return;
    const scenes = [...project.scenes];
    [scenes[idx], scenes[j]] = [scenes[j], scenes[idx]];
    update({ scenes });
  };

  const addAfter = (id: string) => {
    const idx = project.scenes.findIndex((s) => s.id === id);
    const s = makeScene('A new scene. Write something here.', idx + 1, project.wpm, project.basePalette);
    const scenes = [...project.scenes];
    scenes.splice(idx + 1, 0, s);
    update({ scenes });
    setSelectedId(s.id);
  };

  const randomizeOne = (id: string) => {
    const s = project.scenes.find((x) => x.id === id);
    if (s) updateScene(id, randomizeScene(s));
  };

  const save = () => {
    setLibrary(saveToLibrary(project));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const newProject = () => {
    const p = blankProject();
    setProject(p);
    setBuiltScript('');
    setSelectedId(null);
    player.pause();
    player.seek(0);
    setLeftTab('script');
    setMobileTab('script');
  };

  const loadProject = (p: Project) => {
    const copy: Project = JSON.parse(JSON.stringify(p));
    setProject(copy);
    setBuiltScript(copy.script);
    setSelectedId(copy.scenes[0]?.id ?? null);
    player.pause();
    player.seek(0);
    if (!isDesktop) setMobileTab('script');
  };

  const deleteFromLibrary = (id: string) => setLibrary(removeFromLibrary(id));

  /* ------------------------------------------------------------ export */

  const finishExport = useCallback(
    async (chunks: Blob[], type: string) => {
      const p = projectRef.current;
      const total = totalDuration(p);
      let blob = new Blob(chunks, { type: type || 'video/webm' });
      if (blob.type.includes('webm')) {
        try {
          blob = await fixWebmDuration(blob, Math.round(total * 1000), { logger: false });
        } catch {
          /* keep original */
        }
      }
      const url = URL.createObjectURL(blob);
      const clip: ExportedClip = { id: uid(), title: p.title || 'Untitled', url, size: blob.size, duration: total, mime: blob.type, createdAt: Date.now() };
      setClips((c) => [clip, ...c]);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slugify(clip.title)}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    },
    [],
  );

  const startExport = () => {
    const canvas = canvasRef.current;
    if (!canvas || !supported || !project.scenes.length || exporting) return;
    setMusicPreview(false);
    player.pause();
    player.setLoop(false);
    player.seek(0);
    const stream = canvas.captureStream(30);
    if (project.music !== 'none') {
      const audio = music.audioStream;
      audio?.getAudioTracks().forEach((t) => stream.addTrack(t));
    }
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: project.quality === 'ultra' ? 45_000_000 : project.quality === 'high' ? 14_000_000 : 7_000_000,
        audioBitsPerSecond: 160_000,
      });
    } catch {
      rec = new MediaRecorder(stream);
    }
    const chunks: Blob[] = [];
    cancelRef.current = false;
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      recorderRef.current = null;
      setExporting(false);
      if (!cancelRef.current) void finishExport(chunks, rec.mimeType || mime);
    };
    recorderRef.current = rec;
    setExporting(true);
    setRightTab('export');
    rec.start(500);
    // give the recorder a beat to attach before motion starts
    window.setTimeout(() => player.play(), 120);
  };

  const cancelExport = () => {
    cancelRef.current = true;
    player.pause();
    player.seek(0);
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    else setExporting(false);
  };

  const onEnded = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      window.setTimeout(() => {
        if (rec.state !== 'inactive') rec.stop();
      }, 400);
    }
  }, []);

  const onCanvas = useCallback((c: HTMLCanvasElement | null) => {
    canvasRef.current = c;
  }, []);

  /* ------------------------------------------------------------ render */

  const selectedScene = project.scenes.find((s) => s.id === selectedId) ?? null;
  const dirty = project.script.trim() !== builtScript.trim();

  const leftPanel = (tab: LeftTab) =>
    tab === 'script' ? (
      <ScriptPanel
        project={project}
        dirty={dirty}
        onScript={(script) => update({ script })}
        onBuild={buildFromScript}
        onShuffle={shuffleLooks}
        onLoadSample={loadScript}
        onGoForge={() => {
          setLeftTab('forge');
          setMobileTab('forge');
        }}
      />
    ) : tab === 'forge' ? (
      <StoryForge
        onUse={(title, text) => {
          loadScript(title, text);
          setLeftTab('script');
          setMobileTab('script');
        }}
      />
    ) : (
      <LibraryPanel library={library} clips={clips} currentId={project.id} onLoad={loadProject} onDelete={deleteFromLibrary} />
    );

  const rightPanel = (tab: RightTab) =>
    tab === 'look' ? (
      <StylePanel project={project} onChange={update} onWpm={setWpm} onPaletteAll={paletteAll} />
    ) : tab === 'scene' ? (
      <ScenePanel project={project} scene={selectedScene} onChange={updateScene} onDelete={deleteScene} onMove={moveScene} onAddAfter={addAfter} onRandomize={randomizeOne} />
    ) : tab === 'sound' ? (
      <MusicPanel project={project} onChange={update} previewing={musicPreview} onPreview={setMusicPreview} />
    ) : (
      <ExportPanel
        project={project}
        player={player}
        exporting={exporting}
        supported={supported}
        mime={mime}
        latest={clips[0] ?? null}
        onChange={update}
        onStart={startExport}
        onCancel={cancelExport}
      />
    );

  const lockClass = exporting ? 'pointer-events-none opacity-50' : '';

  const leftTabs = [
    { id: 'script' as const, label: 'Script', icon: <BookOpen size={14} /> },
    { id: 'forge' as const, label: 'Story Forge', icon: <Wand2 size={14} /> },
    { id: 'library' as const, label: 'Library', icon: <Library size={14} /> },
  ];
  const rightTabs = [
    { id: 'look' as const, label: 'Look', icon: <Palette size={14} /> },
    { id: 'scene' as const, label: 'Scene', icon: <SlidersHorizontal size={14} /> },
    { id: 'sound' as const, label: 'Sound', icon: <Music2 size={14} /> },
    { id: 'export' as const, label: 'Export', icon: <Film size={14} /> },
  ];

  if (isDesktop) {
    return (
      <div className="flex h-screen flex-col overflow-hidden text-cream">
        <Header title={project.title} onTitle={(t) => update({ title: t })} onSave={save} onNew={newProject} saved={saved} />
        <main className="grid min-h-0 flex-1 grid-cols-[330px_minmax(0,1fr)_320px] xl:grid-cols-[370px_minmax(0,1fr)_350px]">
          <aside className={`flex min-h-0 flex-col border-r border-line bg-surface/60 ${lockClass}`}>
            <div className="p-3 pb-0">
              <TabBar tabs={leftTabs} value={leftTab} onChange={setLeftTab} />
            </div>
            <div className="panel-scroll min-h-0 flex-1 overflow-y-auto">{leftPanel(leftTab)}</div>
          </aside>

          <section className="panel-scroll flex min-h-0 flex-col gap-4 overflow-y-auto p-5">
            <Preview project={project} player={player} onCanvas={onCanvas} onEnded={onEnded} exporting={exporting} />
            <Timeline project={project} player={player} selectedId={selectedId} onSelect={selectScene} disabled={exporting} />
          </section>

          <aside className="flex min-h-0 flex-col border-l border-line bg-surface/60">
            <div className={`p-3 pb-0 ${lockClass}`}>
              <TabBar tabs={rightTabs} value={rightTab} onChange={setRightTab} className="[&_svg]:hidden xl:[&_svg]:block" />
            </div>
            <div className="panel-scroll min-h-0 flex-1 overflow-y-auto">
              <div className={rightTab === 'export' ? '' : lockClass}>{rightPanel(rightTab)}</div>
            </div>
          </aside>
        </main>
      </div>
    );
  }

  const mobileTabs = [...leftTabs.slice(0, 2), ...rightTabs, leftTabs[2]];
  const isLeft = (t: MobileTab): t is LeftTab => t === 'script' || t === 'forge' || t === 'library';

  return (
    <div className="flex min-h-screen flex-col text-cream">
      <Header title={project.title} onTitle={(t) => update({ title: t })} onSave={save} onNew={newProject} saved={saved} compact />
      <div className="flex flex-col gap-3 p-3">
        <Preview project={project} player={player} onCanvas={onCanvas} onEnded={onEnded} exporting={exporting} />
        <Timeline project={project} player={player} selectedId={selectedId} onSelect={selectScene} disabled={exporting} />
      </div>
      <div className={`sticky top-0 z-10 border-y border-line bg-ink/90 px-3 py-2 backdrop-blur ${lockClass}`}>
        <div className="flex gap-1 overflow-x-auto">
          {mobileTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMobileTab(t.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] ${
                mobileTab === t.id ? 'bg-cream text-ink font-semibold' : 'bg-surface-2 text-muted'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className={`flex-1 bg-surface/40 ${mobileTab === 'export' ? '' : lockClass}`}>{isLeft(mobileTab) ? leftPanel(mobileTab) : rightPanel(mobileTab)}</div>
    </div>
  );
}
