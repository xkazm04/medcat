'use client'

import { useTranslations } from 'next-intl'
import { ChevronRight } from 'lucide-react'
import { toTitleCase } from '@/lib/utils/format-category'

interface EMDNBreadcrumbProps {
  path: string | null  // e.g., "P/P09/P0901/P090101"
  categoryName: string
  compact?: boolean  // For use in table cells
}

export function EMDNBreadcrumb({ path, categoryName, compact = false }: EMDNBreadcrumbProps) {
  const t = useTranslations('emdn')

  if (!path) {
    return <span className="text-muted-foreground italic">{t('notClassified')}</span>
  }

  // Parse path into segments
  const segments = path.split('/').filter(Boolean)
  const formattedName = toTitleCase(categoryName)
  const levelKey = `level${segments.length - 1}` as any;
  const level = t.has(levelKey) ? t(levelKey) : t('classification');

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
