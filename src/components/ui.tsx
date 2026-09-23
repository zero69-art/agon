import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { PALETTES } from '../lib/palettes';

export function Section({ title, action, children, className = '' }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Chip({
  active,
  children,
  onClick,
  className = '',
  title,
  disabled,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-[13px] leading-tight transition-all disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tangerine ${
        active
          ? 'border-cream bg-cream text-ink font-semibold shadow-[0_6px_18px_-8px_rgba(244,239,228,0.6)]'
          : 'border-line bg-surface-2 text-cream/80 hover:border-line-2 hover:text-cream hover:bg-surface-3'
      } ${className}`}
    >
      {children}
    </button>
  );
}

type BtnVariant = 'primary' | 'ghost' | 'outline' | 'danger' | 'mint';

export function Btn({ variant = 'ghost', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tangerine';
  const v: Record<BtnVariant, string> = {
    primary: 'bg-tangerine text-ink hover:bg-tangerine-2 shadow-[0_10px_28px_-10px_rgba(255,106,43,0.75)]',
    mint: 'bg-mint text-ink hover:brightness-105 shadow-[0_10px_28px_-10px_rgba(182,245,200,0.6)]',
    ghost: 'bg-surface-2 text-cream hover:bg-surface-3 border border-line',
    outline: 'border border-line-2 text-cream hover:bg-surface-2',
    danger: 'bg-surface-2 text-red-300 hover:bg-red-500/15 border border-line',
  };
  return <button type="button" className={`${base} ${v[variant]} ${className}`} {...props} />;
}

export function IconBtn({ active, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-all disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tangerine ${
        active ? 'border-tangerine/60 bg-tangerine/15 text-tangerine' : 'border-line bg-surface-2 text-cream/75 hover:text-cream hover:bg-surface-3'
      } ${className}`}
      {...props}
    />
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-left hover:bg-surface-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tangerine"
    >
      <span>
        <span className="block text-sm text-cream">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-tangerine' : 'bg-line-2'}`} aria-hidden>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-cream transition-transform ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
      </span>
    </button>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display: string;
  disabled?: boolean;
}) {
  return (
    <label className={`block ${disabled ? 'opacity-50' : ''}`}>
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-cream/85">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-tangerine"
        aria-label={label}
      />
    </label>
  );
}

export function PaletteSwatches({ value, onChange, size = 'md' }: { value: number | null; onChange: (i: number) => void; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  return (
    <div className="flex flex-wrap gap-2" role="listbox" aria-label="Color palette">
      {PALETTES.map((p, i) => (
        <button
          key={p.name}
          type="button"
          title={p.name}
          aria-label={p.name}
          aria-selected={value === i}
          role="option"
          onClick={() => onChange(i)}
          className={`relative ${dim} rounded-lg border transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tangerine ${
            value === i ? 'border-cream ring-2 ring-cream/40 scale-105' : 'border-line hover:scale-105'
          }`}
          style={{ background: `linear-gradient(135deg, ${p.bg[0]}, ${p.bg[1]})` }}
        >
          <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full" style={{ background: p.accent }} />
        </button>
      ))}
    </div>
  );
}

export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
  className = '',
}: {
  tabs: { id: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (t: T) => void;
  className?: string;
}) {
  return (
    <div className={`flex gap-1 rounded-xl bg-surface-2 p-1 border border-line ${className}`} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          aria-label={t.label}
          onClick={() => onChange(t.id)}
          className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-[12.5px] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-tangerine ${
            value === t.id ? 'bg-surface-3 text-cream font-semibold shadow-sm' : 'text-muted hover:text-cream'
          }`}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}
