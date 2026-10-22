import { Languages, Pin, PinOff, Sun, Moon, Clock3, Settings2, Minus, Square, X } from 'lucide-react';
import { cn } from '../lib/utils';
import type { EngineMode } from '../types';

interface HeaderBarProps {
  engineMode: EngineMode;
  hasApiKey: boolean;
  theme: 'dark' | 'light';
  alwaysOnTop: boolean;
  isMaximized: boolean;
  onToggleTheme: () => void;
  onToggleAlwaysOnTop: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
}

function HeaderButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'no-drag flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-150',
        active
          ? 'bg-accent-soft text-accent'
          : 'text-ink-3 hover:bg-panel-2 hover:text-ink'
      )}
    >
      {children}
    </button>
  );
}

function WindowButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'no-drag flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors duration-150 hover:bg-panel-2 hover:text-ink',
        danger && 'hover:bg-rose-500 hover:text-white'
      )}
    >
      {children}
    </button>
  );
}

export default function HeaderBar(props: HeaderBarProps) {
  const {
    engineMode,
    hasApiKey,
    theme,
    alwaysOnTop,
    isMaximized,
    onToggleTheme,
    onToggleAlwaysOnTop,
    onOpenHistory,
    onOpenSettings,
  } = props;

  const cloudActive = engineMode === 'cloud' && hasApiKey;

  return (
    <header className="drag-region flex h-12 shrink-0 items-center gap-2 border-b border-line bg-panel px-3">
      <div className="flex items-center gap-2.5 pl-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-slate-700">
          <Languages size={16} className="text-white" strokeWidth={2.2} />
        </div>
        <span className="text-[13.5px] font-semibold tracking-tight text-ink">LingoDesk</span>
        <span
          className={cn(
            'ml-1 hidden items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium sm:flex',
            cloudActive
              ? 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          )}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full animate-pulse-dot',
              cloudActive ? 'bg-sky-500' : 'bg-emerald-500'
            )}
          />
          {cloudActive ? 'Cloud API Active' : 'Free GTX Engine'}
        </span>
      </div>

      <div className="flex-1" />

      <div className="no-drag flex items-center gap-0.5">
        <HeaderButton label="History" onClick={onOpenHistory}>
          <Clock3 size={16} />
        </HeaderButton>
        <HeaderButton label="Settings" onClick={onOpenSettings}>
          <Settings2 size={16} />
        </HeaderButton>
        <HeaderButton label={alwaysOnTop ? 'Unpin from top' : 'Always on top'} onClick={onToggleAlwaysOnTop} active={alwaysOnTop}>
          {alwaysOnTop ? <Pin size={16} className="rotate-45" /> : <PinOff size={16} />}
        </HeaderButton>
        <HeaderButton label={theme === 'dark' ? 'Switch to light' : 'Switch to dark'} onClick={onToggleTheme}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </HeaderButton>

        <span className="mx-1.5 h-4 w-px bg-line" />

        <WindowButton label="Minimize" onClick={() => void window.electronAPI?.minimizeWindow()}>
          <Minus size={14} />
        </WindowButton>
        <WindowButton
          label={isMaximized ? 'Restore' : 'Maximize'}
          onClick={() => void window.electronAPI?.toggleMaximizeWindow()}
        >
          <Square size={11} />
        </WindowButton>
        <WindowButton
          label="Close to tray"
          danger
          onClick={() => void window.electronAPI?.closeWindowToTray()}
        >
          <X size={15} />
        </WindowButton>
      </div>
    </header>
  );
}
