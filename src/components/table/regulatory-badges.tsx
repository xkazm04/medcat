"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { Shield, ShieldCheck } from "lucide-react";

interface RegulatoryBadgesProps {
  ceMarked: boolean;
  mdrClass: "I" | "IIa" | "IIb" | "III" | null;
}

const MDR_CLASS_COLORS: Record<string, string> = {
  I: "bg-green-100 text-green-700 border-green-200",
  IIa: "bg-yellow-100 text-yellow-700 border-yellow-200",
  IIb: "bg-orange-100 text-orange-700 border-orange-200",
  III: "bg-red-100 text-red-700 border-red-200",
};

export const RegulatoryBadges = memo(function RegulatoryBadges({
  ceMarked,
  mdrClass,
}: RegulatoryBadgesProps) {
  const t = useTranslations('regulatory');

  if (!ceMarked && !mdrClass) {
    return <span className="text-muted-foreground/40 text-sm">—</span>;
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* CE Mark Badge */}
      {ceMarked && (
        <div
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200"
          title={t('ceMarked')}
        >
          <ShieldCheck className="h-3 w-3" />
          <span>CE</span>
        </div>
      )}

      {/* MDR Class Badge */}
      {mdrClass && (
        <div
          className={`px-1.5 py-0.5 rounded text-xs font-medium border ${MDR_CLASS_COLORS[mdrClass] || "bg-muted text-muted-foreground border-border"}`}
          title={`${t('mdrClass')} ${mdrClass}`}
        >
          {mdrClass}
        </div>
      )}
    </div>
  );
});
