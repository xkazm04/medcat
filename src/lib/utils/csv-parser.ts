import Papa from "papaparse";

/**
 * Represents a single row from a CSV file.
 * Keys are column headers, values are cell contents as strings.
 */
export interface CSVRow {
  [key: string]: string;
}

/**
 * Result of parsing a CSV file.
 */
export interface ParseResult {
  /** Parsed data rows */
  data: CSVRow[];
  /** Column headers from the first row */
  headers: string[];
  /** Any parsing errors encountered */
  errors: Papa.ParseError[];
  /** Total number of rows (for preview, this is the preview count) */
  totalRows: number;
}

/**
 * Parse a CSV file and return only the first N rows for preview.
 * Useful for showing a preview before full import.
 *
 * @param file - The CSV file to parse
 * @param previewRows - Number of rows to return (default: 10)
 * @returns Promise resolving to ParseResult with preview data
 */
export function parseCSVPreview(
  file: File,
  previewRows: number = 10
): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      preview: previewRows,
      encoding: "UTF-8",
      complete: (results) => {
        resolve({
          data: results.data,
          headers: results.meta.fields || [],
          errors: results.errors,
          totalRows: results.data.length,
        });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * Parse a CSV file completely, returning all rows.
 * Use for the actual import after preview confirmation.
 *
 * @param file - The CSV file to parse
 * @returns Promise resolving to ParseResult with all data
 */
export function parseCSVFull(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (results) => {
        resolve({
          data: results.data,
          headers: results.meta.fields || [],
          errors: results.errors,
          totalRows: results.data.length,
        });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}
