import { useMemo, useState } from 'react';
import { ArrowRight, Boxes, Clapperboard, Dices, Download, Film, RefreshCw, ScanFace, Volume2, Wand2 } from 'lucide-react';
import { GENRES, LENGTHS, TONES, generateStory, type Genre, type Length, type StoryResult, type Tone } from '../lib/storyGen';
import { formatTime } from '../lib/rng';
import { Btn, Chip, Section } from './ui';
import { OmniRoutePanel } from './OmniRoutePanel';
import { generateMovieWithOmniRoute, type OmniRouteSettings } from '../lib/omniRoute';

interface Props {
  onUse: (title: string, text: string) => void;
}

function escapeJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function makeDirectorManifest(result: StoryResult, genre: Genre, tone: Tone, length: Length) {
  const paragraphs = result.text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  return {
    version: 1,
    type: 'agon-3d-film-manifest',
    title: result.title,
    production: {
      genre,
      tone,
      length,
      fps: 30,
      aspect: '16:9',
      renderEngine: 'Blender',
      voiceMode: 'local-browser-or-exported-audio',
      animationMode: 'procedural-proxy + replaceable rigs',
    },
    characters: [
      {
        id: 'hero',
        name: result.title.split(/\s+/)[0] || 'Hero',
        role: 'protagonist',
        acting: ['curious', 'expressive', 'reactive'],
        facial: ['eyes', 'brows', 'jaw', 'mouth', 'blink'],
      },
      {
        id: 'support',
        name: 'Companion',
        role: 'supporting character',
        acting: ['responsive', 'contrasting emotion', 'gesture-driven'],
        facial: ['eyes', 'brows', 'jaw', 'mouth', 'blink'],
      },
    ],
    pipeline: [
      'screenplay',
      'scene segmentation',
      '3d scene proxy',
      'character blocking',
      'dialogue',
      'lip-sync cues',
      'facial acting',
      'camera direction',
      'lighting',
      'render',
      'edit',
    ],
    scenes: paragraphs.map((text, index) => ({
      id: `scene-${String(index + 1).padStart(3, '0')}`,
      text,
      shotPlan: [
        { shot: 1, framing: 'wide', camera: index % 2 === 0 ? 'push' : 'drift' },
        { shot: 2, framing: 'medium', camera: 'orbit' },
        { shot: 3, framing: 'close', camera: 'still' },
      ],
      acting: {
        hero: index % 3 === 0 ? 'curious' : index % 3 === 1 ? 'surprised' : 'determined',
        support: index % 2 === 0 ? 'alert' : 'amused',
      },
      director: {
        action: /\\b(run|running|chase|jump|leap|wave|fight|attack|dance|sit|kneel|point|reach|look|watch|talk|speak|walk|approach)\\b/i.exec(text)?.[1] ?? 'idle',
        emotion: /\\b(angry|sad|happy|excited|surprised|afraid|curious|determined|amused|alert)\\b/i.exec(text)?.[1] ?? 'neutral',
        characters: [/\\b(fox|bear|owl|rabbit|bunny|robot|android)\\b/gi].flatMap(() => {
          const found = Array.from(text.matchAll(/\\b(fox|bear|owl|rabbit|bunny|robot|android)\\b/gi)).map((m) => m[1].toLowerCase());
          return [...new Set(found)].slice(0, 2);
        }),
        speakingCharacter: text.match(/^\\s*([^:]{1,32}):/)?.[1]?.trim() ?? null,
      },
      dialogue: text.match(/[A-Z][A-Z0-9 _-]{1,20}:\s*[^.!?]+[.!?]?/g) ?? [],
    })),
  };
}

