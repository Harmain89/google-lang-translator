import { useEffect, useState } from 'react';
import { Eye, EyeOff, ExternalLink, Loader2, X, Zap, Cloud } from 'lucide-react';
import { cn } from '../lib/utils';
import type { AppSettings, EngineMode } from '../types';

interface SettingsModalProps {
  open: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (settings: AppSettings) => void;
}

const API_KEY_HELP_URL = 'https://console.cloud.google.com/marketplace/product/google/translate.googleapis.com';

export default function SettingsModal({ open, settings, onClose, onSave }: SettingsModalProps) {
  const [engineMode, setEngineMode] = useState<EngineMode>(settings.engineMode);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [revealKey, setRevealKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (open) {
      setEngineMode(settings.engineMode);
      setApiKey(settings.apiKey);
      setRevealKey(false);
      setKeyError(null);
      setTestResult(null);
      setTesting(false);
    }
  }, [open, settings]);

  if (!open) return null;

  const save = () => {
    if (engineMode === 'cloud' && !apiKey.trim()) {
      setKeyError('An API key is required for Cloud API mode.');
      return;
    }
    onSave({ engineMode, apiKey: apiKey.trim() });
  };

  const testKey = async () => {
    if (!apiKey.trim()) {
      setTestResult({ ok: false, message: 'Enter an API key first.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    const result = await (window.electronAPI?.checkApiKey(apiKey.trim()) ?? {
      ok: false,
      message: 'Only available in the desktop app.',
    });
    setTesting(false);
    setTestResult(result);
  };

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative mx-4 w-full max-w-md animate-fade-in-scale rounded-2xl border border-line bg-panel shadow-2xl shadow-black/30">
        <header className="flex h-14 items-center justify-between border-b border-line px-5">
          <span className="text-[14px] font-semibold text-ink">Settings</span>
          <button
            type="button"
            title="Close"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-panel-2 hover:text-ink"
          >
            <X size={15} />
          </button>
        </header>

        <div className="px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
            Translation engine
          </p>

          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setEngineMode('gtx');
                setKeyError(null);
              }}
              className={cn(
                'flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-colors duration-150',
                engineMode === 'gtx'
                  ? 'border-accent bg-accent-soft ring-2 ring-accent/15'
                  : 'border-line hover:border-ink-3/40'
              )}
            >
              <span className="flex items-center gap-2">
                <Zap size={15} className={engineMode === 'gtx' ? 'text-accent' : 'text-ink-3'} />
                <span className="text-[13px] font-semibold text-ink">Free GTX</span>
              </span>
              <span className="text-[11.5px] leading-relaxed text-ink-3">
                Zero setup. Instant translations, completely free.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setEngineMode('cloud')}
              className={cn(
                'flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-colors duration-150',
                engineMode === 'cloud'
                  ? 'border-accent bg-accent-soft ring-2 ring-accent/15'
                  : 'border-line hover:border-ink-3/40'
              )}
            >
              <span className="flex items-center gap-2">
                <Cloud size={15} className={engineMode === 'cloud' ? 'text-accent' : 'text-ink-3'} />
                <span className="text-[13px] font-semibold text-ink">Cloud API</span>
              </span>
              <span className="text-[11.5px] leading-relaxed text-ink-3">
                Official Google Cloud Translation API v2. Needs a billing key.
              </span>
            </button>
          </div>

          <div className={cn('mt-4', engineMode === 'gtx' && 'pointer-events-none opacity-40')}>
            <label
              htmlFor="api-key-input"
              className="text-[11px] font-semibold uppercase tracking-wider text-ink-3"
            >
              Google Cloud API key
            </label>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-line bg-panel-2 px-3">
                <input
                  id="api-key-input"
                  type={revealKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(event) => {
                    setApiKey(event.target.value);
                    setKeyError(null);
                    setTestResult(null);
                  }}
                  placeholder="AIza…"
                  autoComplete="off"
                  spellCheck={false}
                  className="selectable h-10 w-full bg-transparent text-[13px] text-ink placeholder:text-ink-3 focus:outline-none"
                />
                <button
                  type="button"
                  title={revealKey ? 'Hide key' : 'Show key'}
                  aria-label={revealKey ? 'Hide key' : 'Show key'}
                  onClick={() => setRevealKey((shown) => !shown)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-3 hover:text-ink"
                >
                  {revealKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => void testKey()}
                disabled={testing}
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-line px-3 text-[12.5px] font-medium text-ink-2 transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-50"
              >
                {testing && <Loader2 size={13} className="animate-spin" />}
                Test
              </button>
            </div>

            {keyError && <p className="mt-2 text-[12px] font-medium text-rose-500">{keyError}</p>}
            {testResult && !keyError && (
              <p
                className={cn(
                  'mt-2 text-[12px] font-medium',
                  testResult.ok ? 'text-emerald-500' : 'text-rose-500'
                )}
              >
                {testResult.message}
              </p>
            )}

            <button
              type="button"
              onClick={() => void window.electronAPI?.openExternal(API_KEY_HELP_URL)}
              className="mt-2.5 flex items-center gap-1.5 text-[12px] font-medium text-ink-3 transition-colors hover:text-accent"
            >
              <ExternalLink size={12} />
              Get an API key from Google Cloud
            </button>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line px-4 py-2 text-[12.5px] font-medium text-ink-2 transition-colors hover:border-ink-3/40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-xl bg-accent px-4 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Save
          </button>
        </footer>
      </div>
    </div>
  );
}
