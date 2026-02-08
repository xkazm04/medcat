'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X } from 'lucide-react';
import { useMediaQuery } from 'usehooks-ts';
import { ChatPanel } from './chat-panel';
import { SessionList } from './session-list';
import { useChatContextOptional } from '@/lib/hooks/use-chat-context';
import { useChatPersistence } from '@/lib/hooks/use-chat-persistence';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const chatContext = useChatContextOptional();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const persistence = useChatPersistence();

  // Register openChat callback with context so other components can open the chat
  useEffect(() => {
    if (chatContext) {
      chatContext.registerOpenChat(() => setIsOpen(true));
    }
  }, [chatContext]);

  // Prevent body scroll when mobile chat is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isMobile, isOpen]);

  return (
    <div className={isOpen && isMobile ? '' : 'fixed bottom-4 right-4 z-50'}>
      <AnimatePresence mode="wait" initial={false}>
        {!isOpen ? (
          <motion.button
            key="chat-button"
            layoutId="chat-container"
            onClick={() => setIsOpen(true)}
            aria-expanded={false}
            aria-label="Open AI chat"
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-foreground rounded-full shadow-lg hover:bg-green-hover transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="font-medium">Chat</span>
          </motion.button>
        ) : isMobile ? (
          /* Mobile: full-screen overlay */
          <motion.div
            key="chat-panel-mobile"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-0 z-50 bg-background flex flex-col"
          >
            {/* Mobile header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-b from-background to-muted/30 safe-area-top shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-green-light border border-green-border/60 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <h2 className="font-semibold text-base">MedCatalog Assistant</h2>
                  <SessionList
                    sessions={persistence.sessions}
                    activeSessionId={persistence.activeSessionId}
                    onNewChat={persistence.newChat}
                    onSwitchSession={persistence.switchSession}
                    onDeleteSession={persistence.deleteSession}
                  />
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Close chat"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <ChatPanel isOpen={isOpen} persistence={persistence} />
          </motion.div>
        ) : (
          /* Desktop: floating panel */
          <motion.div
            key="chat-panel"
            layoutId="chat-container"
            className="w-[450px] h-[600px] bg-background rounded-xl shadow-lg border border-border overflow-hidden flex flex-col"
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Desktop header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-b from-background to-muted/30 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-green-light border border-green-border/60 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm">MedCatalog Assistant</h2>
                  <SessionList
                    sessions={persistence.sessions}
                    activeSessionId={persistence.activeSessionId}
                    onNewChat={persistence.newChat}
                    onSwitchSession={persistence.switchSession}
                    onDeleteSession={persistence.deleteSession}
                  />
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <ChatPanel isOpen={isOpen} persistence={persistence} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
