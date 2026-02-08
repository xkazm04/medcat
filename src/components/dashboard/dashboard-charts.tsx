'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Package, DollarSign, Shield, Building2 } from 'lucide-react';
import type {
  DashboardStats, PriceDistributionBucket, VendorBreakdown,
  CategoryBreakdown, RegulatoryBreakdown,
} from '@/lib/queries/dashboard';

const COLORS = ['#166534', '#22c55e', '#86efac', '#15803d', '#4ade80', '#bbf7d0', '#052e16', '#16a34a', '#a3e635', '#65a30d'];

function KPICard({ icon: Icon, label, value, sub }: { icon: typeof Package; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-background border border-border rounded-lg p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-green-light border border-green-border/60 flex items-center justify-center">
          <Icon className="h-5 w-5 text-accent" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

interface DashboardChartsProps {
  stats: DashboardStats;
  priceDistribution: PriceDistributionBucket[];
  vendorBreakdown: VendorBreakdown[];
  categoryBreakdown: CategoryBreakdown[];
  regulatoryBreakdown: RegulatoryBreakdown[];
}

export function DashboardCharts({
  stats,
  priceDistribution,
  vendorBreakdown,
  categoryBreakdown,
  regulatoryBreakdown,
}: DashboardChartsProps) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={Package} label="Total Products" value={stats.totalProducts.toLocaleString()} />
        <KPICard icon={DollarSign} label="Avg Price" value={`${stats.avgPrice.toLocaleString()} CZK`} />
        <KPICard icon={Shield} label="CE Compliance" value={`${stats.ceCompliancePercent}%`} />
        <KPICard icon={Building2} label="Vendors" value={String(stats.vendorCount)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Distribution */}
        <div className="bg-background border border-border rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold text-sm mb-4">Price Distribution (CZK)</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priceDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="range" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#166534" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vendor Breakdown */}
        <div className="bg-background border border-border rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold text-sm mb-4">Top Vendors by Products</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vendorBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} width={120} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-background border border-border rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold text-sm mb-4">Products by EMDN Category</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="code" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [value, 'Products']}
                  labelFormatter={(label) => {
                    const cat = categoryBreakdown.find(c => c.code === String(label));
                    return cat ? `${cat.code} - ${cat.name}` : String(label);
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {categoryBreakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* MDR Class Distribution */}
        <div className="bg-background border border-border rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold text-sm mb-4">MDR Classification</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={regulatoryBreakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="count"
                  nameKey="class"
                  label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {regulatoryBreakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
