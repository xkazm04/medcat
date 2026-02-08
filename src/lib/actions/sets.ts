'use server'

import { createClient } from '@/lib/supabase/server'
import type { SetGroupEntry, SetMatchedProduct } from '@/lib/types'

export interface SetGroupsResult {
  entries: SetGroupEntry[]
  matchedProducts: SetMatchedProduct[]
}

export async function getSetGroups(): Promise<SetGroupsResult> {
  const supabase = await createClient()

  // Fetch all set-scoped reference prices with EMDN join
  const { data: rawEntries, error: entriesError } = await supabase
    .from('reference_prices')
    .select(`
      id,
      xc_subcode,
      source_code,
      manufacturer_name,
      component_type,
      component_description,
      price_scope,
      price_eur,
      price_original,
      currency_original,
      source_country,
      valid_from,
      emdn_leaf_category_id,
      emdn_category_id
    `)
    .or('price_scope.eq.set,component_type.in.(set,revision_set)')
    .order('xc_subcode', { ascending: true })
    .order('manufacturer_name', { ascending: true })
    .order('price_eur', { ascending: true })

  if (entriesError) {
    console.error('Failed to fetch set entries:', entriesError)
    return { entries: [], matchedProducts: [] }
  }

  if (!rawEntries || rawEntries.length === 0) {
    return { entries: [], matchedProducts: [] }
  }

  // Fetch EMDN codes for each entry
  const emdnIds = [
    ...new Set(
      rawEntries
        .map((e) => e.emdn_leaf_category_id || e.emdn_category_id)
        .filter(Boolean)
    ),
  ] as string[]

  let emdnMap: Record<string, { code: string; name: string }> = {}
  if (emdnIds.length > 0) {
    const { data: emdnData } = await supabase
      .from('emdn_categories')
      .select('id, code, name')
      .in('id', emdnIds)

    if (emdnData) {
      emdnMap = Object.fromEntries(emdnData.map((e) => [e.id, { code: e.code, name: e.name }]))
    }
  }

  const entries: SetGroupEntry[] = rawEntries.map((e) => {
    const emdnId = e.emdn_leaf_category_id || e.emdn_category_id
    const emdn = emdnId ? emdnMap[emdnId] : null
    return {
      id: e.id,
      xc_subcode: e.xc_subcode,
      source_code: e.source_code,
      manufacturer_name: e.manufacturer_name,
      component_type: e.component_type,
      component_description: e.component_description,
      price_scope: e.price_scope,
      price_eur: e.price_eur,
      price_original: e.price_original,
      currency_original: e.currency_original,
      source_country: e.source_country,
      valid_from: e.valid_from,
      emdn_code: emdn?.code ?? null,
      emdn_name: emdn?.name ?? null,
    }
  })

  // Fetch matched products for these set reference prices
  const setIds = entries.map((e) => e.id)
  let matchedProducts: SetMatchedProduct[] = []

  // Paginate in batches of 500 to avoid Supabase limits
  for (let i = 0; i < setIds.length; i += 500) {
    const batch = setIds.slice(i, i + 500)
    const { data: matchData } = await supabase
      .from('product_price_matches')
      .select(`
        reference_price_id,
        match_score,
        match_reason,
        products!inner (
          id,
          name,
          manufacturer_name,
          sku,
          price
        )
      `)
      .in('reference_price_id', batch)
      .order('match_score', { ascending: false })

    if (matchData) {
      for (const m of matchData) {
        const p = m.products as unknown as {
          id: string
          name: string
          manufacturer_name: string | null
          sku: string | null
          price: number | null
        }
        matchedProducts.push({
          reference_price_id: m.reference_price_id,
          product_id: p.id,
          product_name: p.name,
          product_manufacturer: p.manufacturer_name,
          sku: p.sku,
          product_price: p.price,
          match_score: m.match_score,
          match_reason: m.match_reason,
        })
      }
    }
  }

  return { entries, matchedProducts }
}
