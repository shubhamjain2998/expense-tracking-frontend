import type { InsightsPayload } from '@/features/insights/lib/insightsResponseSchema'

import { client } from './client'

export interface InsightsRunOut {
  id: string
  schema_version: number
  payload: InsightsPayload
  period_start: string
  period_end: string
  ran_at: string
}

export interface CreateInsightsRunRequest {
  period_start: string
  period_end: string
  payload: InsightsPayload
}

/** Returns null when no run exists yet — that's the expected "no run" state,
 *  not an error, so callers don't have to catch a 404 themselves. */
export async function getLatestInsightsRun(): Promise<InsightsRunOut | null> {
  try {
    const { data } = await client.get<InsightsRunOut>('/insights/runs/latest')
    return data
  } catch (err) {
    const e = err as { status?: number }
    if (e.status === 404) return null
    throw err
  }
}

export async function createInsightsRun(body: CreateInsightsRunRequest): Promise<InsightsRunOut> {
  const { data } = await client.post<InsightsRunOut>('/insights/runs', body)
  return data
}

export async function deleteInsightsRun(): Promise<void> {
  try {
    await client.delete('/insights/runs/latest')
  } catch (err) {
    const e = err as { status?: number }
    if (e.status === 404) return
    throw err
  }
}
