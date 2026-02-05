import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getProducts, getVendors, getEMDNCategories, getManufacturers } from "@/lib/queries";
import { flattenCategories } from "@/lib/utils/format-category";

// ISR: Revalidate page every 60 seconds for fresh data without blocking
export const revalidate = 60;
import { FilterSidebar, FilterSection } from "@/components/filters/filter-sidebar";
import { SearchInput } from "@/components/filters/search-input";
import { CategoryTree } from "@/components/filters/category-tree";
import { VendorFilter } from "@/components/filters/vendor-filter";
import { CatalogClient } from "@/components/catalog-client";
import { CatalogSkeleton } from "@/components/catalog-skeleton";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ChatWidget } from "@/components/chat/chat-widget";
import { Package } from "lucide-react";

interface HomeProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    vendor?: string;
    category?: string;
    ceMarked?: string;
    mdrClass?: string;
    manufacturer?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const t = await getTranslations();

  const page = parseInt(params.page || "1");
  const pageSize = 20;

  // Fetch data in parallel (removed redundant getEMDNCategoriesFlat - derive from tree instead)
  const [productsResult, allVendors, categories, manufacturers] = await Promise.all([
    getProducts({
      page,
      pageSize,
      search: params.search,
      vendor: params.vendor,
      category: params.category,
      ceMarked: params.ceMarked,
      mdrClass: params.mdrClass,
      manufacturer: params.manufacturer,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder as "asc" | "desc" | undefined,
    }),
    getVendors(),
    getEMDNCategories(),
    getManufacturers(),
  ]);

  // Flatten category tree for components that need flat list (O(n) single pass)
  const emdnCategoriesFlat = flattenCategories(categories);

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
      {/* Header - enhanced with subtle gradient and shadow */}
      <header className="h-14 border-b border-border/60 flex items-center justify-between px-6 sticky top-0 z-20 bg-gradient-to-b from-background via-background/98 to-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-light to-green-light/60 border border-green-border/60 flex items-center justify-center shadow-sm">
            <Package className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground leading-tight">{t("header.title")}</h1>
            <p className="text-xs text-muted-foreground">{t("header.subtitle")}</p>
          </div>
        </div>
        <LanguageSwitcher />
      </header>

      <div className="flex">
        <Suspense fallback={<div className="w-[420px] shrink-0 border-r border-border" />}>
          <FilterSidebar>
            {/* Search at top, not in a section */}
            <div className="pb-4 mb-1 border-b border-border">
              <SearchInput />
            </div>

            <FilterSection title={t("filters.category")} badge={params.category ? 1 : 0}>
              <CategoryTree initialCategories={categories} />
            </FilterSection>

            <FilterSection title={t("filters.vendor")} badge={selectedVendorCount}>
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
              manufacturers={manufacturers}
              pageCount={pageCount}
              totalCount={count}
              currentPage={page}
              pageSize={pageSize}
            />
          </Suspense>
        </div>
      </div>

      {/* Chat Widget */}
      <ChatWidget />
    </main>
  );
}
