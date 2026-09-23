export interface OmniRouteSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

export interface OmniRouteResponse {
  title: string;
  text: string;
  raw: string;
}

const STORAGE_KEY = 'agon.omniroute.settings';

export const DEFAULT_OMNIROUTE_SETTINGS: OmniRouteSettings = {
  baseUrl: 'http://localhost:20128',
  apiKey: '',
  model: 'auto',
  enabled: false,
};

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  return trimmed.replace(/\/v1$/, '');
}

export function loadOmniRouteSettings(): OmniRouteSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_OMNIROUTE_SETTINGS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_OMNIROUTE_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<OmniRouteSettings>;
    return {
      ...DEFAULT_OMNIROUTE_SETTINGS,
      ...parsed,
      baseUrl: normalizeBaseUrl(String(parsed.baseUrl ?? DEFAULT_OMNIROUTE_SETTINGS.baseUrl)),
    };
  } catch {
    return { ...DEFAULT_OMNIROUTE_SETTINGS };
  }
}

export function saveOmniRouteSettings(settings: OmniRouteSettings): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...settings,
    baseUrl: normalizeBaseUrl(settings.baseUrl),
  }));
}

function authHeaders(apiKey: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(apiKey.trim() ? { Authorization: 'Bearer ' + apiKey.trim() } : {}),
  };
}

async function request(path: string, init: RequestInit, settings: OmniRouteSettings): Promise<Response> {
  const url = normalizeBaseUrl(settings.baseUrl) + (path.startsWith('/') ? path : '/' + path);
  const response = await fetch(url, {
    ...init,
    headers: { ...authHeaders(settings.apiKey), ...(init.headers ?? {}) },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error('OmniRoute ' + response.status + ': ' + (body.slice(0, 240) || response.statusText));
  }
  return response;
}

export async function checkOmniRoute(settings: OmniRouteSettings): Promise<{ ok: boolean; message: string }> {
  try {
    await request('/api/health', { method: 'GET' }, settings);
    return { ok: true, message: 'OmniRoute is reachable.' };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'OmniRoute health check failed.' };
  }
}

export async function listOmniRouteModels(settings: OmniRouteSettings): Promise<string[]> {
  let lastError: unknown = null;
  for (const path of ['/api/v1/models', '/v1/models']) {
    try {
      const response = await request(path, { method: 'GET' }, settings);
      const json = (await response.json()) as { data?: Array<{ id?: string }> };
      return Array.isArray(json.data) ? json.data.map((item) => item.id).filter((id): id is string => Boolean(id)) : [];
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not load models from OmniRoute.');
}

function extractResponseText(json: unknown): string {
  if (!json || typeof json !== 'object') return '';
  const record = json as Record<string, unknown>;
  const choices = Array.isArray(record.choices) ? record.choices : [];
  const first = choices[0];
  if (first && typeof first === 'object') {
    const message = (first as Record<string, unknown>).message;
    if (message && typeof message === 'object') {
      const content = (message as Record<string, unknown>).content;
      if (typeof content === 'string') return content;
      if (Array.isArray(content)) return content.map((part) => part && typeof part === 'object' ? (part as Record<string, unknown>).text : '').filter((text): text is string => typeof text === 'string').join('');
    }
    const text = (first as Record<string, unknown>).text;
    if (typeof text === 'string') return text;
  }
  return typeof record.output_text === 'string' ? record.output_text : '';
}

function extractJsonBlock(value: string): string | null {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1];
  const first = value.indexOf('{');
  const last = value.lastIndexOf('}');
  return first >= 0 && last > first ? value.slice(first, last + 1) : null;
}

function fallbackTitle(text: string): string {
  const line = text.split(/\n+/).map((item) => item.trim()).find(Boolean);
  return line ? line.replace(/^title\s*:\s*/i, '').slice(0, 80) || 'Untitled Film' : 'Untitled Film';
}

export async function generateMovieWithOmniRoute(settings: OmniRouteSettings, prompt: string): Promise<OmniRouteResponse> {
  const model = settings.model.trim() && settings.model.trim() !== 'auto' ? settings.model.trim() : 'auto';
  const system = [
    'You are Agon\'s AI Movie Director.',
    'Return ORIGINAL animated-film material only. Do not imitate or reproduce copyrighted characters, voices, scripts, or exact visual identities from existing films.',
    'Create a character-driven 3D animation treatment with acting, natural dialogue, emotional reactions, visual continuity, cinematic shots, and clear scene progression.',
    'Respond with valid JSON only using this schema:',
    '{',
    '  "title": "string",',
    '  "screenplay": "string with paragraphs separated by blank lines"',
    '}',
    'The screenplay must be directly usable by Agon as scene text.',
  ].join('\n');
  const user = [
    'Create a production-ready animated movie treatment.',
    '',
    prompt.trim(),
    '',
    'Requirements:',
    '- Original characters and world.',
    '- Character-driven acting and reactions.',
    '- Dialogue should use SPEAKER: dialogue format when characters speak.',
    '- Include action, emotion, environment and camera-friendly visual beats.',
    '- Keep scenes distinct and easy to segment.',
    '- Do not mention these instructions in the screenplay.',
  ].join('\n');
  const response = await request('/api/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.8 }),
  }, settings);
  const json = await response.json();
  const raw = extractResponseText(json);
  if (!raw) throw new Error('OmniRoute returned an empty response.');
  const jsonBlock = extractJsonBlock(raw);
  if (jsonBlock) {
    try {
      const parsed = JSON.parse(jsonBlock) as { title?: unknown; screenplay?: unknown; text?: unknown };
      const text = typeof parsed.screenplay === 'string' ? parsed.screenplay : typeof parsed.text === 'string' ? parsed.text : '';
      if (text.trim()) return { title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : fallbackTitle(text), text: text.trim(), raw };
    } catch {
      // Fall through to plain-text mode.
    }
  }
  return { title: fallbackTitle(raw), text: raw.trim(), raw };
}