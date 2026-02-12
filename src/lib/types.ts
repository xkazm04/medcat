export interface Vendor {
  id: string;
  name: string;
  code: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
}

export interface EMDNCategory {
  id: string;
  code: string;
  name: string;
  name_cs?: string | null; // Czech translation for i18n
  parent_id: string | null;
  depth: number;
  path: string | null;
  created_at: string;
}

export interface Material {
  id: string;
  name: string;
  code: string | null;
}

export interface ProductOffering {
  id: string;
  product_id: string;
  vendor_id: string;
  vendor: Vendor | null;
  vendor_sku: string | null;
  vendor_price: number | null;
  currency: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  /** @deprecated Use offerings[].vendor_price instead. Kept during transition. */
  price: number | null;
  /** @deprecated Use offerings[] instead. Kept during transition. */
  vendor_id: string | null;
  emdn_category_id: string | null;
  material_id: string | null;
  udi_di: string | null;
  ce_marked: boolean;
  mdr_class: 'I' | 'IIa' | 'IIb' | 'III' | null;
  manufacturer_name: string | null;
  manufacturer_sku: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductWithRelations extends Product {
  /** @deprecated Use offerings[] instead. Kept during transition. */
  vendor: Vendor | null;
  emdn_category: EMDNCategory | null;
  material: Material | null;
  offerings: ProductOffering[];
}

export interface ReferencePrice {
  id: string;
  product_id: string | null;
  emdn_category_id: string | null;
  price_original: number;
  currency_original: string;
  price_eur: number;
  price_type: 'reimbursement_ceiling' | 'tender_unit' | 'catalog_list' | 'reference';
  source_country: string;
  source_name: string;
  source_url: string | null;
  source_code: string | null;
  manufacturer_name: string | null;
  product_family: string | null;
  component_description: string | null;
  valid_from: string | null;
  valid_until: string | null;
  extracted_at: string;
  extraction_method: string | null;
  notes: string | null;
  // Precision pricing fields (from RPC)
  match_type?: 'product_match' | 'product_direct' | 'category_leaf' | 'category_exact' | 'category_ancestor' | null;
  match_score?: number | null;
  match_reason?: string | null;
  category_code?: string | null;
  category_depth?: number | null;
  price_scope?: 'set' | 'component' | 'procedure' | null;
}

export interface SetGroupEntry {
  id: string
  xc_subcode: string | null
  source_code: string | null
  manufacturer_name: string | null
  component_type: string | null
  component_description: string | null
  price_scope: string | null
  price_eur: number
  price_original: number
  currency_original: string
  source_country: string
  source_name: string | null
  valid_from: string | null
  notes: string | null
  extraction_method: string | null
  emdn_code: string | null
  emdn_name: string | null
}

export interface SetMatchedProduct {
  reference_price_id: string
  product_id: string
  product_name: string
  product_manufacturer: string | null
  sku: string | null
  product_min_price: number | null
  product_offering_count: number
  match_score: number
  match_reason: string | null
}
