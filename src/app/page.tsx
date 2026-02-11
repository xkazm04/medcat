import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getProducts, getVendors, getEMDNCategories, getManufacturers, getRefPricePaths } from "@/lib/queries";
// getVendors still needed for extraction sheet and active-filters backward compat
import { flattenCategories } from "@/lib/utils/format-category";

// ISR: Revalidate page every 60 seconds for fresh data without blocking
export const revalidate = 60;
import { FilterSidebar, FilterSection } from "@/components/filters/filter-sidebar";
import { MobileFilterTrigger } from "@/components/filters/mobile-filter-trigger";
import { CategoryTree } from "@/components/filters/category-tree";
// VendorFilter removed — vendor is now per-offering, not per-product
import { CatalogClient } from "@/components/catalog-client";
import { CatalogSkeleton } from "@/components/catalog-skeleton";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { ChatWidget } from "@/components/chat/chat-widget";
import { ChatContextWrapper } from "@/components/chat-context-wrapper";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { Package, BarChart3 } from "lucide-react";
import Link from "next/link";

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
  const isDev = process.env.NEXT_PUBLIC_DEVELOPMENT === 'true';

  const page = parseInt(params.page || "1");
  const pageSize = 20;

  // Fetch data in parallel (removed redundant getEMDNCategoriesFlat - derive from tree instead)
  const [productsResult, allVendors, categories, manufacturers, refPricePaths] = await Promise.all([
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
    getRefPricePaths(),
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

  // Vendor filter removed from sidebar — vendor is now per-offering

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
        <div className="flex items-center gap-2">
          {isDev && (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          )}
          {isDev && <ThemeToggle />}
          <LanguageSwitcher />
        </div>
      </header>

      <ChatContextWrapper>
        {/* Skip to content link for accessibility */}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-16 focus:left-4 focus:z-50 focus:bg-accent focus:text-accent-foreground focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg">
          {t("accessibility.skipToContent")}
        </a>

        <div className="flex">
          {/* Desktop sidebar — hidden on mobile */}
          <div className="hidden md:block">
            <Suspense fallback={<div className="w-[280px] shrink-0 border-r border-border" />}>
              <FilterSidebar>
                <FilterSection title={t("filters.category")} badge={params.category ? 1 : 0}>
                  <CategoryTree initialCategories={categories} />
                </FilterSection>
              </FilterSidebar>
            </Suspense>
          </div>

          {/* Mobile filter drawer */}
          <div className="md:hidden">
            <MobileFilterTrigger>
              <div className="space-y-4">
                <FilterSection title={t("filters.category")} badge={params.category ? 1 : 0}>
                  <CategoryTree initialCategories={categories} />
                </FilterSection>
              </div>
            </MobileFilterTrigger>
          </div>

          <div id="main-content" className="flex-1 p-4 md:p-6 min-w-0">
            <Suspense fallback={<CatalogSkeleton />}>
              <CatalogClient
                products={products}
                vendors={vendors}
                emdnCategories={emdnCategoriesFlat}
                categories={categories}
                manufacturers={manufacturers}
                refPricePaths={refPricePaths}
                pageCount={pageCount}
                totalCount={count}
                currentPage={page}
                pageSize={pageSize}
              />
              {/* vendors still passed for ExtractionSheet and ActiveFilters backward compat */}
            </Suspense>
          </div>
        </div>

        {/* Chat Widget */}
        <ChatWidget />

        {/* Global overlays */}
        <CommandPalette />
        <KeyboardShortcuts />
      </ChatContextWrapper>
    </main>
  );
}
