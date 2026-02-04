import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { CategoryNode } from '@/lib/queries'

/**
 * API Route: GET /api/categories
 *
 * Returns category tree with product counts.
 * Uses Next.js server-side caching for performance.
 *
 * Cache strategy:
 * - Server cache: 5 minutes (revalidate: 300)
 * - Tags: ['categories'] for manual invalidation
 */

// Cache the expensive category tree building operation
const getCachedCategoryTree = unstable_cache(
  async (): Promise<CategoryNode[]> => {
    const supabase = await createClient()

    // Try to use materialized view first (if it exists)
    const { data: matViewData, error: matViewError } = await supabase
      .from('category_product_counts')
      .select('id, code, name, parent_id, path, depth, total_count')
      .gt('total_count', 0)
      .order('code')

    if (!matViewError && matViewData && matViewData.length > 0) {
      // Build tree from materialized view (fast path)
      return buildTreeFromMatView(matViewData)
    }

    // Fallback: compute counts directly (slower path)
    console.log('[categories] Materialized view not available, computing counts directly')
    return computeCategoryTree(supabase)
  },
  ['categories-tree'],
  {
    revalidate: 300, // 5 minutes
    tags: ['categories'],
  }
)

// Build tree from materialized view data
function buildTreeFromMatView(data: Array<{
  id: string
  code: string
  name: string
  parent_id: string | null
  path: string
  depth: number
  total_count: number
}>): CategoryNode[] {
  const categoryMap = new Map<string, CategoryNode>()
  const rootCategories: CategoryNode[] = []

  // First pass: create nodes
  data.forEach((row) => {
    categoryMap.set(row.id, {
      id: row.id,
      code: row.code,
      name: row.name,
      parent_id: row.parent_id,
      path: row.path,
      depth: row.depth,
      created_at: '', // Not needed for tree display
      children: [],
      productCount: row.total_count,
    })
  })

  // Second pass: build tree
  data.forEach((row) => {
    const node = categoryMap.get(row.id)!
    if (row.parent_id && categoryMap.has(row.parent_id)) {
      categoryMap.get(row.parent_id)!.children.push(node)
    } else if (!row.parent_id || !categoryMap.has(row.parent_id)) {
      // Check if this is a root in our filtered set
      const hasParentInSet = row.parent_id && categoryMap.has(row.parent_id)
      if (!hasParentInSet) {
        rootCategories.push(node)
      }
    }
  })

  return rootCategories
}

// Fallback: compute tree directly from tables
async function computeCategoryTree(supabase: Awaited<ReturnType<typeof createClient>>): Promise<CategoryNode[]> {
  // Get all categories
  const { data: categoriesData, error: catError } = await supabase
    .from('emdn_categories')
    .select('*')
    .order('code')

  if (catError || !categoriesData) {
    console.error('[categories] Error fetching categories:', catError?.message)
    return []
  }

  // Get product counts per category
  const { data: productCounts, error: countError } = await supabase
    .from('products')
    .select('emdn_category_id')
    .not('emdn_category_id', 'is', null)

  const countMap = new Map<string, number>()
  if (!countError && productCounts) {
    productCounts.forEach((p) => {
      const catId = p.emdn_category_id
      countMap.set(catId, (countMap.get(catId) || 0) + 1)
    })
  }

  // Build tree structure
  const categoryMap = new Map<string, CategoryNode>()
  const rootCategories: CategoryNode[] = []

  // First pass: create nodes with direct counts
  categoriesData.forEach((cat) => {
    categoryMap.set(cat.id, {
      ...cat,
      children: [],
      productCount: countMap.get(cat.id) || 0,
    })
  })

  // Second pass: build tree
  categoriesData.forEach((cat) => {
    const node = categoryMap.get(cat.id)!
    if (cat.parent_id && categoryMap.has(cat.parent_id)) {
      categoryMap.get(cat.parent_id)!.children.push(node)
    } else {
      rootCategories.push(node)
    }
  })

  // Third pass: propagate counts up
  function propagateCounts(node: CategoryNode): number {
    let total = node.productCount
    for (const child of node.children) {
      total += propagateCounts(child)
    }
    node.productCount = total
    return total
  }
  rootCategories.forEach(propagateCounts)

  // Filter out categories with no products
  function filterEmpty(nodes: CategoryNode[]): CategoryNode[] {
    return nodes
      .filter((node) => node.productCount > 0)
      .map((node) => ({
        ...node,
        children: filterEmpty(node.children),
      }))
  }

  return filterEmpty(rootCategories)
}

export async function GET() {
  try {
    const categories = await getCachedCategoryTree()

    return NextResponse.json(categories, {
      headers: {
        // Client cache for 1 minute, CDN cache for 5 minutes
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    console.error('[categories] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}
