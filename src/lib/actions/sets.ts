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
      source_name,
      valid_from,
      notes,
      extraction_method,
      emdn_leaf_category_id,
      emdn_category_id
    `)
    .or('price_scope.eq.set,price_scope.eq.procedure,component_type.in.(set,revision_set)')
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
      source_name: e.source_name,
      valid_from: e.valid_from,
      notes: e.notes,
      extraction_method: e.extraction_method,
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
          offerings:product_offerings (vendor_price, currency)
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
          offerings: Array<{ vendor_price: number | null; currency: string }>
        }
        const priced = p.offerings.filter((o): o is typeof o & { vendor_price: number } => o.vendor_price !== null)
        matchedProducts.push({
          reference_price_id: m.reference_price_id,
          product_id: p.id,
          product_name: p.name,
          product_manufacturer: p.manufacturer_name,
          sku: p.sku,
          product_min_price: priced.length > 0 ? Math.min(...priced.map(o => o.vendor_price)) : null,
          product_offering_count: p.offerings.length,
          match_score: m.match_score,
          match_reason: m.match_reason,
        })
      }
    }
  }

  return { entries, matchedProducts }
}

// ─── Accept Decomposition ───

interface AcceptDecompositionInput {
  sourceEntryIds: string[]
  components: Array<{
    component_type: string
    emdn_code: string | null
    description: string
    estimated_price_eur: number
    fraction_of_set: number
    confidence: string
    reasoning: string
  }>
  procedureCost: {
    implant_total_eur: number
    procedure_only_eur: number
    confidence: string
    reasoning: string
  } | null
  sourceEntry: {
    source_country: string
    source_name: string | null
    valid_from: string | null
    source_code: string | null
    price_eur: number
    price_original: number
    currency_original: string
    xc_subcode: string | null
  }
}

export async function acceptDecomposition(
  input: AcceptDecompositionInput
): Promise<{ success: boolean; created: number; error?: string }> {
  const supabase = await createClient()

  const { sourceEntryIds, components, procedureCost, sourceEntry } = input

  // Resolve EMDN codes to IDs
  const emdnCodes = components.map((c) => c.emdn_code).filter(Boolean) as string[]
  let emdnCodeToId: Record<string, string> = {}

  if (emdnCodes.length > 0) {
    const { data: emdnData } = await supabase
      .from('emdn_categories')
      .select('id, code')
      .in('code', emdnCodes)

    if (emdnData) {
      emdnCodeToId = Object.fromEntries(emdnData.map((e) => [e.code, e.id]))
    }
  }

  // Mark originals as decomposed (append to existing notes)
  for (const id of sourceEntryIds) {
    const { data: existing } = await supabase
      .from('reference_prices')
      .select('notes')
      .eq('id', id)
      .single()

    const existingNotes = existing?.notes || ''
    const newNotes = existingNotes.includes('[decomposed]')
      ? existingNotes
      : `${existingNotes} [decomposed]`.trim()

    await supabase
      .from('reference_prices')
      .update({ notes: newNotes })
      .eq('id', id)
  }

  // Insert component rows
  let created = 0
  for (const comp of components) {
    const fraction = comp.fraction_of_set
    const originalPrice = sourceEntry.price_original * fraction

    const emdnId = comp.emdn_code ? emdnCodeToId[comp.emdn_code] : null

    const { error } = await supabase.from('reference_prices').insert({
      xc_subcode: sourceEntry.xc_subcode,
      source_code: sourceEntry.source_code ? `${sourceEntry.source_code}/component` : null,
      price_scope: 'component',
      price_eur: comp.estimated_price_eur,
      price_original: Math.round(originalPrice * 100) / 100,
      currency_original: sourceEntry.currency_original,
      source_country: sourceEntry.source_country,
      source_name: sourceEntry.source_name,
      valid_from: sourceEntry.valid_from,
      component_type: 'single_component',
      component_description: comp.description,
      extraction_method: 'ai_decomposition',
      notes: `[ai] ${comp.reasoning} (confidence: ${comp.confidence}, fraction: ${Math.round(fraction * 100)}%)`,
      emdn_leaf_category_id: emdnId,
      price_type: 'reimbursement_ceiling',
    })

    if (!error) created++
  }

  // Insert procedure-only entry if applicable
  if (procedureCost) {
    await supabase.from('reference_prices').insert({
      xc_subcode: sourceEntry.xc_subcode,
      source_code: sourceEntry.source_code ? `${sourceEntry.source_code}/procedure` : null,
      price_scope: 'procedure',
      price_eur: procedureCost.procedure_only_eur,
      price_original: 0,
      currency_original: sourceEntry.currency_original,
      source_country: sourceEntry.source_country,
      source_name: sourceEntry.source_name,
      valid_from: sourceEntry.valid_from,
      component_type: 'procedure_cost',
      component_description: 'Procedure cost (excl. implants)',
      extraction_method: 'ai_decomposition',
      notes: `[ai] ${procedureCost.reasoning} (confidence: ${procedureCost.confidence})`,
      price_type: 'reimbursement_ceiling',
    })
    created++
  }

  return { success: true, created }
}
