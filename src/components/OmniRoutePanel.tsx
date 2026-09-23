import { useEffect, useState } from 'react';
import { Check, CircleAlert, Loader2, Radio, RefreshCw, Settings2 } from 'lucide-react';
import { Btn, Section } from './ui';
import { checkOmniRoute, listOmniRouteModels, loadOmniRouteSettings, saveOmniRouteSettings, type OmniRouteSettings } from '../lib/omniRoute';

interface Props {
  onGenerate: (settings: OmniRouteSettings) => Promise<void>;
  busy: boolean;
}

export function OmniRoutePanel({ onGenerate, busy }: Props) {
  const [settings, setSettings] = useState<OmniRouteSettings>(() => loadOmniRouteSettings());
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [models, setModels] = useState<string[]>([]);
  useEffect(() => { saveOmniRouteSettings(settings); }, [settings]);
  const patch = (next: Partial<OmniRouteSettings>) => { setSettings((current) => ({ ...current, ...next })); setStatus(null); };
  const check = async () => setStatus(await checkOmniRoute(settings));
  const loadModels = async () => {
    try {
      setStatus({ ok: true, message: 'Loading models…' });
      const next = await listOmniRouteModels(settings);
      setModels(next);
      setStatus({ ok: true, message: next.length ? next.length + ' models available.' : 'Connected, but no models were returned.' });
    } catch (error) {
      setStatus({ ok: false, message: error instanceof Error ? error.message : 'Could not load models.' });
    }
  };
  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2"><Radio size={15} className={settings.enabled ? 'text-mint' : 'text-muted'} /><div className="font-semibold text-cream">OmniRoute AI</div><span className="rounded-full border border-mint/25 bg-mint/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-mint">OpenAI-compatible</span></div>
          <p className="text-xs leading-relaxed text-muted">Optional local/self-hosted AI director. The offline story generator remains the fallback.</p>
        </div>
        <button type="button" onClick={() => patch({ enabled: !settings.enabled })} className={settings.enabled ? 'rounded-lg border border-mint/40 bg-mint/10 px-3 py-1.5 text-[11px] font-semibold text-mint' : 'rounded-lg border border-line px-3 py-1.5 text-[11px] font-semibold text-muted'}>{settings.enabled ? 'Enabled' : 'Disabled'}</button>
      </div>
      <Section title="Connection">
        <div className="space-y-2">
          <label className="block"><span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.18em] text-muted">Base URL</span><input value={settings.baseUrl} onChange={(e) => patch({ baseUrl: e.target.value })} placeholder="http://localhost:20128" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-cream placeholder:text-dim focus:border-line-2 focus:outline-none" /></label>
          <label className="block"><span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.18em] text-muted">API key (optional for local setups)</span><input type="password" value={settings.apiKey} onChange={(e) => patch({ apiKey: e.target.value })} placeholder="sk-…" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-cream placeholder:text-dim focus:border-line-2 focus:outline-none" /></label>
          <div className="grid grid-cols-[1fr_auto] gap-2"><select value={settings.model} onChange={(e) => patch({ model: e.target.value })} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-cream focus:border-line-2 focus:outline-none"><option value="auto/quality">auto/quality · let OmniRoute choose</option>{models.map((model) => <option key={model} value={model}>{model}</option>)}</select><Btn variant="ghost" onClick={loadModels} title="Load models"><RefreshCw size={15} /></Btn></div>
          <div className="flex flex-wrap gap-2"><Btn variant="ghost" onClick={check}><Settings2 size={14} /> Test connection</Btn>{status && <div className={status.ok ? 'inline-flex items-center gap-1.5 rounded-lg border border-mint/30 bg-mint/10 px-2.5 py-1.5 text-[11px] text-mint' : 'inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-300'}>{status.ok ? <Check size={13} /> : <CircleAlert size={13} />}{status.message}</div>}</div>
        </div>
      </Section>
      <Btn variant="primary" onClick={() => void onGenerate(settings)} disabled={!settings.enabled || busy}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Radio size={15} />}{busy ? 'Director is writing…' : 'Generate with OmniRoute'}</Btn>
    </div>
  );
}