import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

import {
  getDashboardSummary,
  getMonthlyTrend,
  getSplitLedger,
  getYTD,
  getCategoryList,
} from '../lib/api'
import { Chip, pctToChipVariant } from '../components/ui/Chip'
import { SkeletonTable, Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { YearMonthSelector } from '../components/ui/YearMonthSelector'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n)
}

function InitialsAvatar({ name, index }: { name: string; index: number }) {
  const colors = ['bg-[#004251]', 'bg-[#005b6f]', 'bg-[#536167]', 'bg-[#5b3200]', 'bg-[#774815]']
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${colors[index % colors.length]}`}>
      {initials}
    </div>
  )
}

export function DashboardPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [ytdOpen, setYtdOpen] = useState(false)

  const summaryQuery = useQuery({
    queryKey: ['dashboardSummary', year, month],
    queryFn: () => getDashboardSummary(year, month),
  })

  const trendQuery = useQuery({
    queryKey: ['monthlyTrend', year, selectedCategory],
    queryFn: () => getMonthlyTrend(year, selectedCategory || undefined),
  })

  const ledgerQuery = useQuery({
    queryKey: ['splitLedger', year, month],
    queryFn: () => getSplitLedger(year, month),
  })

  const ytdQuery = useQuery({
    queryKey: ['ytd', year],
    queryFn: () => getYTD(year),
    enabled: ytdOpen,
  })

  const categoryListQuery = useQuery({
    queryKey: ['categoryList'],
    queryFn: getCategoryList,
  })

  const trendData = (trendQuery.data ?? []).map((d) => ({
    ...d,
    name: MONTH_NAMES[(d.month - 1) % 12],
  }))

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#181c20]">Financial Overview</h1>
          <p className="text-sm text-[#3f484c]">Real-time expense tracking and budget variance analysis.</p>
        </div>
        <YearMonthSelector year={year} month={month} onYearChange={setYear} onMonthChange={setMonth} />
      </header>

      {/* Bento grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Monthly Summary */}
        <section className="rounded-xl bg-[#f1f4fa] p-6 lg:col-span-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#181c20]">Monthly Summary</h2>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#3f484c]">Active Budget</span>
          </div>
          {summaryQuery.isLoading ? (
            <SkeletonTable />
          ) : summaryQuery.data?.length === 0 ? (
            <EmptyState icon="bar_chart" title="No data for this period" description="Upload a statement or set up your budget to get started." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#bfc8cc]/15 text-[#3f484c]">
                    {['Category', 'Allocated', 'Actual', 'Variance', '% Used'].map((h, i) => (
                      <th key={h} className={`pb-4 text-[11px] font-bold uppercase tracking-widest ${i > 0 ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#bfc8cc]/5">
                  {summaryQuery.data?.map((row) => (
                    <tr key={row.category} className="group transition-colors hover:bg-white">
                      <td className="py-4 text-sm font-medium text-[#181c20]">{row.category}</td>
                      <td className="py-4 text-right text-sm text-[#3f484c]">
                        <span className="text-[#70787c]">₹</span>{row.allocated_monthly.toFixed(2)}
                      </td>
                      <td className="py-4 text-right text-sm font-bold text-[#181c20]">
                        <span className="font-normal text-[#70787c]">₹</span>{row.actual.toFixed(2)}
                      </td>
                      <td className={`py-4 text-right text-sm ${row.variance >= 0 ? 'text-[#005b6f]' : 'text-[#ba1a1a]'}`}>
                        {row.variance >= 0 ? '+' : ''}{formatCurrency(row.variance)}
                      </td>
                      <td className="py-4 text-right">
                        <Chip variant={pctToChipVariant(row.pct_used)}>
                          {row.pct_used !== null ? `${Math.round(row.pct_used)}%` : '—'}
                        </Chip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Split Ledger */}
        <section className="flex flex-col rounded-xl bg-[#f1f4fa] p-6 lg:col-span-4">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#181c20]">Split Ledger</h2>
            <span className="material-symbols-outlined text-[#3f484c]">group</span>
          </div>
          {ledgerQuery.isLoading ? (
            <SkeletonTable rows={3} />
          ) : !ledgerQuery.data?.length ? (
            <p className="text-sm text-[#3f484c]">No split expenses this period.</p>
          ) : (
            <div className="flex-1 space-y-3">
              {ledgerQuery.data.map((row, i) => (
                <div key={row.person_id} className="flex items-center justify-between rounded-xl bg-white p-4">
                  <div className="flex items-center gap-3">
                    <InitialsAvatar name={row.person_name} index={i} />
                    <div>
                      <p className="text-sm font-bold text-[#181c20]">{row.person_name}</p>
                      <p className="text-[11px] text-[#3f484c]">Shared Expenses</p>
                    </div>
                  </div>
                  <p className="text-sm font-black text-[#181c20]">{formatCurrency(row.total_amount)}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Spending Trend */}
        <section className="rounded-xl bg-[#f1f4fa] p-6 lg:col-span-12">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#181c20]">Spending Trend</h2>
              <p className="text-sm text-[#3f484c]">Annual variance over the last 12 months.</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-lg border-none bg-[#dfe3e8] p-2 text-xs font-bold uppercase tracking-widest text-[#181c20] focus:ring-0"
                aria-label="Filter by category"
              >
                <option value="">All Categories</option>
                {(categoryListQuery.data ?? []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="flex items-center rounded-lg bg-[#dfe3e8] p-1">
                {(['bar', 'line'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setChartType(t)}
                    className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${chartType === t ? 'bg-white text-[#181c20] shadow-sm' : 'text-[#3f484c]'}`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {trendQuery.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              {chartType === 'bar' ? (
                <BarChart data={trendData} barSize={28}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#3f484c', fontWeight: 600 }} />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: 'none', borderRadius: 12, boxShadow: '0 8px 40px rgba(24,28,32,0.08)', fontSize: 12 }}
                    formatter={(v) => [formatCurrency(Number(v)), 'Spend']}
                  />
                  <Bar dataKey="amount" fill="#8dd0e7" radius={[4, 4, 0, 0]} activeBar={{ fill: '#004251' }} />
                </BarChart>
              ) : (
                <LineChart data={trendData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#3f484c', fontWeight: 600 }} />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: 'none', borderRadius: 12, boxShadow: '0 8px 40px rgba(24,28,32,0.08)', fontSize: 12 }}
                    formatter={(v) => [formatCurrency(Number(v)), 'Spend']}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#004251" strokeWidth={2.5} dot={{ fill: '#004251', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </section>
      </div>

      {/* YTD Collapsible */}
      <section className="overflow-hidden rounded-xl bg-[#ebeef4]">
        <button
          onClick={() => setYtdOpen((o) => !o)}
          className="flex w-full items-center justify-between p-6 transition-colors hover:bg-[#e5e8ee]"
          aria-expanded={ytdOpen}
        >
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-[#004251]">analytics</span>
            <h2 className="text-lg font-bold text-[#181c20]">Year-To-Date (YTD) Summary</h2>
          </div>
          <span className={`material-symbols-outlined transition-transform ${ytdOpen ? 'rotate-180' : ''}`}>expand_more</span>
        </button>
        {ytdOpen && (
          <div className="border-t border-[#bfc8cc]/10 p-6 pt-4">
            {ytdQuery.isLoading ? (
              <SkeletonTable />
            ) : ytdQuery.data?.length === 0 ? (
              <EmptyState icon="analytics" title="No YTD data available" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#bfc8cc]/15 text-[#3f484c]">
                      {['Category', 'YTD Allocated', 'YTD Actual', 'Variance', '% Used'].map((h, i) => (
                        <th key={h} className={`pb-4 text-[11px] font-bold uppercase tracking-widest ${i > 0 ? 'text-right' : ''}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#bfc8cc]/5">
                    {ytdQuery.data?.map((row) => (
                      <tr key={row.category} className="transition-colors hover:bg-[#f1f4fa]">
                        <td className="py-4 text-sm font-medium text-[#181c20]">{row.category}</td>
                        <td className="py-4 text-right text-sm text-[#3f484c]">{formatCurrency(row.allocated_ytd)}</td>
                        <td className="py-4 text-right text-sm font-bold text-[#181c20]">{formatCurrency(row.actual_ytd)}</td>
                        <td className={`py-4 text-right text-sm ${row.variance >= 0 ? 'text-[#005b6f]' : 'text-[#ba1a1a]'}`}>
                          {row.variance >= 0 ? '+' : ''}{formatCurrency(row.variance)}
                        </td>
                        <td className="py-4 text-right">
                          <Chip variant={pctToChipVariant(row.pct_used)}>
                            {row.pct_used !== null ? `${Math.round(row.pct_used)}%` : '—'}
                          </Chip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
