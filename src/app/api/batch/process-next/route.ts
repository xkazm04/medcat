import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractFromSpreadsheetRow } from '@/lib/actions/batch-extraction'

export const maxDuration = 60 // Allow up to 60s for LLM + EUDAMED lookup

export async function POST(request: NextRequest) {
  const { batchId } = await request.json()

  if (!batchId || typeof batchId !== 'string') {
    return NextResponse.json({ error: 'batchId is required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Get the batch to read headers and total
  // Try with headers column; fall back without if not migrated yet
  let batch: { id: string; headers?: string[] | null; total_rows: number; status: string } | null = null
  const { data: d1, error: e1 } = await supabase
    .from('batch_imports')
    .select('id, headers, total_rows, status')
    .eq('id', batchId)
    .single()

  if (e1 && e1.message?.includes('headers')) {
    const { data: d2 } = await supabase
      .from('batch_imports')
      .select('id, total_rows, status')
      .eq('id', batchId)
      .single()
    batch = d2 ? { ...d2, headers: null } : null
  } else {
    batch = d1
  }

  if (!batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
  }

  if (batch.status === 'cancelled') {
    return NextResponse.json({ done: true, cancelled: true })
  }

  // Find the next pending row (ordered by row_index to process in sequence)
  const { data: pendingRow } = await supabase
    .from('batch_import_rows')
    .select('id, row_index, raw_data')
    .eq('batch_import_id', batchId)
    .eq('status', 'pending')
    .order('row_index', { ascending: true })
    .limit(1)
    .single()

  if (!pendingRow) {
    // No more pending rows — mark batch completed
    await supabase
      .from('batch_imports')
      .update({ status: 'completed' })
      .eq('id', batchId)

    // Count totals for response
    const { count: processedCount } = await supabase
      .from('batch_import_rows')
      .select('id', { count: 'exact', head: true })
      .eq('batch_import_id', batchId)
      .neq('status', 'pending')

    return NextResponse.json({
      done: true,
      processed: processedCount ?? batch.total_rows,
      total: batch.total_rows,
      remaining: 0,
    })
  }

  // Mark row as processing
  await supabase
    .from('batch_import_rows')
    .update({ status: 'processing' })
    .eq('id', pendingRow.id)

  // Extract headers from batch or from raw_data keys
  const headers: string[] = batch.headers ?? Object.keys(pendingRow.raw_data)

  // Run extraction
  let status: 'extracted' | 'error' = 'extracted'
  let extractedData = null
  let errorMsg: string | null = null

  try {
    const result = await extractFromSpreadsheetRow(headers, pendingRow.raw_data)
    if (result.success && result.data) {
      extractedData = result.data
      status = 'extracted'
    } else {
      status = 'error'
      errorMsg = result.error ?? 'Extraction failed'
    }
  } catch (err) {
    status = 'error'
    errorMsg = err instanceof Error ? err.message : 'Unknown error'
  }

  // Update row in DB
  await supabase
    .from('batch_import_rows')
    .update({
      status,
      extracted_data: extractedData,
      error: errorMsg,
    })
    .eq('id', pendingRow.id)

  // Count remaining
  const { count: remainingCount } = await supabase
    .from('batch_import_rows')
    .select('id', { count: 'exact', head: true })
    .eq('batch_import_id', batchId)
    .eq('status', 'pending')

  const remaining = remainingCount ?? 0
  const processed = batch.total_rows - remaining

  return NextResponse.json({
    done: remaining === 0,
    processed,
    total: batch.total_rows,
    remaining,
    row: {
      rowIndex: pendingRow.row_index,
      status,
      error: errorMsg,
    },
  })
}
