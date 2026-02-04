"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Layers } from "lucide-react";
import type { Material } from "@/lib/types";

interface MaterialFilterProps {
  materials: Material[];
}

export function MaterialFilter({ materials }: MaterialFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedMaterials = searchParams.get("material")?.split(",").filter(Boolean) || [];
  const [searchQuery, setSearchQuery] = useState("");

  // Filter materials by search query
  const filteredMaterials = useMemo(() => {
    if (!searchQuery) return materials;
    const query = searchQuery.toLowerCase();
    return materials.filter((m) =>
      m.name.toLowerCase().includes(query) ||
      m.code?.toLowerCase().includes(query)
    );
  }, [materials, searchQuery]);

  const handleChange = (materialId: string, checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    let newSelected: string[];

    if (checked) {
      newSelected = [...selectedMaterials, materialId];
    } else {
      newSelected = selectedMaterials.filter((id) => id !== materialId);
    }

    if (newSelected.length > 0) {
      params.set("material", newSelected.join(","));
    } else {
      params.delete("material");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const clearSelection = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("material");
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  if (materials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-center">
        <Layers className="h-6 w-6 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No materials available</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Search input (show only if many materials) */}
      {materials.length > 5 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search materials..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-md bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/50 transition-colors"
          />
        </div>
      )}

      {/* Selection summary */}
      {selectedMaterials.length > 0 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {selectedMaterials.length} selected
          </span>
          <button
            onClick={clearSelection}
            className="text-accent hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* Material list */}
      <div className="space-y-1 max-h-[200px] overflow-y-auto scrollbar-thin">
        {filteredMaterials.map((material) => {
          const isSelected = selectedMaterials.includes(material.id);
          return (
            <label
              key={material.id}
              className={`
                flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer
                transition-colors duration-150
                ${isSelected ? "bg-accent/10" : "hover:bg-muted"}
              `}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => handleChange(material.id, e.target.checked)}
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent/20 cursor-pointer"
              />
              <span className={`text-sm flex-1 truncate ${isSelected ? "text-accent font-medium" : "text-foreground"}`}>
                {material.name}
              </span>
              {material.code && (
                <span className="text-xs text-muted-foreground font-mono">
                  {material.code}
                </span>
              )}
            </label>
          );
        })}

        {filteredMaterials.length === 0 && searchQuery && (
          <p className="text-sm text-muted-foreground text-center py-2">
            No materials match "{searchQuery}"
          </p>
        )}
      </div>
    </div>
  );
}
