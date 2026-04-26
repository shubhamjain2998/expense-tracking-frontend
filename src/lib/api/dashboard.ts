import type { SplitLedgerRow, SummaryRow, TrendDataPoint, YTDRow } from '../../types/dashboard'
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
