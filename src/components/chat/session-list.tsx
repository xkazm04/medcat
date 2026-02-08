'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Plus, Trash2, MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChatSession } from '@/lib/hooks/use-chat-persistence';

interface SessionListProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onNewChat: () => void;
  onSwitchSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

export function SessionList({
  sessions,
  activeSessionId,
  onNewChat,
  onSwitchSession,
  onDeleteSession,
}: SessionListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations('chatHistory');

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="truncate max-w-[120px]">{activeSession?.title || t('newChat')}</span>
        <ChevronDown className="h-3 w-3" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full mt-1 z-50 bg-background border border-border rounded-lg shadow-lg min-w-[200px] overflow-hidden"
            >
              <button
                onClick={() => { onNewChat(); setIsOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-accent hover:bg-green-light/50 transition-colors border-b border-border"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('newChat')}
              </button>

              {sessions.length === 0 ? (
                <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                  {t('noSessions')}
                </div>
              ) : (
                <div className="max-h-[200px] overflow-y-auto py-1">
                  {sessions.map(session => (
                    <div
                      key={session.id}
                      className={`flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors group ${
                        session.id === activeSessionId ? 'bg-accent/5' : ''
                      }`}
                    >
                      <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0" />
                      <button
                        onClick={() => { onSwitchSession(session.id); setIsOpen(false); }}
                        className="flex-1 text-sm text-left truncate"
                      >
                        {session.title}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                        className="p-1 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded"
                        aria-label="Delete session"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
