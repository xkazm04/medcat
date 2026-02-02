import { Suspense } from "react";
import { getProducts, getVendors, getMaterials, getEMDNCategories, getEMDNCategoriesFlat } from "@/lib/queries";
import { FilterSidebar, FilterSection } from "@/components/filters/filter-sidebar";
import { SearchInput } from "@/components/filters/search-input";
import { CategoryTree } from "@/components/filters/category-tree";
import { VendorFilter } from "@/components/filters/vendor-filter";
import { MaterialFilter } from "@/components/filters/material-filter";
import { PriceRangeFilter } from "@/components/filters/price-range-filter";
import { CatalogClient } from "@/components/catalog-client";

interface HomeProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    vendor?: string;
    category?: string;
    material?: string;
    minPrice?: string;
    maxPrice?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;

  const page = parseInt(params.page || "1");
  const pageSize = 20;

  // Fetch data in parallel
  const [productsResult, vendors, materials, categories, emdnCategoriesFlat] = await Promise.all([
    getProducts({
      page,
      pageSize,
      search: params.search,
      vendor: params.vendor,
      category: params.category,
      material: params.material,
      minPrice: params.minPrice ? parseFloat(params.minPrice) : undefined,
      maxPrice: params.maxPrice ? parseFloat(params.maxPrice) : undefined,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder as "asc" | "desc" | undefined,
    }),
    getVendors(),
    getMaterials(),
    getEMDNCategories(),
    getEMDNCategoriesFlat(),
  ]);

  const { data: products, count } = productsResult;
  const pageCount = Math.ceil(count / pageSize);

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center px-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-6 bg-green-subtle rounded-sm" />
          <h1 className="text-lg font-semibold text-foreground">MedCatalog</h1>
        </div>
        <span className="ml-4 text-sm text-muted-foreground">
          Orthopedic Product Catalog
        </span>
      </header>
      <div className="flex">
        <Suspense fallback={<div className="w-[280px] shrink-0 border-r border-border" />}>
          <FilterSidebar>
            <SearchInput />

            <FilterSection title="Categories">
              <CategoryTree categories={categories} />
            </FilterSection>

            <FilterSection title="Vendors">
              <VendorFilter vendors={vendors} />
            </FilterSection>

            <FilterSection title="Materials">
              <MaterialFilter materials={materials} />
            </FilterSection>

            <FilterSection title="Price Range">
              <PriceRangeFilter />
            </FilterSection>
          </FilterSidebar>
        </Suspense>

        <div className="flex-1 p-6">
          <Suspense fallback={<div className="animate-pulse bg-muted h-96 rounded-lg" />}>
            <CatalogClient
              products={products}
              vendors={vendors}
              materials={materials}
              emdnCategories={emdnCategoriesFlat}
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
