'use client'

import { useTranslations } from 'next-intl'
import { ChevronRight } from 'lucide-react'
import { toTitleCase } from '@/lib/utils/format-category'

const levelKeys = ['level0', 'level1', 'level2', 'level3', 'level4', 'level5', 'level6'] as const;

/** Get the translated level label for a given EMDN depth (0-based segment count) */
function getLevelLabel(t: ReturnType<typeof useTranslations<'emdn'>>, segmentCount: number): string {
  const index = segmentCount - 1;
  return index >= 0 && index < levelKeys.length ? t(levelKeys[index]) : t('classification');
}

interface EMDNBreadcrumbProps {
  path: string | null  // e.g., "P/P09/P0901/P090101"
  categoryName: string
  compact?: boolean  // For use in table cells
}

export function EMDNBreadcrumb({ path, categoryName, compact = false }: EMDNBreadcrumbProps) {
  const t = useTranslations('emdn')

  if (!path) {
    return <span className="text-muted-foreground italic transition-colors">{t('notClassified')}</span>
  }

  // Parse path into segments
  const segments = path.split('/').filter(Boolean)
  const formattedName = toTitleCase(categoryName)
  const level = getLevelLabel(t, segments.length);

  if (compact) {
    // Compact view: show only code and name
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <code className="text-xs font-mono text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded transition-all hover:bg-muted">
          {segments[segments.length - 1]}
        </code>
        <span className="text-foreground truncate transition-colors">{formattedName}</span>
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
              <ChevronRight className="h-3 w-3 mx-0.5 text-muted-foreground/50 transition-opacity" />
            )}
            <span
              className={
                index === segments.length - 1
                  ? 'text-accent font-medium transition-colors'
                  : 'text-muted-foreground transition-colors hover:text-muted-foreground/80'
              }
            >
              {segment}
            </span>
          </span>
        ))}
      </div>

      {/* Human-readable name */}
      <p className="text-sm">
        <span className="text-muted-foreground transition-colors">{level}:</span>{' '}
        <span className="text-foreground font-medium transition-colors">{formattedName}</span>
      </p>
    </div>
  )
}
