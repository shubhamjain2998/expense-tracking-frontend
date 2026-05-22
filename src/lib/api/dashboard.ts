import type {
  MultiMonthSummaryItem,
  SplitLedgerRow,
  SummaryRow,
  TrendDataPoint,
  YTDRow,
} from '../../types/dashboard'
import type { PeriodMode } from '../period'

import { client } from './client'

export async function getDashboardSummary(
  year: number,
  month: number,
  tagId?: string,
  periodMode?: PeriodMode
): Promise<SummaryRow[]> {
  const { data } = await client.get<SummaryRow[]>('/dashboard/summary', {
    params: {
      year,
      month,
      ...(tagId ? { tag_id: tagId } : {}),
      ...(periodMode ? { period_mode: periodMode } : {}),
    },
  })
  return data
}

export async function getMonthlyTrend(
  year: number,
  categoryId?: string,
  tagId?: string,
  periodMode?: PeriodMode
): Promise<TrendDataPoint[]> {
  const { data } = await client.get<TrendDataPoint[]>('/dashboard/monthly-trend', {
    params: {
      year,
      ...(categoryId ? { category_id: categoryId } : {}),
      ...(tagId ? { tag_id: tagId } : {}),
      ...(periodMode ? { period_mode: periodMode } : {}),
    },
  })
  return data
}

export async function getSplitLedger(
  year: number,
  month: number,
  includeSettled = false,
  periodMode?: PeriodMode
): Promise<SplitLedgerRow[]> {
  const { data } = await client.get<SplitLedgerRow[]>('/dashboard/split-ledger', {
    params: {
      year,
      month,
      include_settled: includeSettled,
      ...(periodMode ? { period_mode: periodMode } : {}),
    },
  })
  return data
}

export async function getYTD(year: number, periodMode?: PeriodMode): Promise<YTDRow[]> {
  const { data } = await client.get<YTDRow[]>('/dashboard/ytd', {
    params: { year, ...(periodMode ? { period_mode: periodMode } : {}) },
  })
  return data
}

/**
 * Batch endpoint: returns per-category expense breakdown + income/expense
 * totals for `months` calendar months ending at (endYear, endMonth).
 * Replaces the 6×summary + 6×transactions/processed per-month loop.
 */
export async function getMultiMonthSummary(
  endYear: number,
  endMonth: number,
  months = 6,
  tagId?: string
): Promise<MultiMonthSummaryItem[]> {
  const { data } = await client.get<MultiMonthSummaryItem[]>('/dashboard/multi-month-summary', {
    params: {
      end_year: endYear,
      end_month: endMonth,
      months,
      ...(tagId ? { tag_id: tagId } : {}),
    },
  })
  return data
}
