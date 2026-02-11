import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import {
  getDashboardStats,
  getDistributorBreakdown,
  getCategoryBreakdown,
  getPriceScopeBreakdown,
  getSourceCountryBreakdown,
  getManufacturerBreakdown,
  getDecompositionProgress,
} from "@/lib/queries/dashboard";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";

export const revalidate = 300; // Revalidate every 5 minutes

export default async function DashboardPage() {
  const t = await getTranslations();
  const [
    stats,
    distributorBreakdown,
    categoryBreakdown,
    priceScopeBreakdown,
    sourceCountryBreakdown,
    manufacturerBreakdown,
    decompositionProgress,
  ] = await Promise.all([
    getDashboardStats(),
    getDistributorBreakdown(),
    getCategoryBreakdown(),
    getPriceScopeBreakdown(),
    getSourceCountryBreakdown(),
    getManufacturerBreakdown(),
    getDecompositionProgress(),
  ]);

  return (
    <main className="min-h-screen bg-background">
      <header className="h-14 border-b border-border/60 flex items-center justify-between px-6 sticky top-0 z-20 bg-gradient-to-b from-background via-background/98 to-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("dashboard.backToCatalog")}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-accent" />
          <h1 className="font-semibold">{t("dashboard.title")}</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <DashboardCharts
          stats={stats}
          distributorBreakdown={distributorBreakdown}
          categoryBreakdown={categoryBreakdown}
          priceScopeBreakdown={priceScopeBreakdown}
          sourceCountryBreakdown={sourceCountryBreakdown}
          manufacturerBreakdown={manufacturerBreakdown}
          decompositionProgress={decompositionProgress}
        />
      </div>
    </main>
  );
}
