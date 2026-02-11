import * as XLSX from 'xlsx';
import type { ProductWithRelations } from '@/lib/types';
import type { ColumnVisibility } from '@/components/table/column-visibility-toggle';

interface ExportColumn {
  key: string;
  header: string;
  getValue: (p: ProductWithRelations) => string | number | null;
}

const ALL_COLUMNS: ExportColumn[] = [
  { key: 'product', header: 'Product Name', getValue: p => p.name },
  { key: 'sku', header: 'SKU', getValue: p => p.sku || '' },
  { key: 'manufacturer', header: 'Manufacturer', getValue: p => p.manufacturer_name || '' },
  { key: 'manufacturer_sku', header: 'Manufacturer SKU', getValue: p => p.manufacturer_sku || '' },
  {
    key: 'vendor',
    header: 'Distributors',
    getValue: p => {
      const names = (p.offerings ?? [])
        .map(o => o.vendor?.name)
        .filter((n): n is string => !!n);
      return [...new Set(names)].join(', ');
    },
  },
  {
    key: 'price',
    header: 'Min Price',
    getValue: p => {
      const prices = (p.offerings ?? [])
        .map(o => o.vendor_price)
        .filter((v): v is number => v !== null);
      return prices.length > 0 ? Math.min(...prices) : null;
    },
  },
  { key: 'regulatory', header: 'CE Marked', getValue: p => p.ce_marked ? 'Yes' : 'No' },
  { key: 'mdr_class', header: 'MDR Class', getValue: p => p.mdr_class || '' },
  { key: 'udi_di', header: 'UDI-DI', getValue: p => p.udi_di || '' },
  { key: 'category', header: 'EMDN Category', getValue: p => p.emdn_category ? `${p.emdn_category.code} - ${p.emdn_category.name}` : '' },
  { key: 'description', header: 'Description', getValue: p => p.description || '' },
];

function getVisibleColumns(visibility: ColumnVisibility): ExportColumn[] {
  return ALL_COLUMNS.filter(col => {
    if (col.key === 'product' || col.key === 'description') return true;
    if (col.key === 'sku') return visibility.sku;
    if (col.key === 'vendor') return visibility.vendor;
    if (col.key === 'manufacturer' || col.key === 'manufacturer_sku') return visibility.manufacturer;
    if (col.key === 'price') return visibility.price;
    if (col.key === 'regulatory' || col.key === 'mdr_class' || col.key === 'udi_di') return visibility.regulatory;
    if (col.key === 'category') return visibility.category;
    return true;
  });
}

export function productsToXLSX(products: ProductWithRelations[], visibility: ColumnVisibility): Blob {
  const columns = getVisibleColumns(visibility);
  const headers = columns.map(c => c.header);
  const rows = products.map(p => columns.map(c => c.getValue(p)));

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Auto-size columns based on content
  const colWidths = columns.map((col, i) => {
    let maxLen = col.header.length;
    for (const row of rows) {
      const val = row[i];
      const len = val != null ? String(val).length : 0;
      if (len > maxLen) maxLen = len;
    }
    return { wch: Math.min(maxLen + 2, 60) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products');

  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function downloadXLSX(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getExportFilename(filterSummary?: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const suffix = filterSummary ? `-${filterSummary}` : '';
  return `medcatalog-${date}${suffix}.xlsx`;
}
