'use client';

import { ReactNode } from 'react';
import { ChatContextProvider } from '@/lib/hooks/use-chat-context';

interface ChatContextWrapperProps {
  children: ReactNode;
}

/**
 * Client-side wrapper that provides ChatContext to both
 * the catalog table and chat widget so they can communicate.
 */
export function ChatContextWrapper({ children }: ChatContextWrapperProps) {
  return <ChatContextProvider>{children}</ChatContextProvider>;
}
