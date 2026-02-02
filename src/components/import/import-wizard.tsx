'use client';

import { useState, useCallback } from 'react';
import { ChevronLeft, Check, Loader2 } from 'lucide-react';
import { type Vendor } from '@/lib/types';
import { type CSVRow, parseCSVFull } from '@/lib/utils/csv-parser';
import { type ImportRow } from '@/lib/schemas/import';
import { importProducts, type ImportResult } from '@/lib/actions/import';
import { FileUploadStep } from './file-upload-step';
import { ColumnMappingStep } from './column-mapping-step';
import { ValidationStep } from './validation-step';
import { ImportSummary } from './import-summary';

type ImportStep = 'vendor' | 'upload' | 'mapping' | 'validation' | 'importing' | 'summary';

interface WizardState {
  step: ImportStep;
  vendorId: string;
  file: File | null;
  headers: string[];
  previewData: CSVRow[];
  fullData: CSVRow[];
  mapping: Record<string, string>;
  validRows: ImportRow[];
  existingCount: number;
  result: ImportResult | null;
}

interface ImportWizardProps {
  vendors: Vendor[];
}

const STEP_LABELS: Record<ImportStep, string> = {
  vendor: 'Select Vendor',
  upload: 'Upload File',
  mapping: 'Map Columns',
  validation: 'Validate',
  importing: 'Import',
  summary: 'Summary',
};

const STEP_ORDER: ImportStep[] = ['vendor', 'upload', 'mapping', 'validation', 'importing', 'summary'];

/**
 * Multi-step wizard for CSV product import.
 * Guides user through vendor selection, file upload, column mapping,
 * validation, and batch import with progress feedback.
 */
