import { useState } from 'react';
import { ArrowRight, Dices, RefreshCw, Wand2 } from 'lucide-react';
import { GENRES, LENGTHS, TONES, generateStory, type Genre, type Length, type StoryResult, type Tone } from '../lib/storyGen';
import { formatTime } from '../lib/rng';
import { Btn, Chip, Section } from './ui';

interface Props {
  onUse: (title: string, text: string) => void;
}

export function StoryForge({ onUse }: Props) {
  const [genre, setGenre] = useState<Genre | 'random'>('fantasy');
  const [tone, setTone] = useState<Tone>('hopeful');
  const [length, setLength] = useState<Length>('medium');
  const [hero, setHero] = useState('');
  const [spark, setSpark] = useState('');
  const [result, setResult] = useState<StoryResult | null>(null);
  const [spinning, setSpinning] = useState(false);

  const forge = () => {
    setSpinning(true);
    window.setTimeout(() => {
      setResult(generateStory({ genre, tone, length, hero, spark }));
      setSpinning(false);
    }, 220);
  };

  const est = result ? (result.words / 165) * 60 + result.paragraphs * 1.6 + 6.4 : 0;

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div>
        <h2 className="font-display text-lg font-bold tracking-tight">Story Forge</h2>
        <p className="text-[13px] leading-snug text-muted">No idea yet? Pick a flavor and forge an original story, then send it straight to the studio.</p>
      </div>

      <Section title="Genre">
        <div className="flex flex-wrap gap-1.5">
          <Chip active={genre === 'random'} onClick={() => setGenre('random')}>
            🎲 Surprise me
          </Chip>
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
              <Chip key={t.id} active={tone === t.id} onClick={() => setTone(t.id)}>
                {t.label}
              </Chip>
            ))}
          </div>
        </Section>
        <Section title="Length">
          <div className="flex flex-wrap gap-1.5">
            {LENGTHS.map((l) => (
              <Chip key={l.id} active={length === l.id} onClick={() => setLength(l.id)} title={l.hint}>
                {l.label}
              </Chip>
            ))}
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Hero name</span>
          <input
            value={hero}
            onChange={(e) => setHero(e.target.value)}
            placeholder="optional"
            className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-cream placeholder:text-dim focus:border-line-2 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">The spark</span>
          <input
            value={spark}
            onChange={(e) => setSpark(e.target.value)}
            placeholder="a broken compass…"
            className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-cream placeholder:text-dim focus:border-line-2 focus:outline-none"
          />
        </label>
      </div>

      <div className="flex gap-2">
        <Btn variant="primary" onClick={forge} className="flex-1">
          {result ? <RefreshCw size={16} className={spinning ? 'animate-spin' : ''} /> : <Wand2 size={16} className={spinning ? 'animate-pulse' : ''} />}
          {result ? 'Forge another' : 'Forge a story'}
        </Btn>
        {result && (
          <Btn variant="ghost" onClick={() => setResult(generateStory({ genre: result.genre, tone, length, hero, spark }))} title="Same genre, new roll">
            <Dices size={16} />
          </Btn>
        )}
      </div>

      {result && (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex min-h-[200px] flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface-2">
            <div className="border-b border-line px-4 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-tangerine">
                {GENRES.find((g) => g.id === result.genre)?.label} · {result.paragraphs} scenes · {result.words} words · ≈{formatTime(est)}
              </div>
              <div className="font-display text-lg font-bold leading-tight text-cream">{result.title}</div>
            </div>
            <div className="story-scroll flex-1 overflow-y-auto px-4 py-3 text-[13.5px] leading-relaxed text-cream/85">
              {result.text.split('\n\n').map((p, i) => (
                <p key={i} className="mb-3 last:mb-0">
                  {p}
                </p>
              ))}
            </div>
          </div>
          <Btn variant="mint" onClick={() => onUse(result.title, result.text)} className="w-full">
            Send to studio <ArrowRight size={16} />
          </Btn>
        </div>
      )}
    </div>
  );
}
