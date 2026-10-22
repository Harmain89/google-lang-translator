import { useState } from 'react';
import { Clock3, Star, Trash2, History, StarOff, X } from 'lucide-react';
import { cn, formatRelativeTime, truncate } from '../lib/utils';
import { getLanguageLabel } from '../lib/languages';
import type { TranslationRecord } from '../types';

type DrawerTab = 'history' | 'favorites';

interface HistoryDrawerProps {
  open: boolean;
  history: TranslationRecord[];
  favorites: TranslationRecord[];
  onClose: () => void;
  onRestore: (record: TranslationRecord) => void;
  onDeleteHistory: (id: string) => void;
  onClearHistory: () => void;
  onToggleFavorite: (record: TranslationRecord) => void;
}

interface RecordRowProps {
  record: TranslationRecord;
  bottomLabel: string;
  onRestore: () => void;
  action: () => void;
  actionTitle: string;
  actionIcon: React.ReactNode;
}

function RecordRow({ record, bottomLabel, onRestore, action, actionTitle, actionIcon }: RecordRowProps) {
  return (
    <div
      className="group relative cursor-pointer rounded-xl border border-line bg-panel px-3.5 py-3 transition-colors duration-150 hover:border-accent/40"
      onClick={onRestore}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onRestore();
      }}
    >
      <p className="truncate text-[13px] font-medium text-ink">{truncate(record.sourceText, 120)}</p>
      <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink-3">
        {truncate(record.translatedText, 160)}
      </p>
      <div className="mt-2 flex items-center justify-between text-[10.5px] text-ink-3">
        <span className="truncate">{bottomLabel}</span>
        <span className="shrink-0">{formatRelativeTime(record.timestamp)}</span>
      </div>
      <button
        type="button"
        title={actionTitle}
        aria-label={actionTitle}
        onClick={(event) => {
          event.stopPropagation();
          action();
        }}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg text-ink-3 opacity-0 transition-opacity duration-150 hover:bg-panel-2 hover:text-rose-500 group-hover:opacity-100"
      >
        {actionIcon}
      </button>
    </div>
  );
}

export default function HistoryDrawer(props: HistoryDrawerProps) {
  const { open, history, favorites, onClose, onRestore, onDeleteHistory, onClearHistory, onToggleFavorite } = props;
  const [tab, setTab] = useState<DrawerTab>('history');

  if (!open) return null;

  const items = tab === 'history' ? history : favorites;

  return (
    <div className="absolute inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <aside className="absolute right-0 top-0 flex h-full w-[360px] max-w-[85%] animate-slide-in-right flex-col border-l border-line bg-panel">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
          <span className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
            <History size={16} className="text-ink-3" />
            LingoDesk Library
          </span>
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

        <div className="flex gap-1 border-b border-line px-3 pt-2.5 pb-0">
          <button
            type="button"
            onClick={() => setTab('history')}
            className={cn(
              'flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 pb-2 text-[12.5px] font-medium transition-colors duration-150',
              tab === 'history' ? 'border-accent text-ink' : 'border-transparent text-ink-3 hover:text-ink-2'
            )}
          >
            <Clock3 size={13} />
            History
          </button>
          <button
            type="button"
            onClick={() => setTab('favorites')}
            className={cn(
              'flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 pb-2 text-[12.5px] font-medium transition-colors duration-150',
              tab === 'favorites' ? 'border-accent text-ink' : 'border-transparent text-ink-3 hover:text-ink-2'
            )}
          >
            <Star size={13} />
            Favorites
            {favorites.length > 0 && (
              <span className="rounded-full bg-accent-soft px-1.5 text-[10px] text-accent">{favorites.length}</span>
            )}
          </button>
        </div>

        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
            {tab === 'history' ? 'Recent translations' : 'Starred translations'}
          </span>
          {tab === 'history' && history.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="text-[11.5px] font-medium text-ink-3 transition-colors hover:text-rose-500"
            >
              Clear History
            </button>
          )}
        </div>

        {tab === 'favorites' && (
          <p className="px-4 pb-2 text-[11.5px] leading-relaxed text-ink-3">
            Click a card to restore it. Unstar to remove from favorites.
          </p>
        )}

        <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-4">
          {items.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-panel-2 text-ink-3">
                {tab === 'history' ? <History size={18} /> : <Star size={18} />}
              </div>
              <p className="text-[13px] font-medium text-ink-2">
                {tab === 'history' ? 'No translations yet' : 'No favorites yet'}
              </p>
              <p className="max-w-[220px] text-[12px] leading-relaxed text-ink-3">
                {tab === 'history'
                  ? 'Your recent translations will show up here.'
                  : 'Star a translation from the target panel to keep it handy.'}
              </p>
            </div>
          ) : (
            items.map((record) => (
              <RecordRow
                key={record.id}
                record={record}
                onRestore={() => {
                  onRestore(record);
                  onClose();
                }}
                bottomLabel={`${getLanguageLabel(
                  record.sourceLang === 'auto' ? record.detectedLang ?? 'auto' : record.sourceLang
                )} → ${getLanguageLabel(record.targetLang)}`}
                action={tab === 'history' ? () => onDeleteHistory(record.id) : () => onToggleFavorite(record)}
                actionTitle={tab === 'history' ? 'Delete entry' : 'Unstar'}
                actionIcon={tab === 'history' ? <Trash2 size={13} /> : <StarOff size={13} />}
              />
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
