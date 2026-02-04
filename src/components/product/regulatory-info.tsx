'use client'

import { Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

interface RegulatoryInfoProps {
  udiDi: string | null
  ceMarked: boolean
  mdrClass: 'I' | 'IIa' | 'IIb' | 'III' | null
}

export function RegulatoryInfo({ udiDi, ceMarked, mdrClass }: RegulatoryInfoProps) {
  const hasUdi = !!udiDi
  const hasMdrClass = !!mdrClass

  return (
    <div>
      <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground mb-3">
        Regulatory Information
      </h3>

      <div className="flex items-center gap-4">
        {/* UDI-DI */}
        <div
          className="flex items-center gap-1.5"
          title={hasUdi ? `UDI-DI: ${udiDi}` : 'UDI-DI: Not registered'}
        >
          <Shield className={`h-4 w-4 ${hasUdi ? 'text-accent' : 'text-muted-foreground/40'}`} />
          <span className={`text-sm ${hasUdi ? 'text-foreground' : 'text-muted-foreground/60'}`}>
            UDI
          </span>
        </div>

        {/* CE Marking */}
        <div
          className="flex items-center gap-1.5"
          title={ceMarked ? 'CE marked for EU market' : 'Not CE marked'}
        >
          {ceMarked ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-muted-foreground/40" />
          )}
          <span className={`text-sm ${ceMarked ? 'text-foreground' : 'text-muted-foreground/60'}`}>
            CE
          </span>
        </div>

        {/* MDR Class */}
        <div
          className="flex items-center gap-1.5"
          title={hasMdrClass ? `MDR Class ${mdrClass}` : 'MDR: Not classified'}
        >
          <AlertTriangle
            className={`h-4 w-4 ${hasMdrClass ? 'text-amber-500' : 'text-muted-foreground/40'}`}
          />
          <span className={`text-sm ${hasMdrClass ? 'text-foreground' : 'text-muted-foreground/60'}`}>
            {hasMdrClass ? `Class ${mdrClass}` : 'MDR'}
          </span>
        </div>
      </div>
    </div>
  )
}
