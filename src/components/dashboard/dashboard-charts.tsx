'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart,
  RadialBar, Legend,
} from 'recharts';
import {
  Package, Database, TrendingUp, Building2, Boxes, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type {
  DashboardStats, DistributorBreakdown, CategoryBreakdown,
  PriceScopeBreakdown, SourceCountryBreakdown, ManufacturerBreakdown,
  DecompositionProgress,
} from '@/lib/queries/dashboard';

// --- Colors ---

const SCOPE_COLORS: Record<string, string> = {
  set: '#9333ea',
  component: '#0d9488',
  procedure: '#ea580c',
};

const COUNTRY_COLORS: Record<string, string> = {
  SK: '#166534',
  FR: '#2563eb',
  CZ: '#dc2626',
  GB: '#7c3aed',
};

const GREENS = ['#166534', '#22c55e', '#86efac', '#15803d', '#4ade80', '#bbf7d0', '#052e16', '#16a34a', '#a3e635', '#65a30d', '#059669', '#34d399'];

// --- Tooltip ---

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name?: string; payload?: Record<string, unknown> }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-md text-xs">
      {label && <div className="font-medium text-foreground mb-1">{label}</div>}
      {payload.map((entry, i) => (
        <div key={i} className="text-muted-foreground">
          {entry.name && <span className="mr-1">{entry.name}:</span>}
          <span className="font-medium text-foreground">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// --- Chart Card wrapper ---

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-background border border-border rounded-lg shadow-sm ${className || ''}`}>
      <div className="px-5 py-3 border-b border-border/60">
        <h3 className="font-semibold text-sm text-foreground">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// --- KPI Card ---

interface KPICardProps {
  icon: typeof Package;
  label: string;
  value: string;
  sub?: string;
  href?: string;
  accentColor?: string;
}

function KPICard({ icon: Icon, label, value, sub, href, accentColor }: KPICardProps) {
  const content = (
    <div className={`bg-background border border-border rounded-lg p-5 shadow-sm transition-colors ${href ? 'hover:border-accent/40 hover:shadow-md cursor-pointer' : ''}`}>
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg border flex items-center justify-center"
          style={{
            backgroundColor: accentColor ? `${accentColor}15` : undefined,
            borderColor: accentColor ? `${accentColor}40` : undefined,
          }}
        >
          <Icon className="h-5 w-5" style={accentColor ? { color: accentColor } : undefined} />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
        {href && <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />}
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

// --- Scope label helper ---

function scopeLabel(scope: string) {
  return scope.charAt(0).toUpperCase() + scope.slice(1);
}

// --- Main Component ---

interface DashboardChartsProps {
  stats: DashboardStats;
  distributorBreakdown: DistributorBreakdown[];
  categoryBreakdown: CategoryBreakdown[];
  priceScopeBreakdown: PriceScopeBreakdown[];
  sourceCountryBreakdown: SourceCountryBreakdown[];
  manufacturerBreakdown: ManufacturerBreakdown[];
  decompositionProgress: DecompositionProgress;
}

export function DashboardCharts({
  stats,
  distributorBreakdown,
  categoryBreakdown,
  priceScopeBreakdown,
  sourceCountryBreakdown,
  manufacturerBreakdown,
  decompositionProgress,
}: DashboardChartsProps) {
  const t = useTranslations();
  const coveragePercent = stats.totalProducts > 0
    ? Math.round((stats.priceCoverageCount / stats.totalProducts) * 100)
    : 0;

  // Prepare scope donut data
  const scopeData = priceScopeBreakdown.map(d => ({
    name: scopeLabel(d.scope),
    value: d.count,
    fill: SCOPE_COLORS[d.scope] || '#94a3b8',
  }));

  // Prepare decomposition gauge data
  const gaugeData = [
    {
      name: 'Decomposed',
      value: decompositionProgress.percentComplete,
      fill: '#22c55e',
    },
  ];

  // Prepare country data
  const countryData = sourceCountryBreakdown.map(d => ({
    name: d.country,
    count: d.count,
    fill: COUNTRY_COLORS[d.country] || '#94a3b8',
  }));

  // Prepare manufacturer data
  const mfgData = manufacturerBreakdown.map((d, i) => ({
    name: d.name,
    count: d.count,
    fill: GREENS[i % GREENS.length],
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard
          icon={Package}
          label={t('dashboard.kpi.totalProducts')}
          value={stats.totalProducts.toLocaleString()}
          sub={t('dashboard.kpi.inCatalog')}
          accentColor="#166534"
        />
        <KPICard
          icon={Database}
          label={t('dashboard.kpi.referencePrices')}
          value={stats.referencePriceCount.toLocaleString()}
          sub={t('dashboard.kpi.fromCountries', { count: sourceCountryBreakdown.length })}
          accentColor="#2563eb"
        />
        <KPICard
          icon={TrendingUp}
          label={t('dashboard.kpi.priceCoverage')}
          value={stats.priceCoverageCount.toLocaleString()}
          sub={`${coveragePercent}% ${t('dashboard.kpi.ofProducts')}`}
          accentColor="#0d9488"
        />
        <KPICard
          icon={Building2}
          label={t('dashboard.kpi.distributors')}
          value={String(stats.distributorCount)}
          sub={t('dashboard.kpi.registered')}
          accentColor="#166534"
        />
        <KPICard
          icon={Boxes}
          label={t('dashboard.kpi.unprocessedSets')}
          value={String(decompositionProgress.pending)}
          sub={t('dashboard.kpi.setsToDecompose')}
          href="/sets"
          accentColor="#9333ea"
        />
      </div>

      {/* Charts Row 1: Scope Donut + Decomposition Gauge + Countries */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ChartCard title={t('dashboard.charts.priceScopeDistribution')}>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={scopeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {scopeData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title={t('dashboard.charts.setDecompositionProgress')}>
          <div className="h-[280px] flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="90%"
                startAngle={180}
                endAngle={0}
                barSize={20}
                data={gaugeData}
              >
                <RadialBar
                  dataKey="value"
                  cornerRadius={10}
                  background={{ fill: 'var(--color-muted)' }}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="text-center -mt-16">
              <div className="text-3xl font-bold text-foreground">{decompositionProgress.percentComplete}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                {decompositionProgress.decomposed} {t('dashboard.charts.ofSets', { total: decompositionProgress.totalSets })}
              </div>
            </div>
          </div>
        </ChartCard>

        <ChartCard title={t('dashboard.charts.sourceCountries')}>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={countryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} width={40} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {countryData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Charts Row 2: Top Distributors (span 2) + Manufacturers (span 1) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ChartCard title={t('dashboard.charts.topDistributorsByProducts')} className="lg:col-span-2">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributorBreakdown.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} width={140} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="productCount" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title={t('dashboard.charts.topManufacturers')}>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mfgData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} width={100} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {mfgData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Charts Row 3: EMDN Categories (full width) */}
      <div className="grid grid-cols-1 gap-4">
        <ChartCard title={t('dashboard.charts.productsByCategory')}>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="code" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload as CategoryBreakdown;
                    return (
                      <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-md text-xs">
                        <div className="font-medium text-foreground mb-1">{data.code} - {data.name}</div>
                        <div className="text-muted-foreground">
                          {t('dashboard.charts.products')} <span className="font-medium text-foreground">{data.count.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {categoryBreakdown.map((_, i) => (
                    <Cell key={i} fill={GREENS[i % GREENS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
