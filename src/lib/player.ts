import { useEffect, useState } from 'react';

export class Player {
  time = 0;
  playing = false;
  loop = false;
  narration = false;
  private listeners = new Set<() => void>();

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  emit(): void {
    this.listeners.forEach((fn) => fn());
  }

  play(): void {
    this.playing = true;
    this.emit();
  }

  pause(): void {
    this.playing = false;
    this.emit();
  }

  toggle(): void {
    if (this.playing) this.pause();
    else this.play();
  }

  seek(t: number): void {
    this.time = Math.max(0, t);
    this.emit();
  }

  setLoop(v: boolean): void {
    this.loop = v;
    this.emit();
  }

  setNarration(v: boolean): void {
    this.narration = v;
    if (!v && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    this.emit();
  }
}

/** Re-renders the calling component whenever the player emits. */
export function usePlayer(player: Player): Player {
  const [, force] = useState(0);
  useEffect(() => player.subscribe(() => force((x) => x + 1)), [player]);
  return player;
}

export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : true));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const fn = () => setMatch(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, [query]);
  return match;
}
