'use client'

import { ChevronRight } from 'lucide-react'
import { toTitleCase } from '@/lib/utils/format-category'

interface EMDNBreadcrumbProps {
  path: string | null  // e.g., "P/P09/P0901/P090101"
  categoryName: string
  compact?: boolean  // For use in table cells
}

const levelDescriptions: Record<number, string> = {
  0: 'Category',
  1: 'Group',
  2: 'Type',
  3: 'Subtype',
  4: 'Variant',
  5: 'Detail',
  6: 'Specification',
}

export function EMDNBreadcrumb({ path, categoryName, compact = false }: EMDNBreadcrumbProps) {
  if (!path) {
    return <span className="text-muted-foreground italic">Not classified</span>
  }

  // Parse path into segments
  const segments = path.split('/').filter(Boolean)
  const formattedName = toTitleCase(categoryName)
  const level = levelDescriptions[segments.length - 1] || 'Classification'

  if (compact) {
    // Compact view: show only code and name
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {segments[segments.length - 1]}
        </code>
        <span className="text-foreground truncate">{formattedName}</span>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {/* Code breadcrumb */}
      <div className="flex items-center flex-wrap gap-0.5 text-xs font-mono">
        {segments.map((segment, index) => (
          <span key={segment} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-3 w-3 mx-0.5 text-muted-foreground/50" />
            )}
            <span
              className={
                index === segments.length - 1
                  ? 'text-accent font-medium'
                  : 'text-muted-foreground'
              }
            >
              {segment}
            </span>
          </span>
        ))}
      </div>

      {/* Human-readable name */}
      <p className="text-sm">
        <span className="text-muted-foreground">{level}:</span>{' '}
        <span className="text-foreground font-medium">{formattedName}</span>
      </p>
    </div>
  )
}
