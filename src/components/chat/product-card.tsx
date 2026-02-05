'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { formatPrice } from '@/lib/utils/format-price';
import type { ProductWithRelations } from '@/lib/types';

interface ProductCardProps {
  product: ProductWithRelations;
  onCompare: (productId: string) => void;
  onViewInCatalog: (productId: string) => void;
}

export function ProductCard({ product, onCompare, onViewInCatalog }: ProductCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      className="border rounded-lg p-3 mb-2"
      layout
    >
      {/* Compact view */}
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium text-sm">{product.name}</h4>
          <p className="text-xs text-muted-foreground">
            {product.vendor?.name || 'Unknown vendor'} - {product.price !== null ? formatPrice(product.price, 'en') : 'Price N/A'}
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 hover:bg-muted rounded"
          aria-label={expanded ? 'Collapse details' : 'Expand details'}
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 pt-2 border-t overflow-hidden"
          >
            <dl className="text-xs space-y-1">
              <div><dt className="inline font-medium">SKU:</dt> <dd className="inline">{product.sku}</dd></div>
              <div><dt className="inline font-medium">Material:</dt> <dd className="inline">{product.material?.name || 'N/A'}</dd></div>
              <div><dt className="inline font-medium">EMDN:</dt> <dd className="inline">{product.emdn_category?.code || 'N/A'}</dd></div>
            </dl>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => onCompare(product.id)}
          className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded"
        >
          Compare prices
        </button>
        <button
          onClick={() => onViewInCatalog(product.id)}
          className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded"
        >
          View in catalog
        </button>
      </div>
    </motion.div>
  );
}
