'use server'

import { createClient } from '@/lib/supabase/server'
import type { BatchRow, BatchRowStatus } from '@/lib/types/batch-import'
import type { ExtractedProduct } from '@/lib/schemas/extraction'

// ── Types ──────────────────────────────────────────────────────────────

export interface SavedBatchImport {
  id: string
  file_name: string
  total_rows: number
  status: string
  created_at: string
  updated_at: string
}

interface SavedBatchRow {
  id: string
  batch_import_id: string
  row_index: number
  raw_data: Record<string, string>
  extracted_data: ExtractedProduct | null
  status: BatchRowStatus
  error: string | null
}

// ── Create ─────────────────────────────────────────────────────────────

export async function createBatchImport(
  fileName: string,
  rows: { rawData: Record<string, string>; rowIndex: number }[],
  headers?: string[]
): Promise<{ success: boolean; batchId?: string; error?: string }> {
  const supabase = await createClient()

  // Try with headers column first; fall back without if column doesn't exist yet
  let batch: { id: string } | null = null
  const insertData: Record<string, unknown> = {
    file_name: fileName,
    total_rows: rows.length,
    status: 'processing',
  }
  if (headers) insertData.headers = headers

  const { data: d1, error: e1 } = await supabase
    .from('batch_imports')
    .insert(insertData)
    .select('id')
    .single()

  if (e1 && headers && e1.message?.includes('headers')) {
    // headers column not migrated yet — retry without it
    const { file_name, total_rows, status } = insertData as { file_name: string; total_rows: number; status: string }
    const { data: d2, error: e2 } = await supabase
      .from('batch_imports')
      .insert({ file_name, total_rows, status })
      .select('id')
      .single()
    if (e2 || !d2) return { success: false, error: e2?.message || 'Failed to create batch' }
    batch = d2
  } else if (e1 || !d1) {
    return { success: false, error: e1?.message || 'Failed to create batch' }
  } else {
    batch = d1
  }

  const rowInserts = rows.map((r) => ({
    batch_import_id: batch.id,
    row_index: r.rowIndex,
    raw_data: r.rawData,
    status: 'pending' as const,
  }))

  // Insert in chunks of 500 to avoid payload limits
  for (let i = 0; i < rowInserts.length; i += 500) {
    const chunk = rowInserts.slice(i, i + 500)
    const { error } = await supabase.from('batch_import_rows').insert(chunk)
    if (error) {
      return { success: false, error: error.message }
    }
  }

  return { success: true, batchId: batch.id }
}

// ── Update row status ──────────────────────────────────────────────────

export async function updateBatchRow(
  batchId: string,
  rowIndex: number,
  update: {
    status: BatchRowStatus
    extracted_data?: ExtractedProduct | null
    error?: string | null
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('batch_import_rows')
    .update({
      status: update.status,
      ...(update.extracted_data !== undefined && { extracted_data: update.extracted_data }),
      ...(update.error !== undefined && { error: update.error }),
    })
    .eq('batch_import_id', batchId)
    .eq('row_index', rowIndex)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ── Mark batch completed/cancelled ─────────────────────────────────────

export async function updateBatchStatus(
  batchId: string,
  status: 'completed' | 'cancelled'
): Promise<void> {
  const supabase = await createClient()
  await supabase.from('batch_imports').update({ status }).eq('id', batchId)
}

// ── Get the currently processing batch (for resume on refresh) ────────

export async function getActiveBatch(): Promise<{
  id: string
  file_name: string
  total_rows: number
  processed: number
} | null> {
  const supabase = await createClient()
  const { data: batch } = await supabase
    .from('batch_imports')
    .select('id, file_name, total_rows')
    .eq('status', 'processing')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!batch) return null

  // Count non-pending rows to get progress
  const { count } = await supabase
    .from('batch_import_rows')
    .select('id', { count: 'exact', head: true })
    .eq('batch_import_id', batch.id)
    .neq('status', 'pending')

  return {
    id: batch.id,
    file_name: batch.file_name,
    total_rows: batch.total_rows,
    processed: count ?? 0,
  }
}

// ── Load open batches ──────────────────────────────────────────────────

export async function getOpenBatchImports(): Promise<SavedBatchImport[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('batch_imports')
    .select('*')
    .in('status', ['processing', 'completed'])
    .order('created_at', { ascending: false })
    .limit(10)

  return (data ?? []) as SavedBatchImport[]
}

// ── Load a single batch with rows ──────────────────────────────────────

export async function getBatchImportWithRows(
  batchId: string
): Promise<{ batch: SavedBatchImport; rows: BatchRow[] } | null> {
  const supabase = await createClient()

  const { data: batch } = await supabase
    .from('batch_imports')
    .select('*')
    .eq('id', batchId)
    .single()

  if (!batch) return null

  const { data: dbRows } = await supabase
    .from('batch_import_rows')
    .select('*')
    .eq('batch_import_id', batchId)
    .order('row_index', { ascending: true })

  const rows: BatchRow[] = ((dbRows ?? []) as SavedBatchRow[]).map((r) => ({
    id: `row-${r.row_index}`,
    rowIndex: r.row_index,
    rawData: r.raw_data,
    extracted: r.extracted_data,
    status: r.status,
    error: r.error ?? undefined,
  }))

  return { batch: batch as SavedBatchImport, rows }
}

// ── Delete batch ───────────────────────────────────────────────────────

export async function deleteBatchImport(
  batchId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  // Cascade deletes rows via FK
  const { error } = await supabase.from('batch_imports').delete().eq('id', batchId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
