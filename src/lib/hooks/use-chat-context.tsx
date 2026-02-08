'use client';

import { createContext, useContext, useRef, useCallback, useMemo, ReactNode } from 'react';

interface ChatContextValue {
  /** Insert text into chat input (appends if input has content) */
  insertText: (text: string) => void;
  /** Open chat panel if closed */
  openChat: () => void;
  /** Combined: open chat and insert text */
  askAbout: (text: string) => void;
  /** Send a complete message directly */
  sendMessage: (text: string) => void;
  /** Register the chat input setter (called by ChatInput) */
  registerInputSetter: (setter: (text: string) => void) => void;
  /** Register the chat open function (called by ChatWidget) */
  registerOpenChat: (opener: () => void) => void;
  /** Register send message function (called by ChatPanel) */
  registerSendMessage: (sender: (text: string) => void) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatContextProvider({ children }: { children: ReactNode }) {
  // Use refs instead of state — registrations should NOT trigger re-renders
  const inputSetterRef = useRef<((text: string) => void) | null>(null);
  const chatOpenerRef = useRef<(() => void) | null>(null);
  const messageSenderRef = useRef<((text: string) => void) | null>(null);

  const registerInputSetter = useCallback((setter: (text: string) => void) => {
    inputSetterRef.current = setter;
  }, []);

  const registerOpenChat = useCallback((opener: () => void) => {
    chatOpenerRef.current = opener;
  }, []);

  const registerSendMessage = useCallback((sender: (text: string) => void) => {
    messageSenderRef.current = sender;
  }, []);

  const insertText = useCallback((text: string) => {
    inputSetterRef.current?.(text);
  }, []);

  const openChat = useCallback(() => {
    chatOpenerRef.current?.();
  }, []);

  const askAbout = useCallback((text: string) => {
    openChat();
    // Retry until input setter is registered (chat panel may take time to mount)
    let attempts = 0;
    const tryInsert = () => {
      if (inputSetterRef.current) {
        inputSetterRef.current(text);
      } else if (attempts < 10) {
        attempts++;
        setTimeout(tryInsert, 100);
      }
    };
    setTimeout(tryInsert, 100);
  }, [openChat]);

  const sendMessage = useCallback((text: string) => {
    openChat();
    let attempts = 0;
    const trySend = () => {
      if (messageSenderRef.current) {
        messageSenderRef.current(text);
      } else if (attempts < 10) {
        attempts++;
        setTimeout(trySend, 100);
      }
    };
    setTimeout(trySend, 100);
  }, [openChat]);

  // Stable context value — all callbacks are stable (empty deps on useCallback)
  const value = useMemo<ChatContextValue>(() => ({
    insertText,
    openChat,
    askAbout,
    sendMessage,
    registerInputSetter,
    registerOpenChat,
    registerSendMessage,
  }), [insertText, openChat, askAbout, sendMessage, registerInputSetter, registerOpenChat, registerSendMessage]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatContextProvider');
  }
  return context;
}

/** Optional hook that doesn't throw - for components that might be outside provider */
export function useChatContextOptional() {
  return useContext(ChatContext);
}
