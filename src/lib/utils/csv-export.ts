import type { ProductWithRelations } from '@/lib/types';
import type { ColumnVisibility } from '@/components/table/column-visibility-toggle';

interface ExportColumn {
  key: string;
  header: string;
  getValue: (p: ProductWithRelations) => string;
}

const ALL_COLUMNS: ExportColumn[] = [
  { key: 'product', header: 'Product Name', getValue: p => p.name },
  { key: 'sku', header: 'SKU', getValue: p => p.sku || '' },
  { key: 'vendor', header: 'Vendor', getValue: p => p.vendor?.name || '' },
  { key: 'manufacturer', header: 'Manufacturer', getValue: p => p.manufacturer_name || '' },
  { key: 'manufacturer_sku', header: 'Manufacturer SKU', getValue: p => p.manufacturer_sku || '' },
  { key: 'price', header: 'Price', getValue: p => p.price != null ? String(p.price) : '' },
  { key: 'regulatory', header: 'CE Marked', getValue: p => p.ce_marked ? 'Yes' : 'No' },
  { key: 'mdr_class', header: 'MDR Class', getValue: p => p.mdr_class || '' },
  { key: 'udi_di', header: 'UDI-DI', getValue: p => p.udi_di || '' },
  { key: 'category', header: 'EMDN Category', getValue: p => p.emdn_category ? `${p.emdn_category.code} - ${p.emdn_category.name}` : '' },
  { key: 'description', header: 'Description', getValue: p => p.description || '' },
];

function getVisibleColumns(visibility: ColumnVisibility): ExportColumn[] {
  return ALL_COLUMNS.filter(col => {
    // Always include product, SKU and description
    if (col.key === 'product' || col.key === 'description') return true;
    // Map sub-columns to their parent visibility
    if (col.key === 'sku') return visibility.sku;
    if (col.key === 'vendor') return visibility.vendor;
    if (col.key === 'manufacturer' || col.key === 'manufacturer_sku') return visibility.manufacturer;
    if (col.key === 'price') return visibility.price;
    if (col.key === 'regulatory' || col.key === 'mdr_class' || col.key === 'udi_di') return visibility.regulatory;
    if (col.key === 'category') return visibility.category;
    return true;
  });
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function productsToCSV(products: ProductWithRelations[], visibility: ColumnVisibility): string {
  const columns = getVisibleColumns(visibility);
  const header = columns.map(c => escapeCSV(c.header)).join(',');
  const rows = products.map(p =>
    columns.map(c => escapeCSV(c.getValue(p))).join(',')
  );
  // UTF-8 BOM for Excel compatibility
  return '\uFEFF' + [header, ...rows].join('\r\n');
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
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
  return `medcatalog-${date}${suffix}`;
}
