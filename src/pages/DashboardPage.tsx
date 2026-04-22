import { useState, useMemo } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  Legend,
  ResponsiveContainer,
} from 'recharts'

import {
  getDashboardSummary,
  getProcessedTransactions,
  getCategories,
  getTags,
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

function formatCompact(n: number) {
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}k`
  return `₹${n}`
}

const PIE_COLORS = [
  '#D4A07A',
  '#C08552',
  '#E8C4A0',
  '#A06840',
  '#4DB896',
  '#3DA882',
  '#80D4B4',
  '#2A7A5E',
  '#C4806A',
  '#7AB4D4',
  '#D4B47A',
  '#8A7AC4',
]

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
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar')
  const [trendChartType, setTrendChartType] = useState<'bar' | 'line' | 'pie'>('bar')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedTagId, setSelectedTagId] = useState('')
  const [ytdOpen, setYtdOpen] = useState(false)
  const [includeSettled, setIncludeSettled] = useState(false)

  const summaryQuery = useQuery({
    queryKey: ['dashboardSummary', year, month, selectedTagId],
    queryFn: () => getDashboardSummary(year, month, selectedTagId || undefined),
  })

  const ledgerQuery = useQuery({
    queryKey: ['splitLedger', year, month, includeSettled],
    queryFn: () => getSplitLedger(year, month, includeSettled),
  })

  const ytdQuery = useQuery({
    queryKey: ['ytd', year],
    queryFn: () => getYTD(year),
    enabled: ytdOpen,
  })

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  const tagsQuery = useQuery({ queryKey: ['tags'], queryFn: getTags })

  const categoryTxnQuery = useQuery({
    queryKey: ['processedTransactions', year, month, selectedCategoryId, selectedTagId],
    queryFn: () =>
      getProcessedTransactions(
        year,
        month,
        selectedCategoryId || undefined,
        selectedTagId || undefined
      ),
    enabled: selectedCategoryId !== '',
    placeholderData: keepPreviousData,
  })

  const hasTags = (tagsQuery.data ?? []).length > 0
  const allTxnQuery = useQuery({
    queryKey: ['allTransactionsForTags', year, month],
    queryFn: () => getProcessedTransactions(year, month),
    enabled: hasTags,
  })

  const tagSpendData = useMemo(() => {
    const map = new Map<string, { id: string; name: string; debit: number; credit: number }>()
    for (const txn of allTxnQuery.data ?? []) {
      for (const tag of txn.tags) {
        const amt = Number(txn.effective_amount)
        const entry = map.get(tag.id) ?? { id: tag.id, name: tag.name, debit: 0, credit: 0 }
        if (amt > 0) entry.debit += amt
        else entry.credit += Math.abs(amt)
        map.set(tag.id, entry)
      }
    }
    return Array.from(map.values()).sort((a, b) => b.debit - a.debit)
  }, [allTxnQuery.data])

  const categoryTagMatrix = useMemo(() => {
    const tags = tagsQuery.data ?? []
    if (!tags.length || !allTxnQuery.data?.length) return { rows: [], tags: [] }

    const usedTagIds = new Set<string>()
    const catMap = new Map<string, Map<string, number>>()

    for (const txn of allTxnQuery.data) {
      if (!txn.tags.length) continue
      const amt = Number(txn.effective_amount)
      if (amt <= 0) continue
      if (!catMap.has(txn.category)) catMap.set(txn.category, new Map())
      const tagTotals = catMap.get(txn.category)!
      for (const tag of txn.tags) {
        tagTotals.set(tag.id, (tagTotals.get(tag.id) ?? 0) + amt)
        usedTagIds.add(tag.id)
      }
    }

    const usedTags = tags.filter((t) => usedTagIds.has(t.id))
    const rows = Array.from(catMap.entries())
      .map(([category, tagTotals]) => ({
        category,
        totals: usedTags.map((t) => tagTotals.get(t.id) ?? 0),
        rowTotal: usedTags.reduce((s, t) => s + (tagTotals.get(t.id) ?? 0), 0),
      }))
      .sort((a, b) => b.rowTotal - a.rowTotal)

    return { rows, tags: usedTags }
  }, [allTxnQuery.data, tagsQuery.data])

  const summaryRows = summaryQuery.data ?? []
  const totalDebit = summaryRows
    .filter((r) => Number(r.actual) > 0)
    .reduce((s, r) => s + Number(r.actual), 0)
  const totalCredit = summaryRows
    .filter((r) => Number(r.actual) < 0)
    .reduce((s, r) => s + Math.abs(Number(r.actual)), 0)
  const netSavings = totalCredit - totalDebit

  const categoryChartData = summaryRows.map((row) => ({
    name: row.category,
    debit: Number(row.actual) > 0 ? Number(row.actual) : 0,
    credit: Number(row.actual) < 0 ? Math.abs(Number(row.actual)) : 0,
  }))

  const trendData = (categoryTxnQuery.data ?? []).map((d) => {
    const amt = Number(d.effective_amount)
    return {
      desc: d.description.slice(0, 14),
      date: d.txn_date,
      debit: amt > 0 ? amt : 0,
      credit: amt < 0 ? Math.abs(amt) : 0,
      fullName: d.description,
    }
  })

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
        <div className="flex items-center gap-3">
          {(tagsQuery.data ?? []).length > 0 && (
            <select
              value={selectedTagId}
              onChange={(e) => setSelectedTagId(e.target.value)}
              className="bg-surface-container-high text-on-surface rounded-lg border-none p-2 text-xs font-bold tracking-widest uppercase focus:ring-0"
              aria-label="Filter by tag"
            >
              <option value="">All tags</option>
              {(tagsQuery.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          <YearMonthSelector
            year={year}
            month={month}
            onYearChange={setYear}
            onMonthChange={setMonth}
          />
        </div>
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

          {/* Stats bar */}
          {!summaryQuery.isLoading && summaryRows.length > 0 && (
            <div className="mb-6 grid grid-cols-3 gap-3">
              <div className="bg-surface-container rounded-xl px-4 py-3">
                <p className="text-on-surface-variant mb-1 text-[10px] font-bold tracking-widest uppercase">
                  Total Debit
                </p>
                <p className="text-error text-lg font-black tracking-tight">
                  {formatCurrency(totalDebit)}
                </p>
              </div>
              <div className="bg-surface-container rounded-xl px-4 py-3">
                <p className="text-on-surface-variant mb-1 text-[10px] font-bold tracking-widest uppercase">
                  Total Credit
                </p>
                <p
                  className="text-lg font-black tracking-tight"
                  style={{ color: isDark ? '#6BCFAA' : '#2E8B6A' }}
                >
                  {formatCurrency(totalCredit)}
                </p>
              </div>
              <div className="bg-surface-container rounded-xl px-4 py-3">
                <p className="text-on-surface-variant mb-1 text-[10px] font-bold tracking-widest uppercase">
                  Net Savings
                </p>
                <p
                  className={`text-lg font-black tracking-tight ${netSavings >= 0 ? '' : 'text-error'}`}
                  style={netSavings >= 0 ? { color: isDark ? '#6BCFAA' : '#2E8B6A' } : undefined}
                >
                  {netSavings >= 0 ? '+' : ''}
                  {formatCurrency(netSavings)}
                </p>
              </div>
            </div>
          )}
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
            <button
              onClick={() => setIncludeSettled((v) => !v)}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
                includeSettled
                  ? 'bg-primary/10 text-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
              title={includeSettled ? 'Hiding settled' : 'Showing unsettled only'}
            >
              <span className="material-symbols-outlined text-[14px]">
                {includeSettled ? 'toggle_on' : 'toggle_off'}
              </span>
              Settled
            </button>
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
              {(['bar', 'line', 'pie'] as const).map((t) => (
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
          {/* Legend — hidden for pie since it has its own */}
          {!summaryQuery.isLoading && categoryChartData.length > 0 && chartType !== 'pie' && (
            <div className="mb-4 flex items-center gap-4">
              <span
                className="flex items-center gap-1.5 text-xs font-medium"
                style={{ color: isDark ? '#C4A080' : '#9C7060' }}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ background: isDark ? '#D4A07A' : '#C08552' }}
                />
                Debit
              </span>
              <span
                className="flex items-center gap-1.5 text-xs font-medium"
                style={{ color: isDark ? '#6BCFAA' : '#2E8B6A' }}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ background: isDark ? '#4DB896' : '#3DA882' }}
                />
                Credit
              </span>
            </div>
          )}
          {summaryQuery.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : chartType === 'pie' ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Debit pie */}
              <div>
                <p className="text-on-surface-variant mb-2 text-center text-xs font-bold tracking-widest uppercase">
                  Debit by Category
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={categoryChartData.filter((d) => d.debit > 0)}
                      dataKey="debit"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      label={({ name, percent }) =>
                        percent > 0.04 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                      }
                      labelLine={false}
                    >
                      {categoryChartData
                        .filter((d) => d.debit > 0)
                        .map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--color-surface-container-lowest)',
                        border: 'none',
                        borderRadius: 12,
                        boxShadow: isDark
                          ? '0 8px 40px rgba(0,0,0,0.4)'
                          : '0 8px 40px rgba(44,26,23,0.08)',
                        fontSize: 12,
                        color: 'var(--app-on-surface)',
                      }}
                      formatter={(v) => [formatCurrency(Number(v)), 'Debit']}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(v) => (
                        <span style={{ fontSize: 11, color: isDark ? '#C4A080' : '#9C7060' }}>
                          {v}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Credit pie */}
              <div>
                <p className="text-on-surface-variant mb-2 text-center text-xs font-bold tracking-widest uppercase">
                  Credit by Category
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={categoryChartData.filter((d) => d.credit > 0)}
                      dataKey="credit"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      label={({ name, percent }) =>
                        percent > 0.04 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                      }
                      labelLine={false}
                    >
                      {categoryChartData
                        .filter((d) => d.credit > 0)
                        .map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[(i + 4) % PIE_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--color-surface-container-lowest)',
                        border: 'none',
                        borderRadius: 12,
                        boxShadow: isDark
                          ? '0 8px 40px rgba(0,0,0,0.4)'
                          : '0 8px 40px rgba(44,26,23,0.08)',
                        fontSize: 12,
                        color: 'var(--app-on-surface)',
                      }}
                      formatter={(v) => [formatCurrency(Number(v)), 'Credit']}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(v) => (
                        <span style={{ fontSize: 11, color: isDark ? '#C4A080' : '#9C7060' }}>
                          {v}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              {chartType === 'bar' ? (
                <BarChart
                  data={categoryChartData}
                  barSize={20}
                  barGap={4}
                  margin={{ top: 20, right: 8, left: 8, bottom: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                    strokeDasharray="4 4"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: isDark ? '#C4A080' : '#9C7060', fontWeight: 600 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: isDark ? '#C4A080' : '#9C7060' }}
                    tickFormatter={formatCompact}
                    width={52}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(192,133,82,0.08)' }}
                    contentStyle={{
                      background: 'var(--color-surface-container-lowest)',
                      border: 'none',
                      borderRadius: 12,
                      boxShadow: isDark
                        ? '0 8px 40px rgba(0,0,0,0.4)'
                        : '0 8px 40px rgba(44,26,23,0.08)',
                      fontSize: 12,
                      color: 'var(--app-on-surface)',
                    }}
                    formatter={(v, name) => [
                      formatCurrency(Number(v)),
                      name === 'debit' ? 'Debit' : 'Credit',
                    ]}
                  />
                  <Bar
                    dataKey="debit"
                    fill={isDark ? '#D4A07A' : '#C08552'}
                    radius={[4, 4, 0, 0]}
                    activeBar={{ fill: isDark ? '#FFE0C2' : '#8C5A3C' }}
                  >
                    <LabelList
                      dataKey="debit"
                      position="top"
                      formatter={(v: number) => (v > 0 ? formatCompact(v) : '')}
                      style={{ fontSize: 9, fill: isDark ? '#C4A080' : '#9C7060', fontWeight: 600 }}
                    />
                  </Bar>
                  <Bar
                    dataKey="credit"
                    fill={isDark ? '#4DB896' : '#3DA882'}
                    radius={[4, 4, 0, 0]}
                    activeBar={{ fill: isDark ? '#A0EDD4' : '#2A7A5E' }}
                  >
                    <LabelList
                      dataKey="credit"
                      position="top"
                      formatter={(v: number) => (v > 0 ? formatCompact(v) : '')}
                      style={{ fontSize: 9, fill: isDark ? '#6BCFAA' : '#2E8B6A', fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              ) : (
                <LineChart
                  data={categoryChartData}
                  margin={{ top: 20, right: 8, left: 8, bottom: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                    strokeDasharray="4 4"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: isDark ? '#C4A080' : '#9C7060', fontWeight: 600 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: isDark ? '#C4A080' : '#9C7060' }}
                    tickFormatter={formatCompact}
                    width={52}
                  />
                  <Tooltip
                    cursor={{ stroke: 'rgba(192,133,82,0.2)', strokeWidth: 1 }}
                    contentStyle={{
                      background: 'var(--color-surface-container-lowest)',
                      border: 'none',
                      borderRadius: 12,
                      boxShadow: isDark
                        ? '0 8px 40px rgba(0,0,0,0.4)'
                        : '0 8px 40px rgba(44,26,23,0.08)',
                      fontSize: 12,
                      color: 'var(--app-on-surface)',
                    }}
                    formatter={(v, name) => [
                      formatCurrency(Number(v)),
                      name === 'debit' ? 'Debit' : 'Credit',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="debit"
                    stroke={isDark ? '#D4A07A' : '#C08552'}
                    strokeWidth={2.5}
                    dot={{ fill: isDark ? '#D4A07A' : '#C08552', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="credit"
                    stroke={isDark ? '#4DB896' : '#3DA882'}
                    strokeWidth={2.5}
                    dot={{ fill: isDark ? '#4DB896' : '#3DA882', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </section>

        {/* Tag Analytics */}
        {hasTags && (
          <section className="bg-surface-container-low rounded-xl p-6 lg:col-span-12">
            <div className="mb-6">
              <h2 className="text-on-surface text-lg font-bold">Tag Analytics</h2>
              <p className="text-on-surface-variant text-sm">
                Debit spend broken down by tag and category combination.
              </p>
            </div>
            {allTxnQuery.isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : tagSpendData.length === 0 ? (
              <EmptyState
                icon="label"
                title="No tagged transactions"
                description="Assign tags to transactions in the Review or Transactions page."
              />
            ) : (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Spend by tag chart */}
                <div>
                  <p className="text-on-surface-variant mb-4 text-[11px] font-bold tracking-widest uppercase">
                    Debit by Tag
                  </p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={tagSpendData}
                      barSize={24}
                      margin={{ top: 16, right: 8, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid
                        vertical={false}
                        stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                        strokeDasharray="4 4"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 11,
                          fill: isDark ? '#C4A080' : '#9C7060',
                          fontWeight: 600,
                        }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: isDark ? '#C4A080' : '#9C7060' }}
                        tickFormatter={formatCompact}
                        width={52}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(192,133,82,0.08)' }}
                        contentStyle={{
                          background: 'var(--color-surface-container-lowest)',
                          border: 'none',
                          borderRadius: 12,
                          boxShadow: isDark
                            ? '0 8px 40px rgba(0,0,0,0.4)'
                            : '0 8px 40px rgba(44,26,23,0.08)',
                          fontSize: 12,
                          color: 'var(--app-on-surface)',
                        }}
                        formatter={(v, name) => [
                          formatCurrency(Number(v)),
                          name === 'debit' ? 'Debit' : 'Credit',
                        ]}
                      />
                      <Bar
                        dataKey="debit"
                        fill={isDark ? '#D4A07A' : '#C08552'}
                        radius={[4, 4, 0, 0]}
                        activeBar={{ fill: isDark ? '#FFE0C2' : '#8C5A3C' }}
                      >
                        <LabelList
                          dataKey="debit"
                          position="top"
                          formatter={(v: number) => (v > 0 ? formatCompact(v) : '')}
                          style={{
                            fontSize: 9,
                            fill: isDark ? '#C4A080' : '#9C7060',
                            fontWeight: 600,
                          }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Category × Tag matrix */}
                {categoryTagMatrix.rows.length > 0 && (
                  <div>
                    <p className="text-on-surface-variant mb-4 text-[11px] font-bold tracking-widest uppercase">
                      Category × Tag (Debit)
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-outline-variant/15 text-on-surface-variant border-b">
                            <th className="pb-3 text-[11px] font-bold tracking-widest uppercase">
                              Category
                            </th>
                            {categoryTagMatrix.tags.map((t) => (
                              <th
                                key={t.id}
                                className="pb-3 text-right text-[11px] font-bold tracking-widest uppercase"
                              >
                                {t.name}
                              </th>
                            ))}
                            <th className="pb-3 text-right text-[11px] font-bold tracking-widest uppercase">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-outline-variant/5 divide-y">
                          {categoryTagMatrix.rows.map((row) => (
                            <tr
                              key={row.category}
                              className="hover:bg-surface-container-lowest transition-colors"
                            >
                              <td className="text-on-surface py-3 text-sm font-medium">
                                {row.category}
                              </td>
                              {row.totals.map((amt, i) => (
                                <td
                                  key={i}
                                  className="text-on-surface-variant py-3 text-right text-sm"
                                >
                                  {amt > 0 ? formatCompact(amt) : '—'}
                                </td>
                              ))}
                              <td className="text-on-surface py-3 text-right text-sm font-bold">
                                {formatCompact(row.rowTotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

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
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="bg-surface-container-high text-on-surface rounded-lg border-none p-2 text-xs font-bold tracking-widest uppercase focus:ring-0"
                aria-label="Select category"
              >
                <option value="">— Pick a category —</option>
                {(categoriesQuery.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {(tagsQuery.data ?? []).length > 0 && (
                <select
                  value={selectedTagId}
                  onChange={(e) => setSelectedTagId(e.target.value)}
                  className="bg-surface-container-high text-on-surface rounded-lg border-none p-2 text-xs font-bold tracking-widest uppercase focus:ring-0"
                  aria-label="Filter by tag"
                >
                  <option value="">All tags</option>
                  {(tagsQuery.data ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
              <div className="bg-surface-container-high flex items-center rounded-lg p-1">
                {(['bar', 'line', 'pie'] as const).map((t) => (
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
          {!selectedCategoryId ? (
            <EmptyState
              icon="stacked_line_chart"
              title="Select a category"
              description="Choose a category above to see its monthly spending trend."
            />
          ) : categoryTxnQuery.isLoading && !trendData.length ? (
            <Skeleton className="h-64 w-full" />
          ) : !trendData.length ? (
            <EmptyState
              icon="stacked_line_chart"
              title="No data"
              description="No transactions found for this category."
            />
          ) : (
            <>
              {/* Legend — hidden for pie */}
              {trendChartType !== 'pie' && (
                <div className="mb-4 flex items-center gap-4">
                  <span
                    className="flex items-center gap-1.5 text-xs font-medium"
                    style={{ color: isDark ? '#C4A080' : '#9C7060' }}
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-sm"
                      style={{ background: isDark ? '#D4A07A' : '#C08552' }}
                    />
                    Debit
                  </span>
                  <span
                    className="flex items-center gap-1.5 text-xs font-medium"
                    style={{ color: isDark ? '#6BCFAA' : '#2E8B6A' }}
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-sm"
                      style={{ background: isDark ? '#4DB896' : '#3DA882' }}
                    />
                    Credit
                  </span>
                </div>
              )}
              {trendChartType === 'pie' ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Debit pie */}
                  <div>
                    <p className="text-on-surface-variant mb-2 text-center text-xs font-bold tracking-widest uppercase">
                      Debit Transactions
                    </p>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={trendData.filter((d) => d.debit > 0)}
                          dataKey="debit"
                          nameKey="desc"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          label={({ percent }) =>
                            percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
                          }
                          labelLine={false}
                        >
                          {trendData
                            .filter((d) => d.debit > 0)
                            .map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: 'var(--color-surface-container-lowest)',
                            border: 'none',
                            borderRadius: 12,
                            boxShadow: isDark
                              ? '0 8px 40px rgba(0,0,0,0.4)'
                              : '0 8px 40px rgba(44,26,23,0.08)',
                            fontSize: 12,
                            color: 'var(--app-on-surface)',
                          }}
                          formatter={(v, _, props) => [
                            formatCurrency(Number(v)),
                            props.payload.fullName,
                          ]}
                        />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          formatter={(v) => (
                            <span style={{ fontSize: 11, color: isDark ? '#C4A080' : '#9C7060' }}>
                              {v}
                            </span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Credit pie */}
                  <div>
                    <p className="text-on-surface-variant mb-2 text-center text-xs font-bold tracking-widest uppercase">
                      Credit Transactions
                    </p>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={trendData.filter((d) => d.credit > 0)}
                          dataKey="credit"
                          nameKey="desc"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          label={({ percent }) =>
                            percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
                          }
                          labelLine={false}
                        >
                          {trendData
                            .filter((d) => d.credit > 0)
                            .map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[(i + 4) % PIE_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: 'var(--color-surface-container-lowest)',
                            border: 'none',
                            borderRadius: 12,
                            boxShadow: isDark
                              ? '0 8px 40px rgba(0,0,0,0.4)'
                              : '0 8px 40px rgba(44,26,23,0.08)',
                            fontSize: 12,
                            color: 'var(--app-on-surface)',
                          }}
                          formatter={(v, _, props) => [
                            formatCurrency(Number(v)),
                            props.payload.fullName,
                          ]}
                        />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          formatter={(v) => (
                            <span style={{ fontSize: 11, color: isDark ? '#C4A080' : '#9C7060' }}>
                              {v}
                            </span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={340}>
                  {trendChartType === 'bar' ? (
                    <BarChart
                      data={trendData}
                      barSize={20}
                      barGap={4}
                      margin={{ top: 20, right: 8, left: 8, bottom: 60 }}
                    >
                      <CartesianGrid
                        vertical={false}
                        stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                        strokeDasharray="4 4"
                      />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        tick={({ x, y, payload }) => {
                          const fill = isDark ? '#C4A080' : '#9C7060'
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
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: isDark ? '#C4A080' : '#9C7060' }}
                        tickFormatter={formatCompact}
                        width={52}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(192,133,82,0.08)' }}
                        contentStyle={{
                          background: 'var(--color-surface-container-lowest)',
                          border: 'none',
                          borderRadius: 12,
                          boxShadow: isDark
                            ? '0 8px 40px rgba(0,0,0,0.4)'
                            : '0 8px 40px rgba(44,26,23,0.08)',
                          fontSize: 12,
                          color: 'var(--app-on-surface)',
                        }}
                        formatter={(v, name, props) => [
                          formatCurrency(Number(v)),
                          `${props.payload.fullName} (${name === 'debit' ? 'Debit' : 'Credit'})`,
                        ]}
                      />
                      <Bar
                        dataKey="debit"
                        fill={isDark ? '#D4A07A' : '#C08552'}
                        radius={[4, 4, 0, 0]}
                        activeBar={{ fill: isDark ? '#FFE0C2' : '#8C5A3C' }}
                      >
                        <LabelList
                          dataKey="debit"
                          position="top"
                          formatter={(v: number) => (v > 0 ? formatCompact(v) : '')}
                          style={{
                            fontSize: 9,
                            fill: isDark ? '#C4A080' : '#9C7060',
                            fontWeight: 600,
                          }}
                        />
                      </Bar>
                      <Bar
                        dataKey="credit"
                        fill={isDark ? '#4DB896' : '#3DA882'}
                        radius={[4, 4, 0, 0]}
                        activeBar={{ fill: isDark ? '#A0EDD4' : '#2A7A5E' }}
                      >
                        <LabelList
                          dataKey="credit"
                          position="top"
                          formatter={(v: number) => (v > 0 ? formatCompact(v) : '')}
                          style={{
                            fontSize: 9,
                            fill: isDark ? '#6BCFAA' : '#2E8B6A',
                            fontWeight: 600,
                          }}
                        />
                      </Bar>
                    </BarChart>
                  ) : (
                    <LineChart data={trendData} margin={{ top: 20, right: 8, left: 8, bottom: 60 }}>
                      <CartesianGrid
                        vertical={false}
                        stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                        strokeDasharray="4 4"
                      />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        tick={({ x, y, payload }) => {
                          const fill = isDark ? '#C4A080' : '#9C7060'
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
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: isDark ? '#C4A080' : '#9C7060' }}
                        tickFormatter={formatCompact}
                        width={52}
                      />
                      <Tooltip
                        cursor={{ stroke: 'rgba(192,133,82,0.2)', strokeWidth: 1 }}
                        contentStyle={{
                          background: 'var(--color-surface-container-lowest)',
                          border: 'none',
                          borderRadius: 12,
                          boxShadow: isDark
                            ? '0 8px 40px rgba(0,0,0,0.4)'
                            : '0 8px 40px rgba(44,26,23,0.08)',
                          fontSize: 12,
                          color: 'var(--app-on-surface)',
                        }}
                        formatter={(v, name, props) => [
                          formatCurrency(Number(v)),
                          `${props.payload.fullName} (${name === 'debit' ? 'Debit' : 'Credit'})`,
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="debit"
                        stroke={isDark ? '#D4A07A' : '#C08552'}
                        strokeWidth={2.5}
                        dot={{ fill: isDark ? '#D4A07A' : '#C08552', r: 4 }}
                        activeDot={{ r: 6, fill: isDark ? '#FFE0C2' : '#8C5A3C' }}
                      >
                        <LabelList
                          dataKey="debit"
                          position="top"
                          formatter={(v: number) => (v > 0 ? formatCompact(v) : '')}
                          style={{
                            fontSize: 9,
                            fill: isDark ? '#C4A080' : '#9C7060',
                            fontWeight: 600,
                          }}
                        />
                      </Line>
                      <Line
                        type="monotone"
                        dataKey="credit"
                        stroke={isDark ? '#4DB896' : '#3DA882'}
                        strokeWidth={2.5}
                        dot={{ fill: isDark ? '#4DB896' : '#3DA882', r: 4 }}
                        activeDot={{ r: 6, fill: isDark ? '#A0EDD4' : '#2A7A5E' }}
                      >
                        <LabelList
                          dataKey="credit"
                          position="top"
                          formatter={(v: number) => (v > 0 ? formatCompact(v) : '')}
                          style={{
                            fontSize: 9,
                            fill: isDark ? '#6BCFAA' : '#2E8B6A',
                            fontWeight: 600,
                          }}
                        />
                      </Line>
                    </LineChart>
                  )}
                </ResponsiveContainer>
              )}
            </>
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
