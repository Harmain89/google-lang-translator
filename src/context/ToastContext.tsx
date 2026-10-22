import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn, uid } from '../lib/utils';

type ToastType = 'info' | 'success' | 'error';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 2500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const toast: Toast = { id: uid(), message, type };
      setToasts((current) => [...current.slice(-3), toast]);
      timersRef.current.set(
        toast.id,
        setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS)
      );
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-0 right-0 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto max-w-md animate-fade-in-scale rounded-lg border px-4 py-2.5 text-[13px] font-medium shadow-lg backdrop-blur',
              'bg-panel border-line text-ink'
            )}
            role="status"
          >
            <span
              className={cn(
                'mr-2 inline-block h-1.5 w-1.5 translate-y-[-1px] rounded-full align-middle',
                toast.type === 'success' && 'bg-emerald-500',
                toast.type === 'error' && 'bg-rose-500',
                toast.type === 'info' && 'bg-indigo-400'
              )}
            />
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
