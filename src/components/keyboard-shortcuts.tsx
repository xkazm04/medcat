'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Keyboard } from 'lucide-react';
import { useTranslations } from 'next-intl';

const shortcuts = [
  { keys: ['Ctrl', 'K'], action: 'search' },
  { keys: ['Esc'], action: 'close' },
  { keys: ['j'], action: 'nextRow' },
  { keys: ['k'], action: 'prevRow' },
  { keys: ['Enter'], action: 'openDetail' },
  { keys: ['c'], action: 'toggleChat' },
  { keys: ['?'], action: 'showShortcuts' },
] as const;

export function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations('shortcuts');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger in inputs/textareas
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (e.key === '?') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-foreground/40"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] bg-background border border-border rounded-xl shadow-lg w-[380px] max-w-[90vw]"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-accent" />
                <h2 className="font-semibold">{t('title')}</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {shortcuts.map(s => (
                <div key={s.action} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t(s.action)}</span>
                  <div className="flex items-center gap-1">
                    {s.keys.map(key => (
                      <kbd
                        key={key}
                        className="px-2 py-1 text-xs font-mono bg-muted border border-border rounded shadow-sm"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
