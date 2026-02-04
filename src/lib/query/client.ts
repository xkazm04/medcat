import { QueryClient } from '@tanstack/react-query'

/**
 * Create a new QueryClient with optimized defaults for category filtering.
 * Categories change infrequently, so we use aggressive caching.
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Categories are relatively static - cache for 5 minutes
        staleTime: 5 * 60 * 1000,
        // Keep in cache for 30 minutes
        gcTime: 30 * 60 * 1000,
        // Don't refetch on window focus for static data
        refetchOnWindowFocus: false,
        // Retry failed requests
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      },
    },
  })
}

// Browser-side singleton
let browserQueryClient: QueryClient | undefined = undefined

export function getQueryClient() {
  // Server: always create a new client
  if (typeof window === 'undefined') {
    return makeQueryClient()
  }

  // Browser: reuse the same client
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient()
  }
  return browserQueryClient
}

// Query keys for type-safe cache management
export const queryKeys = {
  categories: {
    all: ['categories'] as const,
    tree: () => [...queryKeys.categories.all, 'tree'] as const,
    flat: () => [...queryKeys.categories.all, 'flat'] as const,
    byId: (id: string) => [...queryKeys.categories.all, 'detail', id] as const,
    descendants: (id: string) => [...queryKeys.categories.all, 'descendants', id] as const,
  },
  products: {
    all: ['products'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.products.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.products.all, 'detail', id] as const,
  },
  vendors: {
    all: ['vendors'] as const,
  },
  materials: {
    all: ['materials'] as const,
  },
} as const
