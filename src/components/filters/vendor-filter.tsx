"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Building2 } from "lucide-react";
import type { Vendor } from "@/lib/types";

interface VendorFilterProps {
  vendors: Vendor[];
}

export function VendorFilter({ vendors }: VendorFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedVendors = searchParams.get("vendor")?.split(",").filter(Boolean) || [];
  const [searchQuery, setSearchQuery] = useState("");

  // Filter vendors by search query
  const filteredVendors = useMemo(() => {
    if (!searchQuery) return vendors;
    const query = searchQuery.toLowerCase();
    return vendors.filter((v) =>
      v.name.toLowerCase().includes(query) ||
      v.code?.toLowerCase().includes(query)
    );
  }, [vendors, searchQuery]);

  const handleChange = (vendorId: string, checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    let newSelected: string[];

    if (checked) {
      newSelected = [...selectedVendors, vendorId];
    } else {
      newSelected = selectedVendors.filter((id) => id !== vendorId);
    }

    if (newSelected.length > 0) {
      params.set("vendor", newSelected.join(","));
    } else {
      params.delete("vendor");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const clearSelection = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("vendor");
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  if (vendors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-center">
        <Building2 className="h-6 w-6 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No vendors available</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Search input (show only if many vendors) */}
      {vendors.length > 5 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vendors..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-md bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/50 transition-colors"
          />
        </div>
      )}

      {/* Selection summary */}
      {selectedVendors.length > 0 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {selectedVendors.length} selected
          </span>
          <button
            onClick={clearSelection}
            className="text-accent hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* Vendor list */}
      <div className="space-y-1 max-h-[200px] overflow-y-auto scrollbar-thin">
        {filteredVendors.map((vendor) => {
          const isSelected = selectedVendors.includes(vendor.id);
          return (
            <label
              key={vendor.id}
              className={`
                flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer
                transition-colors duration-150
                ${isSelected ? "bg-accent/10" : "hover:bg-muted"}
              `}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => handleChange(vendor.id, e.target.checked)}
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent/20 cursor-pointer"
              />
              <span className={`text-sm flex-1 truncate ${isSelected ? "text-accent font-medium" : "text-foreground"}`}>
                {vendor.name}
              </span>
              {vendor.code && (
                <span className="text-xs text-muted-foreground font-mono">
                  {vendor.code}
                </span>
              )}
            </label>
          );
        })}

        {filteredVendors.length === 0 && searchQuery && (
          <p className="text-sm text-muted-foreground text-center py-2">
            No vendors match "{searchQuery}"
          </p>
        )}
      </div>
    </div>
  );
}