function downloadText(filename: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function StoryForge({ onUse }: Props) {
  const [genre, setGenre] = useState<Genre | 'random'>('fantasy');
  const [tone, setTone] = useState<Tone>('hopeful');
  const [length, setLength] = useState<Length>('medium');
  const [hero, setHero] = useState('');
  const [spark, setSpark] = useState('');
  const [result, setResult] = useState<StoryResult | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [showManifest, setShowManifest] = useState(false);
  const [omniBusy, setOmniBusy] = useState(false);
  const [omniError, setOmniError] = useState<string | null>(null);

  const forge = () => {
    setSpinning(true);
    window.setTimeout(() => {
      setResult(generateStory({ genre, tone, length, hero, spark }));
      setShowManifest(false);
      setSpinning(false);
    }, 220);
  };

  const est = result ? (result.words / 165) * 60 + result.paragraphs * 1.6 + 6.4 : 0;
  const manifest = useMemo(
    () => (result ? makeDirectorManifest(result, result.genre, tone, length) : null),
    [result, tone, length],
  );

  const downloadManifest = () => {
    if (!manifest || !result) return;
    downloadText(`${result.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'agon-film'}-3d-manifest.json`, escapeJson(manifest));
  };

  const generateWithOmniRoute = async (settings: OmniRouteSettings) => {
    setOmniBusy(true);
    setOmniError(null);

    const lengthHint = LENGTHS.find((item) => item.id === length)?.hint ?? '';
    const directorPrompt = [
      'Create an original character-driven animated 3D film.',
      'Genre: ' + (genre === 'random' ? 'adventure' : genre),
      'Tone: ' + tone,
      'Target length: ' + length + ' ' + lengthHint,
      hero.trim() ? 'Hero concept: ' + hero.trim() : 'Hero concept: invent a memorable original protagonist.',
      spark.trim() ? 'Story spark: ' + spark.trim() : 'Story spark: invent a strong visual story hook.',
      'Make the screenplay visually actionable for a 3D director.',
      'Give characters distinct personalities, physical acting, emotional reactions, natural dialogue and clear scene changes.',
      'Use SPEAKER: dialogue formatting for spoken lines.',
      'Avoid copying any existing movie, character or franchise.',
    ].join('\n');

    try {
      const generated = await generateMovieWithOmniRoute(settings, directorPrompt);
      const generatedText = generated.text.trim();
      const generatedWords = generatedText ? generatedText.split(/\s+/).length : 0;
      const paragraphs = generatedText.split(/\n+/).map((item) => item.trim()).filter(Boolean);

      setResult({
        title: generated.title,
        text: generatedText,
        genre: genre === 'random' ? 'adventure' : genre,
        seed: Date.now(),
        paragraphs: paragraphs.length,
        words: generatedWords,
      });
      setShowManifest(false);
    } catch (error) {
      setOmniError(error instanceof Error ? error.message : 'OmniRoute generation failed.');
    } finally {
      setOmniBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <Clapperboard size={17} className="text-tangerine" />
          <h2 className="font-display text-lg font-bold tracking-tight">3D Movie Director</h2>
          <span className="rounded-full border border-mint/25 bg-mint/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-mint">Free / local-first</span>
        </div>
        <p className="text-[13px] leading-snug text-muted">Forge an original film, then turn it into an editable 3D production plan with characters, acting, dialogue, lip-sync cues, shots and a Blender-ready manifest.</p>
      </div>

      <Section title="Story DNA">
        <div className="flex flex-wrap gap-1.5">
          <Chip active={genre === 'random'} onClick={() => setGenre('random')}>🎲 Surprise me</Chip>
          {GENRES.map((g) => (
            <Chip key={g.id} active={genre === g.id} onClick={() => setGenre(g.id)}>
              {g.emoji} {g.label}
            </Chip>
          ))}
        </div>
      </Section>

      <div className="grid grid-cols-2 gap-3">
        <Section title="Tone">
          <div className="flex flex-wrap gap-1.5">
            {TONES.map((t) => (
              <Chip key={t.id} active={tone === t.id} onClick={() => setTone(t.id)}>{t.label}</Chip>
            ))}
          </div>
        </Section>
        <Section title="Film length">
          <div className="flex flex-wrap gap-1.5">
            {LENGTHS.map((l) => (
              <Chip key={l.id} active={length === l.id} onClick={() => setLength(l.id)} title={l.hint}>{l.label}</Chip>
            ))}
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Hero</span>
          <input value={hero} onChange={(e) => setHero(e.target.value)} placeholder="young fox…" className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-cream placeholder:text-dim focus:border-line-2 focus:outline-none" />
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Story spark</span>
          <input value={spark} onChange={(e) => setSpark(e.target.value)} placeholder="a buried machine…" className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-cream placeholder:text-dim focus:border-line-2 focus:outline-none" />
        </label>
      </div>

      <div className="flex gap-2">
        <Btn variant="primary" onClick={forge} className="flex-1">
          {result ? <RefreshCw size={16} className={spinning ? 'animate-spin' : ''} /> : <Wand2 size={16} className={spinning ? 'animate-pulse' : ''} />}
          {result ? 'Forge another movie' : 'Generate movie'}
        </Btn>
        {result && <Btn variant="ghost" onClick={() => setResult(generateStory({ genre: result.genre, tone, length, hero, spark }))} title="Same genre, new roll"><Dices size={16} /></Btn>}
      </div>
      <OmniRoutePanel onGenerate={generateWithOmniRoute} busy={omniBusy} />

      {omniError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs leading-relaxed text-red-200">
          {omniError}
        </div>
      )

      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: 'Scenes', value: result.paragraphs, icon: Film },
              { label: 'Story words', value: result.words, icon: Wand2 },
              { label: '3D actors', value: 2, icon: ScanFace },
              { label: 'Shot types', value: 3, icon: Boxes },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-line bg-surface-2 p-3">
                <Icon size={14} className="mb-2 text-muted" />
                <div className="font-display text-lg font-bold text-cream">{value}</div>
                <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">{label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-tangerine">Director treatment · {result.paragraphs} scenes · ≈{formatTime(est)}</div>
                <div className="font-display text-lg font-bold leading-tight text-cream">{result.title}</div>
              </div>
              <button type="button" onClick={() => setShowManifest((v) => !v)} className="rounded-lg border border-line px-2.5 py-2 text-[11px] font-semibold text-muted hover:border-line-2 hover:text-cream">
                {showManifest ? 'Hide plan' : 'Show 3D plan'}
              </button>
            </div>
            <div className="story-scroll max-h-[250px] overflow-y-auto text-[13.5px] leading-relaxed text-cream/85">
              {result.text.split('\n\n').map((p, i) => <p key={i} className="mb-3 last:mb-0">{p}</p>)}
            </div>
          </div>

          {showManifest && manifest && (
            <div className="overflow-hidden rounded-xl border border-line bg-[#0a0b0d]">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-mint">Production manifest</div>
                  <div className="text-xs text-muted">Editable scene / acting / camera instructions for the 3D bridge</div>
                </div>
                <Btn variant="ghost" onClick={downloadManifest}><Download size={15} /> JSON</Btn>
              </div>
              <pre className="max-h-[340px] overflow-auto px-4 py-3 text-[10px] leading-relaxed text-cream/75">{escapeJson(manifest)}</pre>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface-2 p-3">
              <div className="mb-2 flex items-center gap-2 font-semibold text-cream"><ScanFace size={15} /> Acting + lip-sync</div>
              <p className="text-xs leading-relaxed text-muted">Every generated scene receives actor intent, emotion, facial channels, dialogue cues and shot-level blocking. Use the exported manifest as the control layer for real character rigs.</p>
            </div>
            <div className="rounded-xl border border-line bg-surface-2 p-3">
              <div className="mb-2 flex items-center gap-2 font-semibold text-cream"><Volume2 size={15} /> Voice + edit</div>
              <p className="text-xs leading-relaxed text-muted">Keep the browser voice workflow for previews, then attach local WAV/voice tracks in the exported Blender/FFmpeg workflow for production audio.</p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Btn variant="mint" onClick={() => onUse(result.title, result.text)} className="w-full">
              Send to studio <ArrowRight size={16} />
            </Btn>
            <Btn variant="ghost" onClick={downloadManifest} className="w-full">
              <Download size={16} /> Export 3D production plan
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
