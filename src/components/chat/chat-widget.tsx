'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X } from 'lucide-react';
import { ChatPanel } from './chat-panel';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence mode="wait" initial={false}>
        {!isOpen ? (
          <motion.button
            key="chat-button"
            layoutId="chat-container"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-foreground rounded-full shadow-lg hover:bg-green-hover transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="font-medium">Chat</span>
          </motion.button>
        ) : (
          <motion.div
            key="chat-panel"
            layoutId="chat-container"
            className="w-[450px] h-[600px] bg-background rounded-xl shadow-lg border border-border overflow-hidden flex flex-col"
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-b from-background to-muted/30">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-green-light border border-green-border/60 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-accent" />
                </div>
                <h2 className="font-semibold text-sm">MedCatalog Assistant</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Chat content */}
            <ChatPanel isOpen={isOpen} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
