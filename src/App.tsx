import { useCallback, useEffect, useMemo, useState } from 'react';
import HeaderBar from './components/HeaderBar';
import LanguageSelectorBar from './components/LanguageSelectorBar';
import SourcePanel from './components/SourcePanel';
import TargetPanel from './components/TargetPanel';
import HistoryDrawer from './components/HistoryDrawer';
import SettingsModal from './components/SettingsModal';
import { useTheme } from './context/ThemeContext';
import { useToast } from './context/ToastContext';
import { useTranslation } from './hooks/useTranslation';
import { getLanguageLabel } from './lib/languages';
import { uid } from './lib/utils';
import type { AppSettings, TranslationRecord } from './types';

const HISTORY_KEY = 'data.history';
const FAVORITES_KEY = 'data.favorites';
const SETTINGS_KEY = 'app.settings';
const HISTORY_LIMIT = 100;
const FAVORITES_LIMIT = 200;

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const [history, setHistory] = useState<TranslationRecord[]>([]);
  const [favorites, setFavorites] = useState<TranslationRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ engineMode: 'gtx', apiKey: '' });

  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('es');
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      const [storedHistory, storedFavorites, storedSettings] = await Promise.all([
        window.electronAPI?.storeGet<unknown>(HISTORY_KEY, []),
        window.electronAPI?.storeGet<unknown>(FAVORITES_KEY, []),
        window.electronAPI?.storeGet<unknown>(SETTINGS_KEY, null),
      ]);
      if (Array.isArray(storedHistory)) {
        setHistory(storedHistory.filter(isValidRecord) as TranslationRecord[]);
      }
      if (Array.isArray(storedFavorites)) {
        setFavorites(storedFavorites.filter(isValidRecord) as TranslationRecord[]);
      }
      if (storedSettings && typeof storedSettings === 'object') {
        const parsed = storedSettings as Partial<AppSettings>;
        setSettings({
          engineMode: parsed.engineMode === 'cloud' ? 'cloud' : 'gtx',
          apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
        });
      }
    })();
  }, []);

  const apiKey = settings.engineMode === 'cloud' ? settings.apiKey : '';

  const recordTranslation = useCallback(
    (translatedText: string, detected: string | null, sourceText: string) => {
      const trimmedSource = sourceText.trim();
      const trimmedOutput = translatedText.trim();
      if (!trimmedSource || !trimmedOutput) return;
      setHistory((current) => {
        const latest = current[0];
        if (
          latest &&
          latest.sourceText === trimmedSource &&
          latest.targetLang === targetLang &&
          latest.translatedText === trimmedOutput
        ) {
          const refreshed = { ...latest, timestamp: Date.now() };
          const next = [refreshed, ...current.slice(1)];
          void window.electronAPI?.storeSet(HISTORY_KEY, next);
          return next;
        }
        const record: TranslationRecord = {
          id: uid(),
          sourceText: trimmedSource,
          translatedText: trimmedOutput,
          sourceLang,
          targetLang,
          detectedLang: detected,
          timestamp: Date.now(),
        };
        const next = [record, ...current].slice(0, HISTORY_LIMIT);
        void window.electronAPI?.storeSet(HISTORY_KEY, next);
        return next;
      });
    },
    [sourceLang, targetLang]
  );

  const translation = useTranslation({
    sourceLang,
    targetLang,
    apiKey,
    onComplete: (result, sourceText) =>
      recordTranslation(result.translatedText, result.detectedSourceLanguage, sourceText),
  });

  useEffect(() => {
    void window.electronAPI?.getAlwaysOnTop().then((value) => setAlwaysOnTop(Boolean(value)));
    const offTop = window.electronAPI?.onAlwaysOnTopChanged((value) => setAlwaysOnTop(Boolean(value)));
    const offMax = window.electronAPI?.onWindowMaximizedChanged((value) => setIsMaximized(Boolean(value)));
    return () => {
      offTop?.();
      offMax?.();
    };
  }, []);

  const handleTogglePin = useCallback(async () => {
    if (!window.electronAPI) {
      showToast('Pin to top is only available in the desktop app', 'info');
      return;
    }
    const next = await window.electronAPI.toggleAlwaysOnTop();
    setAlwaysOnTop(next);
    showToast(next ? 'Always on top enabled' : 'Always on top disabled', 'info');
  }, [showToast]);

  const handleSwap = useCallback(() => {
    const detected = translation.detectedLang;
    const effectiveSource = sourceLang === 'auto' ? detected ?? 'en' : sourceLang;
    if (effectiveSource === targetLang) {
      showToast('Source and target languages are the same', 'error');
      return;
    }
    setSourceLang(targetLang);
    setTargetLang(effectiveSource);
    translation.setInputText(translation.outputText);
    translation.setOutputText(translation.inputText);
  }, [sourceLang, targetLang, translation, showToast]);

  const isFavorite = useMemo(
    () =>
      favorites.some(
        (record) =>
          record.sourceText === translation.inputText.trim() &&
          record.translatedText === translation.outputText &&
          record.targetLang === targetLang
      ),
    [favorites, translation.inputText, translation.outputText, targetLang]
  );

  const toggleFavoriteCurrent = useCallback(() => {
    const trimmedSource = translation.inputText.trim();
    const trimmedOutput = translation.outputText.trim();
    if (!trimmedSource || !trimmedOutput) return;
    setFavorites((current) => {
      const existing = current.find(
        (record) =>
          record.sourceText === trimmedSource &&
          record.translatedText === trimmedOutput &&
          record.targetLang === targetLang
      );
      let next: TranslationRecord[];
      if (existing) {
        next = current.filter((record) => record.id !== existing.id);
        showToast('Removed from favorites', 'info');
      } else {
        const record: TranslationRecord = {
          id: uid(),
          sourceText: trimmedSource,
          translatedText: trimmedOutput,
          sourceLang,
          targetLang,
          detectedLang: translation.detectedLang,
          timestamp: Date.now(),
        };
        next = [record, ...current].slice(0, FAVORITES_LIMIT);
        showToast('Saved to favorites', 'success');
      }
      void window.electronAPI?.storeSet(FAVORITES_KEY, next);
      return next;
    });
  }, [translation.inputText, translation.outputText, translation.detectedLang, sourceLang, targetLang, showToast]);

  const toggleFavoriteRecord = useCallback((record: TranslationRecord) => {
    setFavorites((current) => {
      const next = current.filter((item) => item.id !== record.id);
      void window.electronAPI?.storeSet(FAVORITES_KEY, next);
      return next;
    });
  }, []);

  const deleteHistoryRecord = useCallback((id: string) => {
    setHistory((current) => {
      const next = current.filter((item) => item.id !== id);
      void window.electronAPI?.storeSet(HISTORY_KEY, next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory(() => {
      void window.electronAPI?.storeSet(HISTORY_KEY, []);
      return [];
    });
    showToast('History cleared', 'info');
  }, [showToast]);

  const restoreRecord = useCallback(
    (record: TranslationRecord) => {
      setSourceLang(record.sourceLang);
      setTargetLang(record.targetLang);
      translation.setInputText(record.sourceText);
      translation.setOutputText(record.translatedText);
      translation.setDetectedLang(record.detectedLang);
      showToast('Translation restored', 'info');
    },
    [translation, showToast]
  );

  const saveSettings = useCallback(
    (next: AppSettings) => {
      setSettings(next);
      void window.electronAPI?.storeSet(SETTINGS_KEY, next);
      setSettingsOpen(false);
      showToast(
        next.engineMode === 'cloud' ? 'Cloud API mode saved' : 'Free GTX mode saved',
        'success'
      );
    },
    [showToast]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        translation.translateNow();
        return;
      }
      if (event.key === 'Escape') {
        if (settingsOpen) {
          setSettingsOpen(false);
        } else if (drawerOpen) {
          setDrawerOpen(false);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [translation, settingsOpen, drawerOpen]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <HeaderBar
        engineMode={settings.engineMode}
        hasApiKey={Boolean(settings.apiKey)}
        theme={theme}
        alwaysOnTop={alwaysOnTop}
        isMaximized={isMaximized}
        onToggleTheme={toggleTheme}
        onToggleAlwaysOnTop={() => void handleTogglePin()}
        onOpenHistory={() => setDrawerOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="flex min-h-0 flex-1 flex-col gap-4 px-5 py-4">
        <LanguageSelectorBar
          sourceLang={sourceLang}
          targetLang={targetLang}
          detectedLang={translation.detectedLang}
          onSourceChange={setSourceLang}
          onTargetChange={setTargetLang}
          onSwap={handleSwap}
        />

        <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
          <SourcePanel
            value={translation.inputText}
            languageCode={sourceLang}
            detectedLang={translation.detectedLang}
            onChange={translation.setInputText}
            onClear={translation.clearAll}
          />
          <TargetPanel
            outputText={translation.outputText}
            loading={translation.loading}
            error={translation.error}
            languageCode={targetLang}
            languageName={getLanguageLabel(targetLang)}
            isFavorite={isFavorite}
            onRetry={translation.translateNow}
            onToggleFavorite={toggleFavoriteCurrent}
          />
        </div>
      </main>

      <HistoryDrawer
        open={drawerOpen}
        history={history}
        favorites={favorites}
        onClose={() => setDrawerOpen(false)}
        onRestore={restoreRecord}
        onDeleteHistory={deleteHistoryRecord}
        onClearHistory={clearHistory}
        onToggleFavorite={toggleFavoriteRecord}
      />

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={saveSettings}
      />
    </div>
  );
}

function isValidRecord(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<TranslationRecord>;
  return Boolean(record.id && record.sourceText && record.translatedText && record.targetLang);
}
