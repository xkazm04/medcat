'use client';

interface QuickActionsProps {
  productCount: number;
  onCompare: () => void;
  onShowMore: () => void;
  onFilterManufacturer: () => void;
}

export function QuickActions({
  productCount,
  onCompare,
  onShowMore,
  onFilterManufacturer,
}: QuickActionsProps) {
  if (productCount === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
      {productCount > 1 && (
        <button
          onClick={onCompare}
          className="px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted transition-colors"
        >
          Compare prices
        </button>
      )}
      {productCount >= 5 && (
        <button
          onClick={onShowMore}
          className="px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted transition-colors"
        >
          Show more
        </button>
      )}
      <button
        onClick={onFilterManufacturer}
        className="px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted transition-colors"
      >
        Filter by manufacturer
      </button>
    </div>
  );
}
