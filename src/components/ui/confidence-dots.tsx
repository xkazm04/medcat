'use client'

import type { ReferencePrice } from '@/lib/types'

interface ConfidenceDotsProps {
  matchType: ReferencePrice['match_type']
  /** Show label text next to dots */
  showLabel?: boolean
}

/**
 * Signal-strength style confidence indicator for price match quality.
 * 3 filled dots = product match (high confidence)
 * 2 filled dots = category match (medium)
 * 1 filled dot  = broad/ancestor match (low)
 */
export function ConfidenceDots({ matchType, showLabel = false }: ConfidenceDotsProps) {
  const { level, color, label } = getConfidenceInfo(matchType)

  return (
    <span className="inline-flex items-center gap-1" title={label}>
      <span className="inline-flex items-center gap-[2px]">
        {[1, 2, 3].map((dot) => (
          <span
            key={dot}
            className={`inline-block w-[5px] h-[5px] rounded-full ${
              dot <= level ? color : 'bg-border'
            }`}
          />
        ))}
      </span>
      {showLabel && (
        <span className={`text-[10px] ${getLabelColor(matchType)}`}>{label}</span>
      )}
    </span>
  )
}

function getConfidenceInfo(matchType: ReferencePrice['match_type']): {
  level: number
  color: string
  label: string
} {
  switch (matchType) {
    case 'product_match':
    case 'product_direct':
      return { level: 3, color: 'bg-green-500', label: 'Matched' }
    case 'category_leaf':
    case 'category_exact':
      return { level: 2, color: 'bg-blue-500', label: 'Category' }
    case 'category_ancestor':
      return { level: 1, color: 'bg-amber-400', label: 'Broad' }
    default:
      return { level: 0, color: 'bg-border', label: '' }
  }
}

function getLabelColor(matchType: ReferencePrice['match_type']): string {
  switch (matchType) {
    case 'product_match':
    case 'product_direct':
      return 'text-green-600'
    case 'category_leaf':
    case 'category_exact':
      return 'text-blue-600'
    case 'category_ancestor':
      return 'text-amber-600'
    default:
      return 'text-muted-foreground'
  }
}
