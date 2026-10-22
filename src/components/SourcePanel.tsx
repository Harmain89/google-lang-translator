import { useEffect, useRef, useState } from 'react';
import { ClipboardPaste, Volume2, Square as StopIcon, X } from 'lucide-react';
import { cn, countCharacters, countWords } from '../lib/utils';
import { speak, stopSpeaking } from '../lib/speech';

interface SourcePanelProps {
  value: string;
  languageCode: string;
  detectedLang: string | null;
  onChange: (text: string) => void;
  onClear: () => void;
}

const CHAR_HARD_LIMIT = 10_000;

export default function SourcePanel({ value, languageCode, detectedLang, onChange, onClear }: SourcePanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [listening, setListening] = useState(false);

  useEffect(() => () => stopSpeaking(), []);

  const hasText = value.trim().length > 0;
  const chars = countCharacters(value);
  const words = countWords(value);
  const overLimit = chars > CHAR_HARD_LIMIT;

  const speechLang = languageCode === 'auto' ? detectedLang ?? 'en' : languageCode;

  const toggleListen = () => {
    if (listening) {
      stopSpeaking();
      setListening(false);
      return;
    }
    if (!hasText) return;
    if (speak(value, speechLang, () => setListening(false))) setListening(true);
  };

  const pasteFromClipboard = async () => {
    try {
      if (window.electronAPI) {
        const text = await window.electronAPI.readClipboard();
        if (text) onChange(value + text);
      } else {
        const text = await navigator.clipboard.readText();
        if (text) onChange(value + text);
      }
    } catch {
      setListening(false);
    }
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-xl2 border border-line bg-panel">
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-line px-3.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
          Source
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title="Paste from clipboard"
            aria-label="Paste from clipboard"
            onClick={() => void pasteFromClipboard()}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-3 transition-colors duration-150 hover:bg-panel-2 hover:text-ink"
          >
            <ClipboardPaste size={14} />
          </button>
          <button
            type="button"
            title={listening ? 'Stop speaking' : 'Listen'}
            aria-label={listening ? 'Stop speaking' : 'Listen'}
            onClick={toggleListen}
            disabled={!hasText}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg text-ink-3 transition-colors duration-150 hover:bg-panel-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-35',
              listening && 'bg-accent-soft text-accent hover:text-accent'
            )}
          >
            {listening ? <StopIcon size={13} /> : <Volume2 size={14} />}
          </button>
          <button
            type="button"
            title="Clear"
            aria-label="Clear"
            onClick={onClear}
            disabled={!hasText}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-3 transition-colors duration-150 hover:bg-panel-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Type or paste text to translate…"
        spellCheck={false}
        className="selectable mt-3 min-h-[96px] flex-1 resize-none bg-transparent px-4 pb-2 text-[15px] leading-relaxed text-ink placeholder:text-ink-3 focus:outline-none"
      />

      <footer className="flex h-9 shrink-0 items-center justify-between border-t border-line px-3.5 text-[11px] text-ink-3">
        <span className={cn(overLimit && 'font-medium text-rose-500')}>
          {chars.toLocaleString()} characters · {words.toLocaleString()} {words === 1 ? 'word' : 'words'}
        </span>
        <span className="hidden sm:inline">Ctrl + Enter to translate</span>
      </footer>
    </section>
  );
}
