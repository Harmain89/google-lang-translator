import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { AUTO_DETECT, getAllLanguages, searchLanguages } from '../lib/languages';

interface LanguageSelectProps {
  value: string;
  onChange: (code: string) => void;
  align: 'left' | 'right';
  includeAuto: boolean;
}

export default function LanguageSelect({ value, onChange, align, includeAuto }: LanguageSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedCode = value;
  const selected =
    selectedCode === 'auto'
      ? AUTO_DETECT
      : getAllLanguages().find((lang) => lang.code === selectedCode) ?? null;

  useEffect(() => {
    if (!open) return () => undefined;
    const onMouseDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  const results = (includeAuto && !query.trim() ? [AUTO_DETECT] : []).concat(searchLanguages(query));

  const pick = (code: string) => {
    onChange(code);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-left text-[13.5px] font-medium transition-colors duration-150',
          open
            ? 'border-accent/60 bg-panel text-ink ring-2 ring-accent/15'
            : 'border-line bg-panel text-ink hover:border-ink-3/40'
        )}
      >
        <span className="truncate">{selected ? selected.native : selectedCode}</span>
        <span className="flex items-center gap-2">
          {selected && selected.code !== 'auto' && selected.native !== selected.name && (
            <span className="hidden truncate text-[11px] font-normal text-ink-3 sm:inline">
              {selected.name}
            </span>
          )}
          <ChevronDown
            size={14}
            className={cn('shrink-0 text-ink-3 transition-transform duration-200', open && 'rotate-180')}
          />
        </span>
      </button>

      {open && (
        <div
          className={cn(
            'absolute top-12 z-40 w-64 animate-fade-in-scale overflow-hidden rounded-xl border border-line bg-panel shadow-2xl shadow-black/20',
            align === 'left' ? 'left-0' : 'right-0'
          )}
        >
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <Search size={14} className="shrink-0 text-ink-3" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search languages…"
              className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-3 focus:outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1.5">
            {results.length === 0 && (
              <p className="px-3 py-6 text-center text-[13px] text-ink-3">No languages found</p>
            )}
            {results.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => pick(lang.code)}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors duration-100',
                  lang.code === selectedCode
                    ? 'bg-accent-soft text-accent'
                    : 'text-ink-2 hover:bg-panel-2 hover:text-ink'
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium">{lang.native}</span>
                  <span className="truncate text-[11px] text-ink-3">{lang.name}</span>
                </span>
                {lang.code === selectedCode && <Check size={14} className="shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
