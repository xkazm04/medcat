import { createClient } from "@/lib/supabase/server";
import { checkCircuit } from "@/lib/supabase/circuit-breaker";

export interface DashboardStats {
  totalProducts: number;
  distributorCount: number;
  referencePriceCount: number;
  priceCoverageCount: number;
}

export interface DistributorBreakdown {
  name: string;
  productCount: number;
}

export interface CategoryBreakdown {
  name: string;
  code: string;
  count: number;
}

export interface PriceScopeBreakdown {
  scope: string;
  count: number;
}

export interface SourceCountryBreakdown {
  country: string;
  count: number;
}

export interface ManufacturerBreakdown {
  name: string;
  count: number;
}

export interface DecompositionProgress {
  totalSets: number;
  decomposed: number;
  pending: number;
  percentComplete: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  checkCircuit();
  const supabase = await createClient();

  const [productsRes, vendorsRes, refPricesRes] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("vendors").select("id", { count: "exact", head: true }),
    supabase.from("reference_prices").select("id", { count: "exact", head: true }),
  ]);

  const totalProducts = productsRes.count || 0;
  const distributorCount = vendorsRes.count || 0;
  const referencePriceCount = refPricesRes.count || 0;

  // Count distinct product_ids from product_price_matches (can be >1000 rows, need pagination)
  const productIds = new Set<string>();
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data } = await supabase
      .from("product_price_matches")
      .select("product_id")
      .range(from, from + batchSize - 1);

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      for (const row of data) {
        productIds.add(row.product_id);
      }
      from += batchSize;
      if (data.length < batchSize) hasMore = false;
    }
  }

  return {
    totalProducts,
    distributorCount,
    referencePriceCount,
    priceCoverageCount: productIds.size,
  };
}

export async function getDistributorBreakdown(): Promise<DistributorBreakdown[]> {
  checkCircuit();
  const supabase = await createClient();

  // Count distinct products per vendor from product_offerings
  const { data } = await supabase
    .from("product_offerings")
    .select("vendor_id, product_id, vendor:vendors(name)");

  if (!data) return [];

  // Count unique products per vendor
  const vendorProducts = new Map<string, { name: string; products: Set<string> }>();
  for (const offering of data) {
    const vendor = offering.vendor as unknown as { name: string } | null;
    const name = vendor?.name || "Unknown";
    const existing = vendorProducts.get(offering.vendor_id);
    if (existing) {
      existing.products.add(offering.product_id);
    } else {
      vendorProducts.set(offering.vendor_id, { name, products: new Set([offering.product_id]) });
    }
  }

  return [...vendorProducts.values()]
    .map(({ name, products }) => ({ name, productCount: products.size }))
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, 15);
}

export async function getCategoryBreakdown(): Promise<CategoryBreakdown[]> {
  checkCircuit();
  const supabase = await createClient();

  const { data } = await supabase
    .from("category_product_counts")
    .select("code, name, total_count, depth")
    .eq("depth", 1)
    .gt("total_count", 0)
    .order("total_count", { ascending: false })
    .limit(10);

  if (!data) return [];

  return data.map(c => ({
    name: c.name,
    code: c.code,
    count: c.total_count,
  }));
}

export async function getPriceScopeBreakdown(): Promise<PriceScopeBreakdown[]> {
  checkCircuit();
  const supabase = await createClient();

  const { data } = await supabase
    .from("reference_prices")
    .select("price_scope");

  if (!data) return [];

  const counts = new Map<string, number>();
  for (const row of data) {
    const scope = row.price_scope || "unknown";
    counts.set(scope, (counts.get(scope) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([scope, count]) => ({ scope, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getSourceCountryBreakdown(): Promise<SourceCountryBreakdown[]> {
  checkCircuit();
  const supabase = await createClient();

  const { data } = await supabase
    .from("reference_prices")
    .select("source_country");

  if (!data) return [];

  const counts = new Map<string, number>();
  for (const row of data) {
    const country = row.source_country || "Unknown";
    counts.set(country, (counts.get(country) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getManufacturerBreakdown(): Promise<ManufacturerBreakdown[]> {
  checkCircuit();
  const supabase = await createClient();

  const { data } = await supabase
    .from("reference_prices")
    .select("manufacturer_name");

  if (!data) return [];

  const counts = new Map<string, number>();
  for (const row of data) {
    const name = row.manufacturer_name || "Unknown";
    counts.set(name, (counts.get(name) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

export async function getDecompositionProgress(): Promise<DecompositionProgress> {
  checkCircuit();
  const supabase = await createClient();

  const { data } = await supabase
    .from("reference_prices")
    .select("price_scope, notes")
    .eq("price_scope", "set");

  if (!data) return { totalSets: 0, decomposed: 0, pending: 0, percentComplete: 0 };

  const totalSets = data.length;
  const decomposed = data.filter(row => row.notes && row.notes.includes("[decomposed]")).length;
  const pending = totalSets - decomposed;
  const percentComplete = totalSets > 0 ? Math.round((decomposed / totalSets) * 100) : 0;

  return { totalSets, decomposed, pending, percentComplete };
}