export function ImportWizard({ vendors }: ImportWizardProps) {
  const [state, setState] = useState<WizardState>({
    step: 'vendor',
    vendorId: '',
    file: null,
    headers: [],
    previewData: [],
    fullData: [],
    mapping: {},
    validRows: [],
    existingCount: 0,
    result: null,
  });

  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  // Get current step index (for indicator)
  const currentStepIndex = STEP_ORDER.indexOf(state.step);

  // Reset wizard to initial state
  const handleReset = useCallback(() => {
    setState({
      step: 'vendor',
      vendorId: '',
      file: null,
      headers: [],
      previewData: [],
      fullData: [],
      mapping: {},
      validRows: [],
      existingCount: 0,
      result: null,
    });
    setImportProgress({ current: 0, total: 0 });
  }, []);

  // Go back one step
  const handleBack = useCallback(() => {
    const idx = STEP_ORDER.indexOf(state.step);
    if (idx > 0 && idx < 5) {
      // Can go back from upload, mapping, validation, importing (if not started)
      setState((prev) => ({
        ...prev,
        step: STEP_ORDER[idx - 1],
      }));
    }
  }, [state.step]);

  // Vendor selection handlers
  const handleVendorChange = (vendorId: string) => {
    setState((prev) => ({ ...prev, vendorId }));
  };

  const handleVendorNext = () => {
    if (state.vendorId) {
      setState((prev) => ({ ...prev, step: 'upload' }));
    }
  };

  // File upload handlers
  const handleFileSelect = useCallback(
    async (file: File, headers: string[], preview: CSVRow[]) => {
      // Parse full file for import
      const fullResult = await parseCSVFull(file);

      setState((prev) => ({
        ...prev,
        file,
        headers,
        previewData: preview,
        fullData: fullResult.data,
        step: 'mapping',
      }));
    },
    []
  );

  const handleFileClear = () => {
    setState((prev) => ({
      ...prev,
      file: null,
      headers: [],
      previewData: [],
      fullData: [],
    }));
  };

  // Mapping handlers
  const handleMappingChange = (mapping: Record<string, string>) => {
    setState((prev) => ({ ...prev, mapping }));
  };

  const handleMappingNext = () => {
    // Check required fields are mapped
    if (state.mapping.name && state.mapping.sku) {
      setState((prev) => ({ ...prev, step: 'validation' }));
    }
  };

  // Validation handler
  const handleValidationComplete = useCallback((validRows: ImportRow[], existingCount: number) => {
    setState((prev) => ({
      ...prev,
      validRows,
      existingCount,
    }));
  }, []);

  // Import handler
  const handleStartImport = async () => {
    if (state.validRows.length === 0) return;

    setState((prev) => ({ ...prev, step: 'importing' }));
    setImportProgress({ current: 0, total: state.validRows.length });

    const CHUNK_SIZE = 100;
    const combinedResult: ImportResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    // Process in chunks
    for (let i = 0; i < state.validRows.length; i += CHUNK_SIZE) {
      const chunk = state.validRows.slice(i, i + CHUNK_SIZE);

      const chunkResult = await importProducts(chunk, state.vendorId);

      combinedResult.created += chunkResult.created;
      combinedResult.updated += chunkResult.updated;
      combinedResult.skipped += chunkResult.skipped;
      combinedResult.errors.push(...chunkResult.errors);

      setImportProgress({
        current: Math.min(i + CHUNK_SIZE, state.validRows.length),
        total: state.validRows.length,
      });
    }

    setState((prev) => ({
      ...prev,
      step: 'summary',
      result: combinedResult,
    }));
  };

  // Check if required mapping fields are set
  const isMappingValid = state.mapping.name && state.mapping.sku;
  const canImport = state.validRows.length > 0;

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {STEP_ORDER.slice(0, 5).map((step, index) => {
          const isActive = index === currentStepIndex;
          const isComplete = index < currentStepIndex;

          return (
            <div key={step} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  isComplete
                    ? 'bg-accent text-accent-foreground'
                    : isActive
                    ? 'bg-accent text-accent-foreground ring-2 ring-accent/50'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isComplete ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              {index < 4 && (
                <div
                  className={`w-12 h-0.5 mx-1 ${
                    index < currentStepIndex ? 'bg-accent' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step label */}
      <div className="text-center">
        <h2 className="text-lg font-medium">
          Step {currentStepIndex + 1}: {STEP_LABELS[state.step]}
        </h2>
      </div>

      {/* Step content */}
      <div className="border border-border rounded-lg p-6">
        {/* Vendor selection step */}
        {state.step === 'vendor' && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Select the vendor for the products you are importing. SKU deduplication is
              performed per vendor.
            </p>

            <div className="max-w-md">
              <label htmlFor="vendor-select" className="block text-sm font-medium mb-2">
                Vendor <span className="text-red-500">*</span>
              </label>
              <select
                id="vendor-select"
                value={state.vendorId}
                onChange={(e) => handleVendorChange(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">-- Select a vendor --</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleVendorNext}
                disabled={!state.vendorId}
                className="px-6 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Upload step */}
        {state.step === 'upload' && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Upload a CSV file containing your product data. The file should have headers in the
              first row.
            </p>

            <FileUploadStep
              onFileSelect={handleFileSelect}
              onClear={handleFileClear}
              selectedFile={state.file}
            />

            <div className="flex justify-between">
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            </div>
          </div>
        )}

        {/* Mapping step */}
        {state.step === 'mapping' && (
          <div className="space-y-6">
            <ColumnMappingStep
              headers={state.headers}
              mapping={state.mapping}
              onMappingChange={handleMappingChange}
              previewData={state.previewData}
            />

            <div className="flex justify-between">
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handleMappingNext}
                disabled={!isMappingValid}
                className="px-6 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Validation step */}
        {state.step === 'validation' && (
          <div className="space-y-6">
            <ValidationStep
              data={state.fullData}
              mapping={state.mapping}
              vendorId={state.vendorId}
              onValidationComplete={handleValidationComplete}
            />

            <div className="flex justify-between">
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handleStartImport}
                disabled={!canImport}
                className="px-6 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {state.validRows.length} Product{state.validRows.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}

        {/* Importing step */}
        {state.step === 'importing' && (
          <div className="py-12 text-center space-y-6">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-accent" />
            <div>
              <p className="text-lg font-medium">
                Importing... {importProgress.current}/{importProgress.total} rows
              </p>
              <div className="mt-4 w-full max-w-md mx-auto bg-muted rounded-full h-2">
                <div
                  className="bg-accent h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      importProgress.total > 0
                        ? (importProgress.current / importProgress.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Please wait while products are being imported...
              </p>
            </div>
          </div>
        )}

        {/* Summary step */}
        {state.step === 'summary' && state.result && (
          <ImportSummary result={state.result} onReset={handleReset} />
        )}
      </div>
    </div>
  );
}
