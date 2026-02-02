'use client';

import { useEffect, useMemo } from 'react';
import { MAPPABLE_FIELDS } from '@/lib/schemas/import';
import { type CSVRow } from '@/lib/utils/csv-parser';

interface ColumnMappingStepProps {
  /** CSV column headers from parse */
  headers: string[];
  /** Mapping from product field to CSV column */
  mapping: Record<string, string>;
  /** Callback when mapping changes */
  onMappingChange: (mapping: Record<string, string>) => void;
  /** First few rows for preview */
  previewData: CSVRow[];
}

/**
 * Auto-detection patterns for mapping CSV columns to product fields.
 * Maps field key to array of lowercase patterns to match against headers.
 */
const AUTO_DETECT_PATTERNS: Record<string, string[]> = {
  name: ['name', 'product name', 'product_name', 'productname', 'item name', 'item_name'],
  sku: ['sku', 'product sku', 'product_sku', 'item code', 'item_code', 'itemcode', 'code'],
  description: ['description', 'desc', 'product description', 'product_description'],
  price: ['price', 'unit price', 'unit_price', 'unitprice', 'cost', 'amount'],
  manufacturer_name: ['manufacturer', 'manufacturer name', 'manufacturer_name', 'mfr', 'mfg', 'brand'],
  manufacturer_sku: ['manufacturer sku', 'manufacturer_sku', 'mfr sku', 'mfr_sku', 'mfg_sku', 'mfg sku'],
};

/**
 * Try to auto-detect column mappings based on header names.
 */
function autoDetectMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

  for (const [fieldKey, patterns] of Object.entries(AUTO_DETECT_PATTERNS)) {
    for (const pattern of patterns) {
      const headerIndex = lowerHeaders.findIndex((h) => h === pattern);
      if (headerIndex !== -1) {
        mapping[fieldKey] = headers[headerIndex];
        break;
      }
    }
  }

  return mapping;
}

/**
 * Column mapping step for CSV import wizard.
 * Allows user to map CSV columns to product fields via dropdowns.
 * Auto-detects common column names on mount.
 */
export function ColumnMappingStep({
  headers,
  mapping,
  onMappingChange,
  previewData,
}: ColumnMappingStepProps) {
  // Auto-detect mapping on initial mount
  useEffect(() => {
    if (Object.keys(mapping).length === 0) {
      const autoMapping = autoDetectMapping(headers);
      if (Object.keys(autoMapping).length > 0) {
        onMappingChange(autoMapping);
      }
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check required fields validation
  const requiredErrors = useMemo(() => {
    const errors: Record<string, boolean> = {};
    for (const field of MAPPABLE_FIELDS) {
      if (field.required && !mapping[field.key]) {
        errors[field.key] = true;
      }
    }
    return errors;
  }, [mapping]);

  const handleFieldChange = (fieldKey: string, csvColumn: string) => {
    const newMapping = { ...mapping };
    if (csvColumn === '') {
      delete newMapping[fieldKey];
    } else {
      newMapping[fieldKey] = csvColumn;
    }
    onMappingChange(newMapping);
  };

  // Get preview rows with mapped values
  const previewRows = useMemo(() => {
    return previewData.slice(0, 5).map((row, index) => {
      const mappedValues: Record<string, string> = {};
      for (const field of MAPPABLE_FIELDS) {
        const csvColumn = mapping[field.key];
        mappedValues[field.key] = csvColumn ? (row[csvColumn] || '') : '';
      }
      return { index, mappedValues };
    });
  }, [previewData, mapping]);

  return (
    <div className="space-y-6">
      {/* Mapping form */}
      <div className="border border-border rounded-lg p-4">
        <h3 className="font-medium mb-4">Map CSV Columns to Product Fields</h3>
        <div className="grid gap-4">
          {MAPPABLE_FIELDS.map((field) => (
            <div key={field.key} className="grid grid-cols-2 gap-4 items-center">
              <label
                htmlFor={`map-${field.key}`}
                className="text-sm font-medium"
              >
                {field.label}
                {field.required && (
                  <span className="text-red-500 ml-1" aria-label="required">
                    *
                  </span>
                )}
              </label>
              <select
                id={`map-${field.key}`}
                value={mapping[field.key] || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                className={`px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent ${
                  requiredErrors[field.key]
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-border'
                }`}
              >
                <option value="">-- Not mapped --</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        {Object.keys(requiredErrors).length > 0 && (
          <p className="text-sm text-red-500 mt-4">
            Please map all required fields (marked with *)
          </p>
        )}
      </div>

      {/* Preview table */}
      {previewRows.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-2 border-b border-border">
            <h3 className="font-medium text-sm">Preview (first {previewRows.length} rows)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    #
                  </th>
                  {MAPPABLE_FIELDS.filter((f) => mapping[f.key]).map((field) => (
                    <th
                      key={field.key}
                      className="px-3 py-2 text-left font-medium text-muted-foreground"
                    >
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr
                    key={row.index}
                    className={i % 2 === 0 ? '' : 'bg-muted/30'}
                  >
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.index + 1}
                    </td>
                    {MAPPABLE_FIELDS.filter((f) => mapping[f.key]).map((field) => (
                      <td key={field.key} className="px-3 py-2 truncate max-w-xs">
                        {row.mappedValues[field.key] || (
                          <span className="text-muted-foreground italic">empty</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
