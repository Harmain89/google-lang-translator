import { useEffect, useState } from 'react';
import { Copy, Check, Volume2, Square as StopIcon, Star, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { speak, stopSpeaking } from '../lib/speech';

interface TargetPanelProps {
  outputText: string;
  loading: boolean;
  error: string | null;
  languageCode: string;
  languageName: string;
  isFavorite: boolean;
  onRetry: () => void;
  onToggleFavorite: () => void;
}

export default function TargetPanel({
  outputText,
  loading,
  error,
  languageCode,
  languageName,
  isFavorite,
  onRetry,
  onToggleFavorite,
}: TargetPanelProps) {
  const [copied, setCopied] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => () => stopSpeaking(), []);

  const hasOutput = outputText.trim().length > 0;

  const copyOutput = async () => {
    if (!hasOutput) return;
    const copiedOk = window.electronAPI
      ? await window.electronAPI.copyToClipboard(outputText)
      : await navigator.clipboard.writeText(outputText).then(() => true).catch(() => false);
    if (copiedOk) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const toggleListen = () => {
    if (listening) {
      stopSpeaking();
      setListening(false);
      return;
    }
    if (!hasOutput) return;
    if (speak(outputText, languageCode, () => setListening(false))) setListening(true);
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-xl2 border border-line bg-panel">
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-line px-3.5">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
          Translation
          <span className="rounded-full bg-panel-2 px-2 py-0.5 text-[10px] font-medium normal-case text-ink-2">
            {languageName}
          </span>
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
            aria-label="Save to favorites"
            onClick={onToggleFavorite}
            disabled={!hasOutput}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg text-ink-3 transition-colors duration-150 hover:bg-panel-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-35',
              isFavorite && 'text-amber-400 hover:text-amber-500'
            )}
          >
            <Star size={14} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            title={listening ? 'Stop speaking' : 'Listen'}
            aria-label={listening ? 'Stop speaking' : 'Listen'}
            onClick={toggleListen}
            disabled={!hasOutput}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg text-ink-3 transition-colors duration-150 hover:bg-panel-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-35',
              listening && 'bg-accent-soft text-accent hover:text-accent'
            )}
          >
            {listening ? <StopIcon size={13} /> : <Volume2 size={14} />}
          </button>
          <button
            type="button"
            title="Copy to clipboard"
            aria-label="Copy to clipboard"
            onClick={() => void copyOutput()}
            disabled={!hasOutput}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg text-ink-3 transition-colors duration-150 hover:bg-panel-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-35',
              copied && 'text-emerald-500'
            )}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </header>

      <div className="selectable min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex flex-col gap-3 pt-1">
            <div className="h-3.5 w-11/12 overflow-hidden rounded-full bg-panel-2">
              <div className="h-full w-1/3 animate-shimmer rounded-full bg-gradient-to-r from-transparent via-ink-3/25 to-transparent" />
            </div>
            <div className="h-3.5 w-full overflow-hidden rounded-full bg-panel-2">
              <div className="h-full w-1/2 animate-shimmer rounded-full bg-gradient-to-r from-transparent via-ink-3/25 to-transparent" />
            </div>
            <div className="h-3.5 w-8/12 overflow-hidden rounded-full bg-panel-2">
              <div className="h-full w-2/3 animate-shimmer rounded-full bg-gradient-to-r from-transparent via-ink-3/25 to-transparent" />
            </div>
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-start justify-center gap-3">
            <p className="text-[13.5px] leading-relaxed text-rose-500">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-medium text-ink-2 transition-colors duration-150 hover:border-accent/50 hover:text-accent"
            >
              <RotateCcw size={13} />
              Retry
            </button>
          </div>
        ) : hasOutput ? (
          <p className="animate-fade-in whitespace-pre-wrap break-words pt-1 text-[15px] leading-relaxed text-ink">
            {outputText}
          </p>
        ) : (
          <p className="flex h-full items-center justify-center text-[13.5px] text-ink-3">
            Translation will appear here
          </p>
        )}
      </div>
    </section>
  );
}
