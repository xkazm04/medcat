'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Check, AlertTriangle, X, Loader2, RefreshCw } from 'lucide-react';
import { type CSVRow } from '@/lib/utils/csv-parser';
import { importRowSchema, MAPPABLE_FIELDS, type ImportRow } from '@/lib/schemas/import';
import { checkExistingProducts } from '@/lib/actions/import';
import { useTranslations } from 'next-intl';

interface ValidationStepProps {
  /** Full parsed CSV data */
  data: CSVRow[];
  /** Mapping from product field to CSV column */
  mapping: Record<string, string>;
  /** Selected vendor ID for deduplication check */
  vendorId: string;
  /** Callback when validation completes */
  onValidationComplete: (validRows: ImportRow[], existingCount: number) => void;
}

interface ValidationError {
  field: string;
  message: string;
}

interface ValidatedRow {
  rowIndex: number;
  status: 'valid' | 'update' | 'error';
  data: ImportRow | null;
  errors: ValidationError[];
  originalRow: CSVRow;
}

/**
 * Validation step for CSV import wizard.
 * Validates all rows against import schema and checks for existing products.
 * Shows row-level status with error highlighting.
 */
export function ValidationStep({
  data,
  mapping,
  vendorId,
  onValidationComplete,
}: ValidationStepProps) {
  const t = useTranslations("import");
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([]);
  const [isValidating, setIsValidating] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Map CSV row to product fields using mapping
  const mapRowToProduct = useCallback(
    (row: CSVRow, rowIndex: number): Record<string, unknown> => {
      const mapped: Record<string, unknown> = {
        _rowIndex: rowIndex,
        ce_marked: false,
      };

      for (const field of MAPPABLE_FIELDS) {
        const csvColumn = mapping[field.key];
        if (csvColumn && row[csvColumn] !== undefined) {
          const value = row[csvColumn].trim();
          // Convert empty strings to undefined for optional fields
          if (value === '' && !field.required) {
            mapped[field.key] = null;
          } else {
            mapped[field.key] = value;
          }
        }
      }

      // Set vendor_id from props (not from CSV)
      mapped.vendor_id = vendorId;

      return mapped;
    },
    [mapping, vendorId]
  );

  // Run validation on data change
  useEffect(() => {
    let cancelled = false;

    async function validate() {
      setIsValidating(true);

      // Step 1: Validate all rows against schema
      const tempValidated: ValidatedRow[] = [];
      const validSkus: string[] = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const mapped = mapRowToProduct(row, i);
        const result = importRowSchema.safeParse(mapped);

        if (result.success) {
          tempValidated.push({
            rowIndex: i,
            status: 'valid', // Will update after SKU check
            data: result.data,
            errors: [],
            originalRow: row,
          });
          validSkus.push(result.data.sku);
        } else {
          tempValidated.push({
            rowIndex: i,
            status: 'error',
            data: null,
            errors: result.error.issues.map((issue) => ({
              field: issue.path.join('.') || 'unknown',
              message: issue.message,
            })),
            originalRow: row,
          });
        }
      }

      if (cancelled) return;

      // Step 2: Check for existing products
      let existing = new Map<string, string>();
      if (validSkus.length > 0) {
        try {
          existing = await checkExistingProducts(validSkus, vendorId);
        } catch (error) {
          console.error('Error checking existing products:', error);
        }
      }

      if (cancelled) return;

      // Step 3: Update status for existing SKUs
      for (const vr of tempValidated) {
        if (vr.status === 'valid' && vr.data && existing.has(vr.data.sku)) {
          vr.status = 'update';
        }
      }

      setValidatedRows(tempValidated);
      setIsValidating(false);

      // Call completion callback with valid rows
      const validRows = tempValidated
        .filter((vr) => vr.status === 'valid' || vr.status === 'update')
        .map((vr) => vr.data as ImportRow);
      const existingCount = tempValidated.filter((vr) => vr.status === 'update').length;

      onValidationComplete(validRows, existingCount);
    }

    validate();

    return () => {
      cancelled = true;
    };
  }, [data, mapping, vendorId, mapRowToProduct, onValidationComplete]);

  // Summary stats
  const stats = useMemo(() => {
    const valid = validatedRows.filter((r) => r.status === 'valid').length;
    const update = validatedRows.filter((r) => r.status === 'update').length;
    const errors = validatedRows.filter((r) => r.status === 'error').length;
    return { valid, update, errors, total: validatedRows.length };
  }, [validatedRows]);

  // Toggle row expansion
  const toggleRow = (rowIndex: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
  };

  // Get status icon
  const StatusIcon = ({ status }: { status: ValidatedRow['status'] }) => {
    switch (status) {
      case 'valid':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'update':
        return <RefreshCw className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <X className="h-4 w-4 text-red-500" />;
    }
  };

  // Get mapped field columns to display
  const displayFields = MAPPABLE_FIELDS.filter((f) => mapping[f.key]);

  if (isValidating) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-sm text-muted-foreground">{t("validation.validating", { count: data.length })}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Check className="h-5 w-5 text-green-500" />
            <span className="font-medium">{stats.valid}</span>
          </div>
          <p className="text-sm text-muted-foreground">{t("validation.readyToImport")}</p>
        </div>

        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span className="font-medium">{stats.update}</span>
          </div>
          <p className="text-sm text-muted-foreground">{t("validation.willUpdate")}</p>
        </div>

        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <X className="h-5 w-5 text-red-500" />
            <span className="font-medium">{stats.errors}</span>
          </div>
          <p className="text-sm text-muted-foreground">{t("validation.hasErrors")}</p>
        </div>
      </div>

      {/* Warning for updates */}
      {stats.update > 0 && (
        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-600 dark:text-yellow-400">
              {t("validation.updateWarningTitle", { count: stats.update })}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("validation.updateWarningDesc")}
            </p>
          </div>
        </div>
      )}

      {/* Validation table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted px-4 py-2 border-b border-border">
          <h3 className="font-medium text-sm">
            {t("validation.results", { count: stats.total })}
          </h3>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-12">
                  {t("validation.status")}
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-12">
                  #
                </th>
                {displayFields.map((field) => (
                  <th
                    key={field.key}
                    className="px-3 py-2 text-left font-medium text-muted-foreground"
                  >
                    {t(`fields.${field.key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {validatedRows.map((row) => {
                const isExpanded = expandedRows.has(row.rowIndex);
                const hasErrors = row.errors.length > 0;
                const errorFields = new Set(row.errors.map((e) => e.field));

                return (
                  <>
                    <tr
                      key={row.rowIndex}
                      onClick={() => hasErrors && toggleRow(row.rowIndex)}
                      className={`border-b border-border ${
                        hasErrors ? 'cursor-pointer hover:bg-muted/50' : ''
                      } ${row.status === 'error' ? 'bg-red-500/5' : ''} ${
                        row.status === 'update' ? 'bg-yellow-500/5' : ''
                      }`}
                    >
                      <td className="px-3 py-2">
                        <StatusIcon status={row.status} />
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.rowIndex + 1}
                      </td>
                      {displayFields.map((field) => {
                        const value = row.originalRow[mapping[field.key]] || '';
                        const hasError = errorFields.has(field.key);
                        return (
                          <td
                            key={field.key}
                            className={`px-3 py-2 truncate max-w-xs ${
                              hasError ? 'bg-red-500/20 text-red-700 dark:text-red-300' : ''
                            }`}
                          >
                            {value || (
                              <span className="text-muted-foreground italic">{t("mapping.empty")}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    {isExpanded && hasErrors && (
                      <tr key={`${row.rowIndex}-errors`} className="bg-red-500/10">
                        <td colSpan={displayFields.length + 2} className="px-3 py-2">
                          <ul className="list-disc list-inside space-y-1 text-sm text-red-600 dark:text-red-400">
                            {row.errors.map((err, i) => (
                              <li key={i}>
                                <span className="font-medium">{t(`fields.${err.field}`, { defaultValue: err.field })}:</span> {err.message}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* No valid rows warning */}
      {stats.valid + stats.update === 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <X className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-600 dark:text-red-400">
              {t("validation.noValidRows")}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("validation.allRowsError")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
