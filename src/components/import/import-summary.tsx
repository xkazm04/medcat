'use client';

import { CheckCircle, AlertTriangle, Plus, RefreshCw, XCircle, ChevronDown, ChevronUp, List, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { type ImportResult } from '@/lib/actions/import';

interface ImportSummaryProps {
  result: ImportResult;
  onReset: () => void;
}

/**
 * Import summary component showing results after CSV import.
 * Displays counts of created, updated, skipped products and any errors.
 */
export function ImportSummary({ result, onReset }: ImportSummaryProps) {
  const [errorsExpanded, setErrorsExpanded] = useState(false);

  const hasErrors = result.errors.length > 0;
  const totalProcessed = result.created + result.updated + result.skipped;

  return (
    <div className="space-y-6">
      {/* Header with icon */}
      <div className="text-center py-6">
        {hasErrors ? (
          <AlertTriangle className="mx-auto h-16 w-16 text-yellow-500" />
        ) : (
          <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
        )}
        <h2 className="mt-4 text-2xl font-semibold">Import Complete</h2>
        <p className="mt-1 text-muted-foreground">
          {totalProcessed} product{totalProcessed !== 1 ? 's' : ''} processed
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-4">
        <div className="border border-border rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Plus className="h-5 w-5 text-green-500" />
            <span className="text-2xl font-bold">{result.created}</span>
          </div>
          <p className="text-sm text-muted-foreground">Created</p>
        </div>

        <div className="border border-border rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <RefreshCw className="h-5 w-5 text-blue-500" />
            <span className="text-2xl font-bold">{result.updated}</span>
          </div>
          <p className="text-sm text-muted-foreground">Updated</p>
        </div>

        <div className="border border-border rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <HelpCircle className="h-5 w-5 text-yellow-500" />
            <span className="text-2xl font-bold">{result.unclassified}</span>
          </div>
          <p className="text-sm text-muted-foreground">Unclassified</p>
        </div>

        <div className="border border-border rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <span className="text-2xl font-bold">{result.skipped}</span>
          </div>
          <p className="text-sm text-muted-foreground">Skipped</p>
        </div>
      </div>

      {/* Errors section */}
      {hasErrors && (
        <div className="border border-red-500/30 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setErrorsExpanded(!errorsExpanded)}
            className="w-full flex items-center justify-between p-4 bg-red-500/10 hover:bg-red-500/15 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="font-medium text-red-600 dark:text-red-400">
                {result.errors.length} error{result.errors.length !== 1 ? 's' : ''} occurred
              </span>
            </div>
            {errorsExpanded ? (
              <ChevronUp className="h-5 w-5 text-red-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-red-500" />
            )}
          </button>

          {errorsExpanded && (
            <div className="p-4 max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Row</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Field</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((error, index) => (
                    <tr key={index} className="border-b border-border/50">
                      <td className="py-2 px-2 text-muted-foreground">{error.row + 1}</td>
                      <td className="py-2 px-2 font-mono text-xs">{error.field}</td>
                      <td className="py-2 px-2 text-red-600 dark:text-red-400">{error.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-4 justify-center pt-4">
        <button
          type="button"
          onClick={onReset}
          className="px-6 py-2 border border-border rounded-md hover:bg-muted transition-colors"
        >
          Import More
        </button>
        <Link
          href="/"
          className="px-6 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors flex items-center gap-2"
        >
          <List className="h-4 w-4" />
          View Catalog
        </Link>
      </div>
    </div>
  );
}
