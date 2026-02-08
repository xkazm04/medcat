import { useState, useEffect, useCallback, useRef } from 'react';
import type { UIMessage } from '@ai-sdk/react';

export interface ChatSession {
  id: string;
  title: string;
  messages: UIMessage[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'medcatalog-chat-sessions';
const ACTIVE_SESSION_KEY = 'medcatalog-chat-active';
const MAX_SESSIONS = 5;
const MAX_MESSAGES_PER_SESSION = 30;

function loadSessions(): ChatSession[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function persistSessions(sessions: ChatSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // localStorage unavailable
  }
}

function getActiveSessionId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SESSION_KEY);
  } catch {
    return null;
  }
}

function setActiveSessionId(id: string) {
  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, id);
  } catch {
    // localStorage unavailable
  }
}

/** Strip tool result parts from messages to save space. Only keep text/reasoning parts. */
function stripToolResults(messages: UIMessage[]): UIMessage[] {
  return messages.map(msg => ({
    ...msg,
    parts: msg.parts.filter(part => {
      if (typeof part === 'object' && part !== null && 'type' in part) {
        const p = part as { type: string };
        // Keep text and reasoning parts, drop tool results
        return p.type === 'text' || p.type === 'reasoning';
      }
      return true;
    }),
  }));
}

function getTitle(messages: UIMessage[]): string {
  const first = messages.find(m => m.role === 'user');
  if (first) {
    // Get text from parts
    for (const part of first.parts) {
      if (typeof part === 'object' && part !== null && 'type' in part && (part as { type: string }).type === 'text') {
        const text = (part as { text: string }).text;
        return text.length > 50 ? text.slice(0, 50) + '...' : text;
      }
    }
  }
  return 'New Chat';
}

export function useChatPersistence() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  // Ref to avoid stale closure in saveMessages
  const activeIdRef = useRef<string | null>(null);
  useEffect(() => { activeIdRef.current = activeSessionId; }, [activeSessionId]);

  // Load sessions from localStorage on mount (external system hydration)
  useEffect(() => {
    const loaded = loadSessions();
    setSessions(loaded); // eslint-disable-line react-hooks/set-state-in-effect -- hydrating from localStorage
    const activeId = getActiveSessionId();
    if (activeId && loaded.some(s => s.id === activeId)) {
      setActiveId(activeId);
    }
    setIsReady(true);
  }, []);

  // Get initial messages for current session
  const getInitialMessages = useCallback((): UIMessage[] => {
    if (!activeSessionId) return [];
    const session = sessions.find(s => s.id === activeSessionId);
    return session?.messages || [];
  }, [activeSessionId, sessions]);

  // Save messages to current session (reads activeSessionId via ref to avoid stale closure)
  const saveMessages = useCallback((messages: UIMessage[]) => {
    if (messages.length === 0) return;

    setSessions(prev => {
      const trimmed = stripToolResults(messages.slice(-MAX_MESSAGES_PER_SESSION));
      const title = getTitle(messages);
      const now = Date.now();

      let sessionId = activeIdRef.current;
      let next: ChatSession[];

      if (sessionId) {
        // Update existing session
        next = prev.map(s =>
          s.id === sessionId
            ? { ...s, title, messages: trimmed, updatedAt: now }
            : s
        );
      } else {
        // Create new session
        sessionId = crypto.randomUUID();
        setActiveId(sessionId);
        setActiveSessionId(sessionId);
        const newSession: ChatSession = {
          id: sessionId,
          title,
          messages: trimmed,
          createdAt: now,
          updatedAt: now,
        };
        next = [newSession, ...prev];
        // Drop oldest if over limit
        if (next.length > MAX_SESSIONS) {
          next = next.slice(0, MAX_SESSIONS);
        }
      }

      persistSessions(next);
      return next;
    });
  }, []);

  // Start new chat
  const newChat = useCallback(() => {
    const id = crypto.randomUUID();
    setActiveId(id);
    setActiveSessionId(id);
  }, []);

  // Switch to session
  const switchSession = useCallback((id: string) => {
    setActiveId(id);
    setActiveSessionId(id);
  }, []);

  // Delete session
  const deleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      persistSessions(next);
      return next;
    });
    if (activeSessionId === id) {
      newChat();
    }
  }, [activeSessionId, newChat]);

  return {
    sessions,
    activeSessionId,
    getInitialMessages,
    saveMessages,
    newChat,
    switchSession,
    deleteSession,
    isReady,
  };
}
