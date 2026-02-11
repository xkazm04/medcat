import * as XLSX from 'xlsx';

/**
 * Expected column headers from our export format.
 * Maps export header names to internal field keys.
 */
const HEADER_MAP: Record<string, string> = {
  'Product Name': 'name',
  'SKU': 'sku',
  'Vendor': 'vendor_name',
  'Distributors': 'vendor_name', // new export header, maps same field
  'Manufacturer': 'manufacturer_name',
  'Manufacturer SKU': 'manufacturer_sku',
  'Price': 'price',
  'Min Price': 'price', // new export header, maps same field
  'CE Marked': 'ce_marked',
  'MDR Class': 'mdr_class',
  'UDI-DI': 'udi_di',
  'EMDN Category': 'emdn_category',
  'Description': 'description',
};

const REQUIRED_HEADERS = ['Product Name', 'SKU'];

export interface ParsedXLSXRow {
  name: string;
  sku: string;
  vendor_name?: string | null;
  manufacturer_name?: string | null;
  manufacturer_sku?: string | null;
  price?: number | null;
  ce_marked?: boolean;
  mdr_class?: string | null;
  udi_di?: string | null;
  emdn_code?: string | null;
  description?: string | null;
}

export interface XLSXParseResult {
  success: boolean;
  rows: ParsedXLSXRow[];
  totalRows: number;
  headers: string[];
  formatError?: string;
}

/**
 * Parse an XLSX file and extract product rows matching our export format.
 * Validates that the file has a "Products" sheet (or uses first sheet)
 * and contains the required column headers.
 */
export function parseXLSXFile(file: ArrayBuffer): XLSXParseResult {
  try {
    const wb = XLSX.read(file, { type: 'array' });

    // Prefer "Products" sheet (our export creates this), fall back to first sheet
    const sheetName = wb.SheetNames.includes('Products')
      ? 'Products'
      : wb.SheetNames[0];

    if (!sheetName) {
      return {
        success: false,
        rows: [],
        totalRows: 0,
        headers: [],
        formatError: 'The file contains no sheets.',
      };
    }

    const ws = wb.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });

    if (rawData.length === 0) {
      return {
        success: false,
        rows: [],
        totalRows: 0,
        headers: [],
        formatError: 'The sheet is empty.',
      };
    }

    // Get headers from first row keys
    const headers = Object.keys(rawData[0]);

    // Validate required headers exist
    const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      return {
        success: false,
        rows: [],
        totalRows: rawData.length,
        headers,
        formatError: `Missing required columns: ${missingHeaders.join(', ')}. Expected format matches MedCatalog export.`,
      };
    }

    // Map rows to our internal format
    const rows: ParsedXLSXRow[] = rawData.map(raw => {
      const mapped: Record<string, unknown> = {};

      for (const [header, value] of Object.entries(raw)) {
        const fieldKey = HEADER_MAP[header];
        if (fieldKey) {
          mapped[fieldKey] = value;
        }
      }

      // Parse EMDN Category: "P090201 - Hip joint prostheses" → "P090201"
      const emdnRaw = mapped.emdn_category as string | null;
      let emdnCode: string | null = null;
      if (emdnRaw && typeof emdnRaw === 'string') {
        const dashIdx = emdnRaw.indexOf(' - ');
        emdnCode = dashIdx > 0 ? emdnRaw.substring(0, dashIdx).trim() : emdnRaw.trim();
      }

      // Parse CE Marked: "Yes"/"No" → boolean
      const ceRaw = mapped.ce_marked as string | null;
      const ceMarked = ceRaw === 'Yes' || ceRaw === 'yes' || ceRaw === 'TRUE';

      // Parse price: ensure numeric
      const priceRaw = mapped.price;
      let price: number | null = null;
      if (priceRaw != null && priceRaw !== '') {
        const parsed = Number(priceRaw);
        if (!isNaN(parsed) && parsed > 0) {
          price = parsed;
        }
      }

      return {
        name: String(mapped.name || '').trim(),
        sku: String(mapped.sku || '').trim(),
        vendor_name: mapped.vendor_name ? String(mapped.vendor_name).trim() : null,
        manufacturer_name: mapped.manufacturer_name ? String(mapped.manufacturer_name).trim() : null,
        manufacturer_sku: mapped.manufacturer_sku ? String(mapped.manufacturer_sku).trim() : null,
        price,
        ce_marked: ceMarked,
        mdr_class: mapped.mdr_class ? String(mapped.mdr_class).trim() : null,
        udi_di: mapped.udi_di ? String(mapped.udi_di).trim() : null,
        emdn_code: emdnCode,
        description: mapped.description ? String(mapped.description).trim() : null,
      };
    });

    // Filter out rows with no name or sku (empty rows)
    const validRows = rows.filter(r => r.name && r.sku);

    return {
      success: true,
      rows: validRows,
      totalRows: rawData.length,
      headers,
    };
  } catch {
    return {
      success: false,
      rows: [],
      totalRows: 0,
      headers: [],
      formatError: 'Failed to read the file. Please ensure it is a valid .xlsx file.',
    };
  }
}
