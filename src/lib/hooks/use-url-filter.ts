import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

/**
 * Custom hook for managing URL search parameters with automatic page reset.
 * Provides a consistent interface for filter components to update URL params.
 *
 * @param paramKey - The URL parameter key to manage (e.g., "vendor", "category")
 * @returns Tuple of [currentValue, setValue, clearValue]
 *
 * @example
 * // Single value filter
 * const [category, setCategory, clearCategory] = useUrlFilter("category");
 * setCategory("some-id");
 *
 * @example
 * // Multi-value filter (comma-separated)
 * const [vendors, setVendors, clearVendors] = useUrlFilter("vendor");
 * setVendors(["id1", "id2"].join(","));
 */
export function useUrlFilter(paramKey: string) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get current value from URL params
  const currentValue = searchParams.get(paramKey) || "";

  /**
   * Set a new value for the parameter.
   * Automatically resets page to 1 and updates the URL.
   * Pass null or empty string to delete the parameter.
   */
  const setValue = useCallback(
    (value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value) {
        params.set(paramKey, value);
      } else {
        params.delete(paramKey);
      }

      // Always reset to page 1 when filters change
      params.set("page", "1");

      router.push(`?${params.toString()}`);
    },
    [paramKey, router, searchParams]
  );

  /**
   * Clear the parameter from the URL.
   * Automatically resets page to 1 and updates the URL.
   */
  const clearValue = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(paramKey);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  }, [paramKey, router, searchParams]);

  return [currentValue, setValue, clearValue] as const;
}

/**
 * Custom hook for managing multi-value URL search parameters (comma-separated).
 * Provides helper methods for adding/removing individual values.
 *
 * @param paramKey - The URL parameter key to manage (e.g., "vendor", "manufacturer")
 * @param options - Optional configuration
 * @param options.encode - Whether to encode/decode values with encodeURIComponent (default: false)
 * @returns Object with current values array and manipulation methods
 *
 * @example
 * const { values, toggleValue, clearValues } = useUrlFilterMulti("vendor");
 * toggleValue("vendor-id-1", true);  // Add
 * toggleValue("vendor-id-2", false); // Remove
 *
 * @example
 * // With URL encoding for special characters
 * const { values, setValues } = useUrlFilterMulti("manufacturer", { encode: true });
 */
export function useUrlFilterMulti(
  paramKey: string,
  options: { encode?: boolean } = {}
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { encode = false } = options;

  // Parse current values from URL (comma-separated)
  const rawValues = searchParams.get(paramKey)?.split(",").filter(Boolean) || [];
  const values = encode ? rawValues.map(decodeURIComponent) : rawValues;

  /**
   * Toggle a value in the multi-value parameter.
   * @param value - The value to add or remove
   * @param checked - True to add, false to remove
   */
  const toggleValue = useCallback(
    (value: string, checked: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      let newValues: string[];

      if (checked) {
        newValues = [...values, value];
      } else {
        newValues = values.filter((v) => v !== value);
      }

      const encodedValues = encode ? newValues.map(encodeURIComponent) : newValues;

      if (encodedValues.length > 0) {
        params.set(paramKey, encodedValues.join(","));
      } else {
        params.delete(paramKey);
      }

      params.set("page", "1");
      router.push(`?${params.toString()}`);
    },
    [paramKey, router, searchParams, values, encode]
  );

  /**
   * Set multiple values at once.
   * @param newValues - Array of values to set
   */
  const setValues = useCallback(
    (newValues: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      const encodedValues = encode ? newValues.map(encodeURIComponent) : newValues;

      if (encodedValues.length > 0) {
        params.set(paramKey, encodedValues.join(","));
      } else {
        params.delete(paramKey);
      }

      params.set("page", "1");
      router.push(`?${params.toString()}`);
    },
    [paramKey, router, searchParams, encode]
  );

  /**
   * Clear all values for this parameter.
   */
  const clearValues = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(paramKey);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  }, [paramKey, router, searchParams]);

  return {
    values,
    toggleValue,
    setValues,
    clearValues,
  };
}

/**
 * Custom hook for managing multiple URL params atomically in a single navigation.
 * Useful for coupled filters like price range (minPrice + maxPrice).
 *
 * @param paramKeys - Array of URL parameter keys to manage
 * @returns Object with current values record, setParams, and clearParams
 *
 * @example
 * const { values, setParams, clearParams } = useUrlFilterBatch(["minPrice", "maxPrice"]);
 * setParams({ minPrice: "1000", maxPrice: "5000" });
 * clearParams(); // clears both
 */
export function useUrlFilterBatch(paramKeys: string[]) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Current values as a record
  const values = useMemo(() => {
    const result: Record<string, string> = {};
    for (const key of paramKeys) {
      result[key] = searchParams.get(key) || "";
    }
    return result;
  }, [paramKeys, searchParams]);

  /**
   * Set multiple params at once in a single navigation.
   * Empty/null values delete the param.
   */
  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }

      params.set("page", "1");
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  /**
   * Clear all managed params in a single navigation.
   */
  const clearParams = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of paramKeys) {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  }, [paramKeys, router, searchParams]);

  return { values, setParams, clearParams };
}
