"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useDebounceValue } from "usehooks-ts";
import { useUrlFilterBatch } from "@/lib/hooks/use-url-filter";

const PRICE_KEYS = ["minPrice", "maxPrice"] as const;

export function PriceRangeFilter() {
  const t = useTranslations("filters");
  const { values: urlValues, setParams } = useUrlFilterBatch([...PRICE_KEYS]);

  const [minPrice, setMinPrice] = useState(urlValues.minPrice);
  const [maxPrice, setMaxPrice] = useState(urlValues.maxPrice);

  const [debouncedMin] = useDebounceValue(minPrice, 500);
  const [debouncedMax] = useDebounceValue(maxPrice, 500);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (urlValues.minPrice === debouncedMin && urlValues.maxPrice === debouncedMax) {
      return;
    }

    setParams({
      minPrice: debouncedMin || null,
      maxPrice: debouncedMax || null,
    });
  }, [debouncedMin, debouncedMax, urlValues.minPrice, urlValues.maxPrice, setParams]);

  const hasValues = minPrice || maxPrice;

  const handleClear = () => {
    setMinPrice("");
    setMaxPrice("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label htmlFor="min-price" className="sr-only">{t("min")}</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {t("currencySymbol")}
            </span>
            <input
              id="min-price"
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder={t("min")}
              min="0"
              data-testid="min-price-input"
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>

        <span className="text-muted-foreground text-sm">–</span>

        <div className="flex-1">
          <label htmlFor="max-price" className="sr-only">{t("max")}</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {t("currencySymbol")}
            </span>
            <input
              id="max-price"
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder={t("max")}
              min="0"
              data-testid="max-price-input"
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>
      </div>

      {/* Quick presets */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { label: "< 1000", min: "", max: "1000" },
          { label: "1k-5k", min: "1000", max: "5000" },
          { label: "5k-10k", min: "5000", max: "10000" },
          { label: "> 10k", min: "10000", max: "" },
        ].map((preset) => {
          const isActive = minPrice === preset.min && maxPrice === preset.max;
          return (
            <button
              key={preset.label}
              onClick={() => {
                setMinPrice(preset.min);
                setMaxPrice(preset.max);
              }}
              className={`
                px-2 py-1 text-xs rounded-md border transition-colors
                ${isActive
                  ? "bg-accent text-accent-foreground border-accent"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }
              `}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Clear button */}
      {hasValues && (
        <button
          onClick={handleClear}
          className="text-xs text-accent hover:underline"
        >
          {t("clearPriceRange")}
        </button>
      )}
    </div>
  );
}
