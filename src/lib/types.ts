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

export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  price: number | null;
  vendor_id: string | null;
  emdn_category_id: string | null;
  material_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductWithRelations extends Product {
  vendor: Vendor | null;
  emdn_category: EMDNCategory | null;
  material: Material | null;
}
