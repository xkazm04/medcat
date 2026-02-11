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
 * Build lookup maps for O(1) category access
 * Called once when categories change, provides fast lookups
 */
interface CategoryLookups {
  byId: Map<string, CategoryNode>
  byCode: Map<string, CategoryNode>
  ancestorsById: Map<string, string[]>
}

function buildCategoryLookups(categories: CategoryNode[]): CategoryLookups {
  const byId = new Map<string, CategoryNode>()
  const byCode = new Map<string, CategoryNode>()
  const ancestorsById = new Map<string, string[]>()

  // Recursive function to traverse tree and build maps
  function traverse(nodes: CategoryNode[], ancestors: string[]) {
    for (const node of nodes) {
      byId.set(node.id, node)
      byCode.set(node.code, node)
      ancestorsById.set(node.id, [...ancestors])

      if (node.children && node.children.length > 0) {
        traverse(node.children, [...ancestors, node.id])
      }
    }
  }

  traverse(categories, [])
  return { byId, byCode, ancestorsById }
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
 * Hook: Get memoized category lookups for O(1) access
 * Builds lookup maps once when categories change
 */
export function useCategoryLookups() {
  const { data: categories } = useCategories()

  return useMemo(() => {
    if (!categories || categories.length === 0) {
      return { byId: new Map(), byCode: new Map(), ancestorsById: new Map() }
    }
    return buildCategoryLookups(categories)
  }, [categories])
}

/**
 * Hook: Get a specific category by ID from the cached tree
 * Uses O(1) lookup instead of tree traversal
 */
export function useCategoryById(categoryId: string | null) {
  const { byId } = useCategoryLookups()

  if (!categoryId) return null
  return byId.get(categoryId) || null
}

/**
 * Hook: Get a specific category by EMDN code from the cached tree
 * Uses O(1) lookup instead of tree traversal
 */
export function useCategoryByCode(code: string | null) {
  const { byCode } = useCategoryLookups()

  if (!code) return null
  return byCode.get(code) || null
}

/**
 * Hook: Get ancestor IDs for a category (for auto-expanding tree)
 * Uses O(1) lookup instead of tree traversal
 */
export function useCategoryAncestors(categoryId: string | null): string[] {
  const { ancestorsById } = useCategoryLookups()

  return useMemo(() => {
    if (!categoryId) return []
    return ancestorsById.get(categoryId) || []
  }, [categoryId, ancestorsById])
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
