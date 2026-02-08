import { createClient } from "@/lib/supabase/server";
import { checkCircuit } from "@/lib/supabase/circuit-breaker";

export interface DashboardStats {
  totalProducts: number;
  avgPrice: number;
  ceCompliancePercent: number;
  vendorCount: number;
}

export interface PriceDistributionBucket {
  range: string;
  count: number;
}

export interface VendorBreakdown {
  name: string;
  count: number;
}

export interface CategoryBreakdown {
  name: string;
  code: string;
  count: number;
}

export interface RegulatoryBreakdown {
  class: string;
  count: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  checkCircuit();
  const supabase = await createClient();

  const [productsRes, vendorsRes] = await Promise.all([
    supabase.from("products").select("price, ce_marked", { count: "exact" }),
    supabase.from("vendors").select("id", { count: "exact" }),
  ]);

  const products = productsRes.data || [];
  const totalProducts = productsRes.count || 0;
  const vendorCount = vendorsRes.count || 0;

  const pricesValid = products.filter(p => p.price != null && p.price > 0);
  const avgPrice = pricesValid.length > 0
    ? pricesValid.reduce((sum, p) => sum + (p.price || 0), 0) / pricesValid.length
    : 0;

  const ceCount = products.filter(p => p.ce_marked).length;
  const ceCompliancePercent = totalProducts > 0 ? Math.round((ceCount / totalProducts) * 100) : 0;

  return { totalProducts, avgPrice: Math.round(avgPrice), ceCompliancePercent, vendorCount };
}

export async function getPriceDistribution(): Promise<PriceDistributionBucket[]> {
  checkCircuit();
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select("price")
    .not("price", "is", null)
    .gt("price", 0);

  if (!data || data.length === 0) return [];

  // Define buckets
  const buckets = [
    { range: "0-1K", min: 0, max: 1000 },
    { range: "1K-5K", min: 1000, max: 5000 },
    { range: "5K-10K", min: 5000, max: 10000 },
    { range: "10K-50K", min: 10000, max: 50000 },
    { range: "50K-100K", min: 50000, max: 100000 },
    { range: "100K+", min: 100000, max: Infinity },
  ];

  return buckets.map(b => ({
    range: b.range,
    count: data.filter(p => p.price >= b.min && p.price < b.max).length,
  })).filter(b => b.count > 0);
}

export async function getVendorBreakdown(): Promise<VendorBreakdown[]> {
  checkCircuit();
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select("vendor:vendors(name)");

  if (!data) return [];

  const counts = new Map<string, number>();
  for (const p of data) {
    const vendor = p.vendor as unknown as { name: string } | null;
    const name = vendor?.name || "Unknown";
    counts.set(name, (counts.get(name) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15); // Top 15
}

export async function getCategoryBreakdown(): Promise<CategoryBreakdown[]> {
  checkCircuit();
  const supabase = await createClient();

  // Use materialized view for fast counts
  const { data } = await supabase
    .from("category_product_counts")
    .select("code, name, total_count, depth")
    .eq("depth", 1) // Top-level groups only
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

export async function getRegulatoryBreakdown(): Promise<RegulatoryBreakdown[]> {
  checkCircuit();
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select("mdr_class");

  if (!data) return [];

  const counts = new Map<string, number>();
  for (const p of data) {
    const cls = p.mdr_class || "Unclassified";
    counts.set(cls, (counts.get(cls) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([cls, count]) => ({ class: cls, count }))
    .sort((a, b) => b.count - a.count);
}
