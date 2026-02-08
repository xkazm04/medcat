'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocale } from 'next-intl';
import { ChevronDown, ShieldCheck, ExternalLink } from 'lucide-react';
import { formatPrice } from '@/lib/utils/format-price';
import type { ProductWithRelations } from '@/lib/types';

const MDR_COLORS: Record<string, string> = {
  I: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  IIa: 'bg-sky-100 text-sky-700 border-sky-200',
  IIb: 'bg-amber-100 text-amber-700 border-amber-200',
  III: 'bg-rose-100 text-rose-700 border-rose-200',
};

interface ProductCardProps {
  product: ProductWithRelations;
  onCompare: (productId: string) => void;
  onViewInCatalog: (product: ProductWithRelations) => void;
}

export function ProductCard({ product, onCompare, onViewInCatalog }: ProductCardProps) {
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      className={`border rounded-lg overflow-hidden mb-2 border-l-4 ${
        product.ce_marked ? 'border-l-accent' : 'border-l-amber-400'
      }`}
      layout
    >
      <div className="p-3">
        {/* Header row */}
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-sm leading-tight truncate">{product.name}</h4>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {product.vendor?.name || 'Unknown vendor'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {product.price !== null && (
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {formatPrice(product.price, locale)}
              </span>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 hover:bg-muted rounded transition-colors"
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-1.5 mt-2">
          {product.ce_marked && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 border border-blue-200 rounded">
              <ShieldCheck className="w-3 h-3" />
              CE
            </span>
          )}
          {product.mdr_class && (
            <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border rounded ${
              MDR_COLORS[product.mdr_class] || 'bg-muted text-muted-foreground border-border'
            }`}>
              {product.mdr_class}
            </span>
          )}
          {product.material?.name && (
            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground border border-border/60 rounded">
              {product.material.name}
            </span>
          )}
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-2.5 border-t border-border/60">
                {product.description && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
                )}
                <dl className="text-xs space-y-1 text-muted-foreground">
                  <div className="flex gap-2">
                    <dt className="font-medium text-foreground/70 shrink-0">SKU:</dt>
                    <dd className="font-mono truncate">{product.sku}</dd>
                  </div>
                  {product.emdn_category && (
                    <div className="flex gap-2">
                      <dt className="font-medium text-foreground/70 shrink-0">EMDN:</dt>
                      <dd className="truncate">{product.emdn_category.code} - {product.emdn_category.name}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex gap-2 mt-2.5 pt-2 border-t border-border/40">
          <button
            onClick={() => onCompare(product.id)}
            className="text-xs px-2.5 py-1.5 font-medium text-muted-foreground bg-muted hover:bg-muted/80 hover:text-foreground rounded-md transition-colors"
          >
            Compare prices
          </button>
          <button
            onClick={() => onViewInCatalog(product)}
            className="text-xs px-2.5 py-1.5 font-medium text-accent bg-green-light hover:bg-green-light/80 rounded-md transition-colors flex items-center gap-1"
          >
            Open in catalog
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
