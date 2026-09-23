import { useCallback, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import fixWebmDuration from 'fix-webm-duration';
import { music } from './music';
import { totalDuration } from './timeline';
import { slugify, uid } from './rng';
import type { ExportedClip, Project } from './types';
import type { Player } from './player';
import { canUseWebCodecsExport, exportWithWebCodecs } from './webcodecsExport';

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? '';
}

export function useVideoExport(opts: {
  project: Project;
  projectRef: MutableRefObject<Project>;
  player: Player;
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  isDesktop: boolean;
  setRightTab: (t: 'export') => void;
  setMobileTab: (t: 'export') => void;
  setClips: Dispatch<SetStateAction<ExportedClip[]>>;
}) {
  const { project, projectRef, player, canvasRef, isDesktop, setRightTab, setMobileTab, setClips } = opts;
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [webcodecsProgress, setWebcodecsProgress] = useState<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const cancelRef = useRef(false);
  const exportAbortRef = useRef<AbortController | null>(null);
  const mime = useMemo(pickMime, []);
  const preferWebCodecs = useMemo(() => canUseWebCodecsExport(), []);
  const mediaRecorderSupported =
    typeof HTMLCanvasElement !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype && mime !== '';

  const finishExport = useCallback(
    async (chunks: Blob[], type: string) => {
      const p = projectRef.current;
      const total = totalDuration(p);
      let blob = new Blob(chunks, { type: type || 'video/webm' });
      if (blob.type.includes('webm')) {
        try {
          blob = await fixWebmDuration(blob, Math.round(total * 1000), { logger: false });
        } catch {
          /* keep */
        }
      }
      const url = URL.createObjectURL(blob);
      const clip: ExportedClip = {
        id: uid(),
        title: p.title || 'Untitled',
        url,
        size: blob.size,
        duration: total,
        mime: blob.type,
        createdAt: Date.now(),
      };
      setClips((c) => [clip, ...c]);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slugify(clip.title)}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    },
    [projectRef, setClips],
  );

  const startWebCodecsExport = useCallback(() => {
    if (!project.scenes.length || exporting) return;
    setExportError(null);
    setWebcodecsProgress(0);
    player.pause();
    player.seek(0);
    setExporting(true);
    setRightTab('export');
    if (!isDesktop) setMobileTab('export');
    const ac = new AbortController();
    exportAbortRef.current = ac;
    void exportWithWebCodecs(project, {
      fps: 30,
      signal: ac.signal,
      onProgress: (p) => setWebcodecsProgress(p.ratio),
    })
      .then((result) => {
        const url = URL.createObjectURL(result.blob);
        const clip: ExportedClip = {
          id: uid(),
          title: projectRef.current.title || 'Untitled',
          url,
          size: result.blob.size,
          duration: result.duration,
          mime: result.mime,
          createdAt: Date.now(),
        };
        setClips((c) => [clip, ...c]);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${slugify(clip.title)}.webm`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setExportError(err instanceof Error ? err.message : 'WebCodecs export failed');
      })
      .finally(() => {
        exportAbortRef.current = null;
        setExporting(false);
        setWebcodecsProgress(null);
      });
  }, [project, exporting, player, isDesktop, setRightTab, setMobileTab, projectRef, setClips]);

  const startExport = useCallback(() => {
    if (!project.scenes.length || exporting) return;
    if (preferWebCodecs) {
      startWebCodecsExport();
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas || !mediaRecorderSupported) return;
    if (document.hidden) {
      setExportError('Bring this tab to the front, then start render. Hidden tabs are throttled and produce broken video.');
      setRightTab('export');
      if (!isDesktop) setMobileTab('export');
      return;
    }
    setExportError(null);
    player.pause();
    player.setLoop(false);
    player.seek(0);
    if (project.music !== 'none') music.start(project.music);
    const stream = canvas.captureStream(30);
    if (project.music !== 'none') {
      music.audioStream?.getAudioTracks().forEach((t) => stream.addTrack(t));
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
    rec.onerror = () => {
      cancelRef.current = true;
      player.pause();
      setExportError('The browser stopped recording. Try Standard or High quality, then export again in Chrome or Edge.');
      if (rec.state !== 'inactive') rec.stop();
    };
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      recorderRef.current = null;
      setExporting(false);
      if (!cancelRef.current) {
        if (!chunks.length) setExportError('No video frames were captured. Keep the preview tab visible and try again.');
        else void finishExport(chunks, rec.mimeType || mime);
      }
    };
    recorderRef.current = rec;
    setExporting(true);
    setRightTab('export');
    if (!isDesktop) setMobileTab('export');
    rec.start(500);
    window.setTimeout(() => {
      if (!cancelRef.current && !document.hidden) player.play();
    }, 120);
  }, [
    project,
    exporting,
    preferWebCodecs,
    startWebCodecsExport,
    canvasRef,
    mediaRecorderSupported,
    isDesktop,
    setRightTab,
    setMobileTab,
    player,
    mime,
    finishExport,
  ]);

  const cancelExport = useCallback(() => {
    cancelRef.current = true;
    exportAbortRef.current?.abort();
    exportAbortRef.current = null;
    player.pause();
    player.seek(0);
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    else setExporting(false);
    setWebcodecsProgress(null);
  }, [player]);

  return {
    exporting,
    exportError,
    webcodecsProgress,
    preferWebCodecs,
    supported: mediaRecorderSupported || preferWebCodecs,
    mime: preferWebCodecs ? 'video/webm;codecs=vp9' : mime,
    startExport,
    cancelExport,
    recorderRef,
  };
}
