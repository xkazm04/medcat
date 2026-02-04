'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, type ReactNode } from 'react'
import { makeQueryClient } from '@/lib/query/client'

interface QueryProviderProps {
  children: ReactNode
}

/**
 * TanStack Query provider for client-side caching.
 * Creates a new QueryClient per request on server, reuses on client.
 */
export function QueryProvider({ children }: QueryProviderProps) {
  // Create a new QueryClient for each browser session
  // This ensures proper hydration and prevents sharing state between users
  const [queryClient] = useState(() => makeQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  )
}
