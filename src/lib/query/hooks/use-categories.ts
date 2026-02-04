'use client'

import { useMemo } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { queryKeys } from '../client'
import type { CategoryNode } from '@/lib/queries'

/**
 * Fetch category tree from API
 */
async function fetchCategories(): Promise<CategoryNode[]> {
  const response = await fetch('/api/categories', {
    next: { revalidate: 300 }, // 5 minutes
  })

  if (!response.ok) {
    throw new Error('Failed to fetch categories')
  }

  return response.json()
}

/**
 * Invalidate server-side category cache
 */
async function revalidateCategories(): Promise<void> {
  const response = await fetch('/api/categories/revalidate', {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('Failed to revalidate categories')
  }
}

/**
 * Hook: Get category tree with product counts
 *
 * Uses TanStack Query for client-side caching with automatic
 * background refetching and stale-while-revalidate pattern.
 *
 * @param initialData - Optional server-side data for hydration
 */
export function useCategories(initialData?: CategoryNode[]) {
  return useQuery({
    queryKey: queryKeys.categories.tree(),
    queryFn: fetchCategories,
    // Hydrate with server data if provided
    initialData,
    // Categories are stable - aggressive caching
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    // Avoid refetching on every focus
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}

/**
 * Hook: Get a specific category by ID from the cached tree
 */
export function useCategoryById(categoryId: string | null) {
  const { data: categories } = useCategories()

  if (!categoryId || !categories) return null

  function findCategory(nodes: CategoryNode[]): CategoryNode | null {
    for (const node of nodes) {
      if (node.id === categoryId) return node
      if (node.children.length > 0) {
        const found = findCategory(node.children)
        if (found) return found
      }
    }
    return null
  }

  return findCategory(categories)
}

/**
 * Hook: Get ancestor IDs for a category (for auto-expanding tree)
 * Returns a memoized array that only changes when categoryId or categories change.
 */
export function useCategoryAncestors(categoryId: string | null): string[] {
  const { data: categories } = useCategories()

  return useMemo(() => {
    if (!categoryId || !categories || categories.length === 0) return []

    const ancestors: string[] = []

    function findAncestors(nodes: CategoryNode[], path: string[]): boolean {
      for (const node of nodes) {
        if (node.id === categoryId) {
          ancestors.push(...path)
          return true
        }
        if (node.children && node.children.length > 0) {
          if (findAncestors(node.children, [...path, node.id])) {
            return true
          }
        }
      }
      return false
    }

    findAncestors(categories, [])
    return ancestors
  }, [categoryId, categories])
}

/**
 * Hook: Invalidate category cache
 *
 * Use this after mutations that affect product-category relationships:
 * - Creating/deleting products
 * - Changing product categories
 * - Bulk imports
 */
export function useInvalidateCategories() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: revalidateCategories,
    onSuccess: () => {
      // Invalidate client-side cache
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
    },
  })
}

/**
 * Hook: Prefetch categories
 *
 * Call this to warm the cache before it's needed
 * (e.g., on hover or route prefetch)
 */
export function usePrefetchCategories() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.categories.tree(),
      queryFn: fetchCategories,
      staleTime: 5 * 60 * 1000,
    })
  }
}
