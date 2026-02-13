import type { ExtractedProduct } from '@/lib/schemas/extraction'

export type BatchRowStatus = 'pending' | 'processing' | 'extracted' | 'accepted' | 'skipped' | 'error'
export type BatchFilterStatus = 'all' | 'pending' | 'extracted' | 'accepted' | 'skipped' | 'error'

export interface BatchRow {
  id: string
  rowIndex: number
  rawData: Record<string, string>
  extracted: ExtractedProduct | null
  status: BatchRowStatus
  error?: string
}

export interface ParsedSpreadsheet {
  headers: string[]
  rows: Record<string, string>[]
  fileName: string
  totalRows: number
  /** Whether to use EUDAMED web search for EMDN classification (default true) */
  webSearch?: boolean
}
