'use client';

interface CategorySuggestion {
  id: string;
  code: string;
  name: string;
  count: number;
}

interface CategoryChipsProps {
  suggestions: CategorySuggestion[];
  onSelect: (categoryId: string, categoryName: string) => void;
}

export function CategoryChips({ suggestions, onSelect }: CategoryChipsProps) {
  if (suggestions.length === 0) {
    return <p className="text-sm text-muted-foreground">No category suggestions available.</p>;
  }

  return (
    <div className="my-2">
      <p className="text-sm text-muted-foreground mb-2">
        Your search is broad. Select a category to narrow results:
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id, cat.name)}
            className="px-3 py-1.5 text-xs bg-muted hover:bg-accent hover:text-accent-foreground rounded-full border transition-colors"
          >
            {cat.name}
            <span className="ml-1 text-muted-foreground">({cat.count})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
