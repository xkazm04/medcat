'use client'

import { Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface RegulatoryInfoProps {
  udiDi: string | null
  ceMarked: boolean
  mdrClass: 'I' | 'IIa' | 'IIb' | 'III' | null
}

export function RegulatoryInfo({ udiDi, ceMarked, mdrClass }: RegulatoryInfoProps) {
  const t = useTranslations('regulatory')
  const hasUdi = !!udiDi
  const hasMdrClass = !!mdrClass

  return (
    <div>
      <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground mb-3">
        {t('infoTitle')}
      </h3>

      <div className="flex items-center gap-4">
        {/* UDI-DI */}
        <div
          className="flex items-center gap-1.5"
          title={hasUdi ? t('udiRegistered', { udi: udiDi }) : t('udiNotRegistered')}
        >
          <Shield className={`h-4 w-4 ${hasUdi ? 'text-accent' : 'text-muted-foreground/40'}`} />
          <span className={`text-sm ${hasUdi ? 'text-foreground' : 'text-muted-foreground/60'}`}>
            {t('udiDi')}
          </span>
        </div>

        {/* CE Marking */}
        <div
          className="flex items-center gap-1.5"
          title={ceMarked ? t('ceEUMarket') : t('ceNotMarked')}
        >
          {ceMarked ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-muted-foreground/40" />
          )}
          <span className={`text-sm ${ceMarked ? 'text-foreground' : 'text-muted-foreground/60'}`}>
            {t('ce')}
          </span>
        </div>

        {/* MDR Class */}
        <div
          className="flex items-center gap-1.5"
          title={hasMdrClass ? t('mdrClassTitle', { mdrClass }) : t('mdrNotClassified')}
        >
          <AlertTriangle
            className={`h-4 w-4 ${hasMdrClass ? 'text-amber-500' : 'text-muted-foreground/40'}`}
          />
          <span className={`text-sm ${hasMdrClass ? 'text-foreground' : 'text-muted-foreground/60'}`}>
            {hasMdrClass ? `${t('mdrClass')} ${mdrClass}` : t('mdr')}
          </span>
        </div>
      </div>
    </div>
  )
}
