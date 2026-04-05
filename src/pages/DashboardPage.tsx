import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts'

import {
  getDashboardSummary,
  getProcessedTransactions,
  getCategoryList,
  getSplitLedger,
  getYTD,
} from '../lib/api'
import { Chip, pctToChipVariant } from '../components/ui/Chip'
import { SkeletonTable, Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { YearMonthSelector } from '../components/ui/YearMonthSelector'
import { useThemeContext } from '../hooks/useThemeContext'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n)
}

const avatarColorClasses = [
  'bg-primary text-on-primary',
  'bg-primary-container text-on-primary-container',
  'bg-secondary text-on-secondary',
  'bg-tertiary text-on-tertiary',
  'bg-tertiary-container text-on-tertiary-container',
]

function InitialsAvatar({ name, index }: { name: string; index: number }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarColorClasses[index % avatarColorClasses.length]}`}
    >
      {initials}
    </div>
  )
}

export function DashboardPage() {
  const now = new Date()
  const { isDark } = useThemeContext()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar')
  const [trendChartType, setTrendChartType] = useState<'bar' | 'line'>('line')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [ytdOpen, setYtdOpen] = useState(false)

  const summaryQuery = useQuery({
    queryKey: ['dashboardSummary', year, month],
    queryFn: () => getDashboardSummary(year, month),
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

  const categoryListQuery = useQuery({ queryKey: ['categoryList'], queryFn: getCategoryList })

  const categoryTxnQuery = useQuery({
    queryKey: ['processedTransactions', year, month, selectedCategory],
    queryFn: () => getProcessedTransactions(year, month, selectedCategory),
    enabled: selectedCategory !== '',
  })

  const categoryChartData = (summaryQuery.data ?? []).map((row) => ({
    name: row.category,
    amount: Number(row.actual),
  }))

  const trendData = (categoryTxnQuery.data ?? []).map((d) => ({
    desc: d.description.slice(0, 14),
    date: d.txn_date,
    amount: Number(d.effective_amount),
    fullName: d.description,
  }))

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-on-surface text-3xl font-black tracking-tight">Financial Overview</h1>
          <p className="text-on-surface-variant text-sm">
            Real-time expense tracking and budget variance analysis.
          </p>
        </div>
        <YearMonthSelector
          year={year}
          month={month}
          onYearChange={setYear}
          onMonthChange={setMonth}
        />
      </header>

      {/* Bento grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Monthly Summary */}
        <section className="bg-surface-container-low rounded-xl p-6 lg:col-span-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-on-surface text-lg font-bold">Monthly Summary</h2>
            <span className="text-on-surface-variant text-[11px] font-bold tracking-widest uppercase">
              Active Budget
            </span>
          </div>
          {summaryQuery.isLoading ? (
            <SkeletonTable />
          ) : summaryQuery.data?.length === 0 ? (
            <EmptyState
              icon="bar_chart"
              title="No data for this period"
              description="Upload a statement or set up your budget to get started."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-outline-variant/15 text-on-surface-variant border-b">
                    {['Category', 'Allocated', 'Actual', 'Variance', '% Used'].map((h, i) => (
                      <th
                        key={h}
                        className={`pb-4 text-[11px] font-bold tracking-widest uppercase ${i > 0 ? 'text-right' : ''}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-outline-variant/5 divide-y">
                  {summaryQuery.data?.map((row) => (
                    <tr
                      key={row.category}
                      className="group hover:bg-surface-container-lowest transition-colors"
                    >
                      <td className="text-on-surface py-4 text-sm font-medium">{row.category}</td>
                      <td className="text-on-surface-variant py-4 text-right text-sm">
                        <span className="text-outline">₹</span>
                        {Number(row.allocated_monthly).toFixed(2)}
                      </td>
                      <td className="text-on-surface py-4 text-right text-sm font-bold">
                        <span className="text-outline font-normal">₹</span>
                        {Number(row.actual).toFixed(2)}
                      </td>
                      <td
                        className={`py-4 text-right text-sm ${row.variance >= 0 ? 'text-primary' : 'text-error'}`}
                      >
                        {row.variance >= 0 ? '+' : ''}
                        {formatCurrency(row.variance)}
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
        <section className="bg-surface-container-low flex flex-col rounded-xl p-6 lg:col-span-4">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-on-surface text-lg font-bold">Split Ledger</h2>
            <span className="material-symbols-outlined text-on-surface-variant">group</span>
          </div>
          {ledgerQuery.isLoading ? (
            <SkeletonTable rows={3} />
          ) : !ledgerQuery.data?.length ? (
            <p className="text-on-surface-variant text-sm">No split expenses this period.</p>
          ) : (
            <div className="flex-1 space-y-3">
              {ledgerQuery.data.map((row, i) => (
                <div
                  key={row.person_name}
                  className="bg-surface-container-lowest flex items-center justify-between rounded-xl p-4"
                >
                  <div className="flex items-center gap-3">
                    <InitialsAvatar name={row.person_name} index={i} />
                    <div>
                      <p className="text-on-surface text-sm font-bold">{row.person_name}</p>
                      <p className="text-on-surface-variant text-[11px]">Shared Expenses</p>
                    </div>
                  </div>
                  <p className="text-on-surface text-sm font-black">
                    {formatCurrency(Number(row.total_split_amount))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Spending Trend */}
        <section className="bg-surface-container-low rounded-xl p-6 lg:col-span-12">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-on-surface text-lg font-bold">Category Spending</h2>
              <p className="text-on-surface-variant text-sm">
                Expenditure by category for the selected month.
              </p>
            </div>
            <div className="bg-surface-container-high flex items-center rounded-lg p-1">
              {(['bar', 'line'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setChartType(t)}
                  className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${chartType === t ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant'}`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {summaryQuery.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              {chartType === 'bar' ? (
                <BarChart data={categoryChartData} barSize={28}>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: isDark ? '#8a9499' : '#70787c', fontWeight: 600 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-surface-container-lowest)',
                      border: 'none',
                      borderRadius: 12,
                      boxShadow: isDark
                        ? '0 8px 40px rgba(0,0,0,0.4)'
                        : '0 8px 40px rgba(24,28,32,0.08)',
                      fontSize: 12,
                      color: 'var(--app-on-surface)',
                    }}
                    formatter={(v) => [formatCurrency(Number(v)), 'Spend']}
                  />
                  <Bar
                    dataKey="amount"
                    fill="#8dd0e7"
                    radius={[4, 4, 0, 0]}
                    activeBar={{ fill: isDark ? '#b4ebff' : '#004251' }}
                  />
                </BarChart>
              ) : (
                <LineChart data={categoryChartData}>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: isDark ? '#8a9499' : '#70787c', fontWeight: 600 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-surface-container-lowest)',
                      border: 'none',
                      borderRadius: 12,
                      boxShadow: isDark
                        ? '0 8px 40px rgba(0,0,0,0.4)'
                        : '0 8px 40px rgba(24,28,32,0.08)',
                      fontSize: 12,
                      color: 'var(--app-on-surface)',
                    }}
                    formatter={(v) => [formatCurrency(Number(v)), 'Spend']}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#8dd0e7"
                    strokeWidth={2.5}
                    dot={{ fill: '#8dd0e7', r: 4 }}
                    activeDot={{ r: 6, fill: isDark ? '#b4ebff' : '#004251' }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </section>

        {/* Monthly Trend by Category */}
        <section className="bg-surface-container-low rounded-xl p-6 lg:col-span-12">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-on-surface text-lg font-bold">Transactions by Category</h2>
              <p className="text-on-surface-variant text-sm">
                Individual transactions for the selected category and month.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-surface-container-high text-on-surface rounded-lg border-none p-2 text-xs font-bold tracking-widest uppercase focus:ring-0"
                aria-label="Select category"
              >
                <option value="">— Pick a category —</option>
                {(categoryListQuery.data ?? []).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <div className="bg-surface-container-high flex items-center rounded-lg p-1">
                {(['bar', 'line'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTrendChartType(t)}
                    className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${trendChartType === t ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant'}`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {!selectedCategory ? (
            <EmptyState
              icon="stacked_line_chart"
              title="Select a category"
              description="Choose a category above to see its monthly spending trend."
            />
          ) : categoryTxnQuery.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : !trendData.length ? (
            <EmptyState
              icon="stacked_line_chart"
              title="No data"
              description="No transactions found for this category."
            />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              {trendChartType === 'bar' ? (
                <BarChart data={trendData} barSize={28} margin={{ bottom: 60 }}>
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    tick={({ x, y, payload }) => {
                      const fill = isDark ? '#8a9499' : '#70787c'
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text
                            x={0}
                            y={0}
                            dy={8}
                            textAnchor="end"
                            fill={fill}
                            fontSize={10}
                            transform="rotate(-40)"
                          >
                            {payload.value}
                          </text>
                        </g>
                      )
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-surface-container-lowest)',
                      border: 'none',
                      borderRadius: 12,
                      boxShadow: isDark
                        ? '0 8px 40px rgba(0,0,0,0.4)'
                        : '0 8px 40px rgba(24,28,32,0.08)',
                      fontSize: 12,
                      color: 'var(--app-on-surface)',
                    }}
                    formatter={(v, _, props) => [formatCurrency(Number(v)), props.payload.fullName]}
                  />
                  <Bar
                    dataKey="amount"
                    fill="#8dd0e7"
                    radius={[4, 4, 0, 0]}
                    activeBar={{ fill: isDark ? '#b4ebff' : '#004251' }}
                  />
                </BarChart>
              ) : (
                <LineChart data={trendData} margin={{ bottom: 60 }}>
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    tick={({ x, y, payload }) => {
                      const fill = isDark ? '#8a9499' : '#70787c'
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text
                            x={0}
                            y={0}
                            dy={8}
                            textAnchor="end"
                            fill={fill}
                            fontSize={10}
                            transform="rotate(-40)"
                          >
                            {payload.value}
                          </text>
                        </g>
                      )
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-surface-container-lowest)',
                      border: 'none',
                      borderRadius: 12,
                      boxShadow: isDark
                        ? '0 8px 40px rgba(0,0,0,0.4)'
                        : '0 8px 40px rgba(24,28,32,0.08)',
                      fontSize: 12,
                      color: 'var(--app-on-surface)',
                    }}
                    formatter={(v, _, props) => [formatCurrency(Number(v)), props.payload.fullName]}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#8dd0e7"
                    strokeWidth={2.5}
                    dot={{ fill: '#8dd0e7', r: 4 }}
                    activeDot={{ r: 6, fill: isDark ? '#b4ebff' : '#004251' }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </section>
      </div>

      {/* YTD Collapsible */}
      <section className="bg-surface-container overflow-hidden rounded-xl">
        <button
          onClick={() => setYtdOpen((o) => !o)}
          className="hover:bg-surface-container-high flex w-full items-center justify-between p-6 transition-colors"
          aria-expanded={ytdOpen}
        >
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-primary">analytics</span>
            <h2 className="text-on-surface text-lg font-bold">Year-To-Date (YTD) Summary</h2>
          </div>
          <span
            className={`material-symbols-outlined transition-transform ${ytdOpen ? 'rotate-180' : ''}`}
          >
            expand_more
          </span>
        </button>
        {ytdOpen && (
          <div className="border-outline-variant/10 border-t p-6 pt-4">
            {ytdQuery.isLoading ? (
              <SkeletonTable />
            ) : ytdQuery.data?.length === 0 ? (
              <EmptyState icon="analytics" title="No YTD data available" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-outline-variant/15 text-on-surface-variant border-b">
                      {['Category', 'YTD Allocated', 'YTD Actual', 'Variance', '% Used'].map(
                        (h, i) => (
                          <th
                            key={h}
                            className={`pb-4 text-[11px] font-bold tracking-widest uppercase ${i > 0 ? 'text-right' : ''}`}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-outline-variant/5 divide-y">
                    {ytdQuery.data?.map((row) => (
                      <tr
                        key={row.category}
                        className="hover:bg-surface-container-low transition-colors"
                      >
                        <td className="text-on-surface py-4 text-sm font-medium">{row.category}</td>
                        <td className="text-on-surface-variant py-4 text-right text-sm">
                          {formatCurrency(Number(row.allocated_ytd))}
                        </td>
                        <td className="text-on-surface py-4 text-right text-sm font-bold">
                          {formatCurrency(Number(row.actual_ytd))}
                        </td>
                        <td
                          className={`py-4 text-right text-sm ${Number(row.variance) >= 0 ? 'text-primary' : 'text-error'}`}
                        >
                          {Number(row.variance) >= 0 ? '+' : ''}
                          {formatCurrency(Number(row.variance))}
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
