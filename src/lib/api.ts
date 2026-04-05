/**
 * API client for the Personal Finance backend (FastAPI).
 * Base URL configured via VITE_API_URL env variable.
 * All amounts are treated as JS numbers (backend returns decimals).
 * All IDs are UUIDs (string).
 * Errors are thrown as ApiError after interceptor processing.
 */
import axios from 'axios'

import type { BudgetEntry, CreateBudgetPayload, UpdateBudgetEntryPayload } from '../types/budget'
import type {
  AutoCategoriseResponse,
  EditProcessedPayload,
  ImportResponse,
  PendingManualTransaction,
  PreviewResponse,
  ProcessedTransaction,
  ProcessedTransactionItem,
  ProcessTransactionPayload,
  RawTransaction,
} from '../types/transaction'
import type { SplitLedgerRow, SummaryRow, TrendDataPoint, YTDRow } from '../types/dashboard'
import type { CategoryMapping, Person } from '../types/settings'

export interface ApiError {
  message: string
  detail: string
  status?: number
}

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const detail =
      err.response?.data?.detail ??
      (typeof err.response?.data === 'string' ? err.response.data : null) ??
      err.message ??
      'An unexpected error occurred'
    const apiError: ApiError = {
      message: String(detail),
      detail: String(detail),
      status: err.response?.status,
    }
    return Promise.reject(apiError)
  }
)

// ─── Budget ──────────────────────────────────────────────────────────

/**
 * Fetch all budget entries for a given year.
 * @param year - Full 4-digit year, e.g. 2025
 */
export const getBudget = async (year: number): Promise<BudgetEntry[]> => {
  const { data } = await client.get<BudgetEntry[]>(`/budget/${year}`)
  return data
}

export const createBudget = async (payload: CreateBudgetPayload): Promise<BudgetEntry[]> => {
  const { data } = await client.post<BudgetEntry[]>('/budget', payload)
  return data
}

export const updateBudgetEntry = async (
  id: string,
  payload: UpdateBudgetEntryPayload
): Promise<BudgetEntry> => {
  const { data } = await client.put<BudgetEntry>(`/budget/${id}`, payload)
  return data
}

export const deleteBudgetEntry = async (id: string): Promise<void> => {
  await client.delete(`/budget/${id}`)
}

// ─── Uploads ─────────────────────────────────────────────────────────

export const previewStatement = async (file: File): Promise<PreviewResponse> => {
  const form = new FormData()
  form.append('file', file)
  const { data } = await client.post<PreviewResponse>('/uploads/preview', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const importStatement = async (file: File): Promise<ImportResponse> => {
  const form = new FormData()
  form.append('file', file)
  const { data } = await client.post<ImportResponse>('/uploads/statement', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

// ─── Transactions ────────────────────────────────────────────────────

/**
 * List pending raw transactions for a given month/year.
 */
export const getRawTransactions = async (
  year: number,
  month: number
): Promise<RawTransaction[]> => {
  const { data } = await client.get<RawTransaction[]>('/transactions/raw', {
    params: { year, month },
  })
  return data
}

export const deleteRawTransaction = async (id: string): Promise<void> => {
  await client.delete(`/transactions/raw/${id}`)
}

export const restoreRawTransaction = async (id: string): Promise<void> => {
  await client.patch(`/transactions/raw/${id}/restore`)
}

export const autoCategorise = async (): Promise<AutoCategoriseResponse> => {
  const { data } = await client.post<AutoCategoriseResponse>('/transactions/auto-categorise')
  return data
}

export const getPendingManual = async (): Promise<PendingManualTransaction[]> => {
  const { data } = await client.get<PendingManualTransaction[]>('/transactions/pending-manual')
  return data
}

export const processTransaction = async (
  payload: ProcessTransactionPayload
): Promise<ProcessedTransaction> => {
  console.log(payload)
  const { data } = await client.post<ProcessedTransaction>('/transactions/process', payload)
  return data
}

export const getProcessedTransactions = async (
  year: number,
  month: number,
  category: string
): Promise<ProcessedTransactionItem[]> => {
  const { data } = await client.get<ProcessedTransactionItem[]>('/transactions/processed', {
    params: { year, month, category },
  })
  return data
}

export const editProcessedTransaction = async (
  id: string,
  payload: EditProcessedPayload
): Promise<ProcessedTransaction> => {
  const { data } = await client.patch<ProcessedTransaction>(
    `/transactions/processed/${id}`,
    payload
  )
  return data
}

// ─── Categories & Persons ────────────────────────────────────────────

/** Returns a sorted list of valid category names for dropdowns. */
export const getCategoryList = async (): Promise<string[]> => {
  const { data } = await client.get<string[]>('/categories/list')
  return data
}

export const getCategories = async (): Promise<CategoryMapping[]> => {
  const { data } = await client.get<CategoryMapping[]>('/categories')
  return data
}

export const deleteCategory = async (id: string): Promise<void> => {
  await client.delete(`/categories/${id}`)
}

export const getPersons = async (): Promise<Person[]> => {
  const { data } = await client.get<Person[]>('/persons')
  return data
}

export const createPerson = async (name: string): Promise<Person> => {
  const { data } = await client.post<Person>('/persons', { name })
  return data
}

export const deletePerson = async (id: string): Promise<void> => {
  await client.delete(`/persons/${id}`)
}

// ─── Dashboard ───────────────────────────────────────────────────────

export const getDashboardSummary = async (year: number, month: number): Promise<SummaryRow[]> => {
  const { data } = await client.get<SummaryRow[]>('/dashboard/summary', {
    params: { year, month },
  })
  return data
}

export const getMonthlyTrend = async (
  year: number,
  category?: string
): Promise<TrendDataPoint[]> => {
  const { data } = await client.get<TrendDataPoint[]>('/dashboard/monthly-trend', {
    params: { year, ...(category ? { category } : {}) },
  })
  return data
}

export const getSplitLedger = async (year: number, month: number): Promise<SplitLedgerRow[]> => {
  const { data } = await client.get<SplitLedgerRow[]>('/dashboard/split-ledger', {
    params: { year, month },
  })
  return data
}

export const getYTD = async (year: number): Promise<YTDRow[]> => {
  const { data } = await client.get<YTDRow[]>('/dashboard/ytd', { params: { year } })
  return data
}
