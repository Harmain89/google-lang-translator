import { ArrowLeftRight } from 'lucide-react';
import LanguageSelect from './LanguageSelect';
import { getLanguageLabel } from '../lib/languages';

interface LanguageSelectorBarProps {
  sourceLang: string;
  targetLang: string;
  detectedLang: string | null;
  onSourceChange: (code: string) => void;
  onTargetChange: (code: string) => void;
  onSwap: () => void;
}

export default function LanguageSelectorBar(props: LanguageSelectorBarProps) {
  const { sourceLang, targetLang, detectedLang, onSourceChange, onTargetChange, onSwap } = props;

  return (
    <div className="flex shrink-0 items-center gap-2">
      <div className="flex flex-col gap-1">
        <LanguageSelect value={sourceLang} onChange={onSourceChange} align="left" includeAuto />
        {sourceLang === 'auto' && detectedLang && (
          <span className="self-start rounded-full border border-line bg-panel px-2 py-0.5 text-[10.5px] font-medium text-ink-3">
            Detected: {getLanguageLabel(detectedLang)}
          </span>
        )}
      </div>

      <button
        type="button"
        title="Swap languages"
        aria-label="Swap languages"
        onClick={onSwap}
        className="no-drag mt-0 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-panel text-ink-3 transition-all duration-200 hover:border-accent/50 hover:text-accent active:scale-90"
        style={{ transition: 'color 150ms, border-color 150ms, transform 150ms' }}
      >
        <ArrowLeftRight size={15} className="transition-transform duration-300" />
      </button>

      <div className="flex flex-col gap-1">
        <LanguageSelect value={targetLang} onChange={onTargetChange} align="right" includeAuto={false} />
      </div>
    </div>
  );
}
