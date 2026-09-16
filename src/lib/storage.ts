import type { Project } from './types';

const LIB_KEY = 'fablereel.library.v1';
const CUR_KEY = 'fablereel.current.v1';

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Fills in fields introduced after a project may have been saved, so old saves keep working. */
function migrate(p: Project): Project {
  return {
    ...p,
    narrationVoice: p.narrationVoice ?? '',
    narrationRate: p.narrationRate ?? 1,
    narrationPitch: p.narrationPitch ?? 1,
    beatSync: p.beatSync ?? true,
  };
}

export function loadLibrary(): Project[] {
  return safeParse<Project[]>(localStorage.getItem(LIB_KEY), []).map(migrate);
}

export function saveToLibrary(project: Project): Project[] {
  const lib = loadLibrary().filter((p) => p.id !== project.id);
  lib.unshift({ ...project, updatedAt: Date.now() });
  try {
    localStorage.setItem(LIB_KEY, JSON.stringify(lib));
  } catch {
    /* storage full — ignore */
  }
  return lib;
}

export function removeFromLibrary(id: string): Project[] {
  const lib = loadLibrary().filter((p) => p.id !== id);
  localStorage.setItem(LIB_KEY, JSON.stringify(lib));
  return lib;
}

export function loadCurrent(): Project | null {
  const p = safeParse<Project | null>(localStorage.getItem(CUR_KEY), null);
  return p ? migrate(p) : null;
}

export function saveCurrent(project: Project): void {
  try {
    localStorage.setItem(CUR_KEY, JSON.stringify(project));
  } catch {
    /* ignore */
  }
}
