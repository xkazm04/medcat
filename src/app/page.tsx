import { Suspense } from "react";
import { getProducts, getVendors, getEMDNCategories, getEMDNCategoriesFlat } from "@/lib/queries";
import { FilterSidebar, FilterSection } from "@/components/filters/filter-sidebar";
import { SearchInput } from "@/components/filters/search-input";
import { CategoryTree } from "@/components/filters/category-tree";
import { VendorFilter } from "@/components/filters/vendor-filter";
import { CatalogClient } from "@/components/catalog-client";
import { Package } from "lucide-react";

interface HomeProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    vendor?: string;
    category?: string;
    ceMarked?: string;
    mdrClass?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

// Loading skeleton for the catalog
function CatalogSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-24 bg-muted rounded animate-pulse" />
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-muted rounded animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="h-12 bg-muted/50 border-b border-border" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 border-b border-border last:border-b-0 flex items-center px-4 gap-4">
            <div className="h-4 w-1/4 bg-muted rounded animate-pulse" />
            <div className="h-4 w-1/6 bg-muted rounded animate-pulse" />
            <div className="h-4 w-1/6 bg-muted rounded animate-pulse" />
            <div className="h-4 w-1/6 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;

  const page = parseInt(params.page || "1");
  const pageSize = 20;

  // Fetch data in parallel
  const [productsResult, allVendors, categories, emdnCategoriesFlat] = await Promise.all([
    getProducts({
      page,
      pageSize,
      search: params.search,
      vendor: params.vendor,
      category: params.category,
      ceMarked: params.ceMarked,
      mdrClass: params.mdrClass,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder as "asc" | "desc" | undefined,
    }),
    getVendors(),
    getEMDNCategories(),
    getEMDNCategoriesFlat(),
  ]);

  // Filter out test vendors
  const vendors = allVendors.filter(v =>
    !v.name.toLowerCase().includes('test import') &&
    !v.name.toLowerCase().includes('test vendor')
  );

  const { data: products, count } = productsResult;
  const pageCount = Math.ceil(count / pageSize);

  // Count selected filters for badges
  const selectedVendorCount = params.vendor?.split(",").filter(Boolean).length || 0;

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center px-6 sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Package className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground leading-tight">MedCatalog</h1>
            <p className="text-xs text-muted-foreground">Orthopedic Product Catalog</p>
          </div>
        </div>
      </header>

      <div className="flex">
        <Suspense fallback={<div className="w-[420px] shrink-0 border-r border-border" />}>
          <FilterSidebar>
            {/* Search at top, not in a section */}
            <div className="pb-4 mb-1 border-b border-border">
              <SearchInput />
            </div>

            <FilterSection title="Category" badge={params.category ? 1 : 0}>
              <CategoryTree initialCategories={categories} />
            </FilterSection>

            <FilterSection title="Vendor" badge={selectedVendorCount}>
              <VendorFilter vendors={vendors} />
            </FilterSection>
          </FilterSidebar>
        </Suspense>

        <div className="flex-1 p-6 min-w-0">
          <Suspense fallback={<CatalogSkeleton />}>
            <CatalogClient
              products={products}
              vendors={vendors}
              emdnCategories={emdnCategoriesFlat}
              categories={categories}
              pageCount={pageCount}
              totalCount={count}
              currentPage={page}
              pageSize={pageSize}
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
