export interface Palette {
  name: string;
  bg: [string, string];
  accent: string;
  accent2: string;
  text: string;
}

export const PALETTES: Palette[] = [
  { name: 'Midnight', bg: ['#0b1026', '#1b1f4a'], accent: '#7c8cff', accent2: '#ff7ad9', text: '#ffffff' },
  { name: 'Ember', bg: ['#1a0a05', '#4a1a0a'], accent: '#ff7a1a', accent2: '#ffd166', text: '#fff4e6' },
  { name: 'Forest', bg: ['#05140d', '#0f3d2a'], accent: '#5ee69a', accent2: '#c6f5a3', text: '#eefff4' },
  { name: 'Ocean', bg: ['#031a2b', '#0a4d6e'], accent: '#37c9ff', accent2: '#8df5ff', text: '#f0fbff' },
  { name: 'Candy', bg: ['#2a0a2e', '#5a1a5e'], accent: '#ff5fa2', accent2: '#ffd1f0', text: '#fff0fa' },
  { name: 'Dawn', bg: ['#2b1b3d', '#8e4544'], accent: '#ffb86b', accent2: '#ffe3b3', text: '#fff8f0' },
  { name: 'Noir', bg: ['#0a0a0a', '#2a2a2a'], accent: '#ffffff', accent2: '#bdbdbd', text: '#ffffff' },
  { name: 'Lemon', bg: ['#fff3b0', '#ffd23f'], accent: '#ff5c35', accent2: '#1a1a1a', text: '#1a1a1a' },
  { name: 'Paper', bg: ['#f7f1e3', '#e8dcc2'], accent: '#c0392b', accent2: '#2c3e50', text: '#2b2b2b' },
  { name: 'Neon', bg: ['#06000f', '#1a0033'], accent: '#00ffd1', accent2: '#ff00c8', text: '#ffffff' },
];

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `#${c.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`;
}

export function shade(hex: string, t: number): string {
  return mix(hex, '#000000', t);
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function isLight(pal: Palette): boolean {
  return luminance(pal.bg[0]) > 0.5;
}
