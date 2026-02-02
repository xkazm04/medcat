"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight } from "lucide-react";
import type { CategoryNode } from "@/lib/queries";

interface CategoryTreeProps {
  categories: CategoryNode[];
}

interface CategoryNodeProps {
  category: CategoryNode;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  depth?: number;
}

function CategoryNodeComponent({
  category,
  selectedId,
  onSelect,
  depth = 0,
}: CategoryNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = category.children && category.children.length > 0;
  const isSelected = selectedId === category.id;

  const handleClick = () => {
    if (isSelected) {
      // Deselect if clicking the selected category
      onSelect(null);
    } else {
      onSelect(category.id);
    }
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={`flex items-center gap-1.5 w-full px-2 py-1.5 text-sm rounded-md transition-colors duration-150 text-left ${
          isSelected
            ? "bg-accent/10 text-accent font-medium"
            : "text-foreground hover:bg-muted"
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {hasChildren && (
          <motion.span
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.15 }}
          >
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </motion.span>
        )}
        {!hasChildren && <span className="w-3.5" />}
        <span className="truncate">{category.name}</span>
      </button>

      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {category.children.map((child) => (
              <CategoryNodeComponent
                key={child.id}
                category={child}
                selectedId={selectedId}
                onSelect={onSelect}
                depth={depth + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CategoryTree({ categories }: CategoryTreeProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("category");

  const handleSelect = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("category", id);
    } else {
      params.delete("category");
    }
    params.set("page", "1"); // Reset to first page
    router.push(`?${params.toString()}`);
  };

  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic py-2">No categories available</p>
    );
  }

  return (
    <div className="space-y-0.5 max-h-[280px] overflow-y-auto pr-1 -mr-1">
      {categories.map((category) => (
        <CategoryNodeComponent
          key={category.id}
          category={category}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}
