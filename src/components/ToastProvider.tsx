import React, { createContext, useContext, useState, useCallback } from 'react';

interface Toast {
  id: string;
  message: string;
  type?: 'info' | 'error' | 'success';
}

interface ToastContextShape {
  toasts: Toast[];
  push: (message: string, type?: Toast['type']) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextShape | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);
  const push = useCallback(
    (message: string, type: Toast['type'] = 'info') => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      setToasts((t) => [...t, { id, message, type }]);
      globalThis.setTimeout?.(() => dismiss(id), 4000);
    },
    [dismiss]
  );
  return (
    <ToastContext.Provider value={{ toasts, push, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-3 py-2 rounded shadow text-sm text-white cursor-pointer transition-opacity bg-${
              t.type === 'error' ? 'red' : t.type === 'success' ? 'green' : 'gray'
            }-600`}
            onClick={() => dismiss(t.id)}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
