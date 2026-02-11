import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CategoryNode } from '@/lib/queries'

/**
 * API Route: GET /api/categories
 *
 * Returns category tree with product counts.
 * Client-side caching is handled by TanStack Query (5 min stale time).
 * HTTP caching via Cache-Control headers.
 */

async function getCategoryTree(): Promise<CategoryNode[]> {
  const supabase = await createClient()

  // Try materialized view first (fast path)
  const { data: matViewData, error: matViewError } = await supabase
    .from('category_product_counts')
    .select('id, code, name, name_cs, parent_id, path, depth, total_count')
    .gt('total_count', 0)
    .order('code')

  if (!matViewError && matViewData && matViewData.length > 0) {
    return buildTreeFromMatView(matViewData)
  }

  // Fallback: compute counts directly
  console.log('[categories] Materialized view not available, computing counts directly')
  return computeCategoryTree(supabase)
}

// Build tree from materialized view data
function buildTreeFromMatView(data: Array<{
  id: string
  code: string
  name: string
  name_cs?: string | null
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
      name_cs: row.name_cs,
      parent_id: row.parent_id,
      path: row.path,
      depth: row.depth,
      created_at: '',
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
      rootCategories.push(node)
    }
  })

  return rootCategories
}

// Fallback: compute tree directly from tables
async function computeCategoryTree(supabase: Awaited<ReturnType<typeof createClient>>): Promise<CategoryNode[]> {
  const { data: categoriesData, error: catError } = await supabase
    .from('emdn_categories')
    .select('*')
    .order('code')

  if (catError || !categoriesData) {
    console.error('[categories] Error fetching categories:', catError?.message)
    return []
  }

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

  const categoryMap = new Map<string, CategoryNode>()
  const rootCategories: CategoryNode[] = []

  categoriesData.forEach((cat) => {
    categoryMap.set(cat.id, {
      ...cat,
      children: [],
      productCount: countMap.get(cat.id) || 0,
    })
  })

  categoriesData.forEach((cat) => {
    const node = categoryMap.get(cat.id)!
    if (cat.parent_id && categoryMap.has(cat.parent_id)) {
      categoryMap.get(cat.parent_id)!.children.push(node)
    } else {
      rootCategories.push(node)
    }
  })

  function propagateCounts(node: CategoryNode): number {
    let total = node.productCount
    for (const child of node.children) {
      total += propagateCounts(child)
    }
    node.productCount = total
    return total
  }
  rootCategories.forEach(propagateCounts)

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
    const categories = await getCategoryTree()

    return NextResponse.json(categories, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    console.error('[categories] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
