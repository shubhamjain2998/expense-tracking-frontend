import axios from 'axios'

import type { BudgetEntry, CreateBudgetPayload, UpdateBudgetEntryPayload } from '../types/budget'
import type {
  AutoCategoriseResponse,
  CreateRawTransactionPayload,
  EditProcessedPayload,
  ImportResponse,
  PendingManualTransaction,
  PersonShareOut,
  PreviewResponse,
  ProcessedTransaction,
  ProcessedTransactionItem,
  ProcessTransactionPayload,
  RawTransaction,
} from '../types/transaction'
import type { SplitLedgerRow, SummaryRow, TrendDataPoint, YTDRow } from '../types/dashboard'
import type { Category, CategoryMapping, Person, Tag } from '../types/settings'

export interface ApiError {
  message: string
  detail: string
  status?: number
}

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

// ─── Auth interceptors ────────────────────────────────────────────────

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
      return Promise.reject(err)
    }
    if (!err.response) {
      window.dispatchEvent(new CustomEvent('backend:offline'))
    }
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

// ─── Auth ─────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string
  token_type: string
}

export const register = async (email: string, password: string): Promise<TokenResponse> => {
  const { data } = await client.post<TokenResponse>('/auth/register', { email, password })
  return data
}

export const login = async (email: string, password: string): Promise<TokenResponse> => {
  const { data } = await client.post<TokenResponse>('/auth/login', { email, password })
  return data
}

// ─── Budget ──────────────────────────────────────────────────────────

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

export const previewStatementText = async (text: string): Promise<PreviewResponse> => {
  const { data } = await client.post<PreviewResponse>('/uploads/preview-text', { text })
  return data
}

export const importStatementText = async (text: string): Promise<ImportResponse> => {
  const { data } = await client.post<ImportResponse>('/uploads/text-import', { text })
  return data
}

// ─── Transactions ────────────────────────────────────────────────────

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

export const createRawTransaction = async (
  payload: CreateRawTransactionPayload
): Promise<RawTransaction> => {
  const { data } = await client.post<RawTransaction>('/transactions/raw', payload)
  return data
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
  const { data } = await client.post<ProcessedTransaction>('/transactions/process', payload)
  return data
}

export const getProcessedTransactions = async (
  year: number,
  month: number,
  categoryId?: string,
  tagId?: string
): Promise<ProcessedTransactionItem[]> => {
  const { data } = await client.get<ProcessedTransactionItem[]>('/transactions/processed', {
    params: {
      year,
      month,
      ...(categoryId ? { category_id: categoryId } : {}),
      ...(tagId ? { tag_id: tagId } : {}),
    },
  })
  return data
}

export const bulkTagTransactions = async (
  transaction_ids: string[],
  tag_ids: string[]
): Promise<void> => {
  await client.post('/transactions/processed/bulk-tag', { transaction_ids, tag_ids })
}

export const deleteProcessedTransaction = async (id: string): Promise<void> => {
  await client.delete(`/transactions/processed/${id}`)
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

export const patchShareSettled = async (
  txnId: string,
  personId: string,
  settled: boolean
): Promise<ProcessedTransaction> => {
  const { data } = await client.patch<ProcessedTransaction>(
    `/transactions/processed/${txnId}/shares/${personId}`,
    { settled }
  )
  return data
}

// ─── Categories ───────────────────────────────────────────────────────

export const getCategories = async (): Promise<Category[]> => {
  const { data } = await client.get<Category[]>('/categories')
  return data
}

export const createCategory = async (name: string): Promise<Category> => {
  const { data } = await client.post<Category>('/categories', { name })
  return data
}

export const renameCategory = async (id: string, name: string): Promise<Category> => {
  const { data } = await client.patch<Category>(`/categories/${id}`, { name })
  return data
}

export const deleteCategory = async (id: string): Promise<void> => {
  await client.delete(`/categories/${id}`)
}

// ─── Category Mappings ────────────────────────────────────────────────

export const getCategoryMappings = async (): Promise<CategoryMapping[]> => {
  const { data } = await client.get<CategoryMapping[]>('/category-mappings')
  return data
}

export const deleteCategoryMapping = async (id: string): Promise<void> => {
  await client.delete(`/category-mappings/${id}`)
}

// ─── Tags ─────────────────────────────────────────────────────────────

export const getTags = async (): Promise<Tag[]> => {
  const { data } = await client.get<Tag[]>('/tags')
  return data
}

export const createTag = async (name: string): Promise<Tag> => {
  const { data } = await client.post<Tag>('/tags', { name })
  return data
}

export const deleteTag = async (id: string): Promise<void> => {
  await client.delete(`/tags/${id}`)
}

// ─── Persons ──────────────────────────────────────────────────────────

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

// ─── Admin ───────────────────────────────────────────────────────────

export const deleteAllRawTransactions = async (): Promise<void> => {
  await client.delete('/admin/transactions/raw')
}

export const deleteAllProcessedTransactions = async (): Promise<void> => {
  await client.delete('/admin/transactions/processed')
}

export const clearAllMappings = async (): Promise<void> => {
  await client.delete('/admin/categories')
}

export const deleteAllBudget = async (): Promise<void> => {
  await client.delete('/admin/budget')
}

export const deleteAllPersons = async (): Promise<void> => {
  await client.delete('/admin/persons')
}

export const deleteAllData = async (): Promise<void> => {
  await client.delete('/admin/all')
}

// ─── Dashboard ───────────────────────────────────────────────────────

export const getDashboardSummary = async (
  year: number,
  month: number,
  tagId?: string
): Promise<SummaryRow[]> => {
  const { data } = await client.get<SummaryRow[]>('/dashboard/summary', {
    params: { year, month, ...(tagId ? { tag_id: tagId } : {}) },
  })
  return data
}

export const getMonthlyTrend = async (
  year: number,
  categoryId?: string,
  tagId?: string
): Promise<TrendDataPoint[]> => {
  const { data } = await client.get<TrendDataPoint[]>('/dashboard/monthly-trend', {
    params: {
      year,
      ...(categoryId ? { category_id: categoryId } : {}),
      ...(tagId ? { tag_id: tagId } : {}),
    },
  })
  return data
}

export const getSplitLedger = async (
  year: number,
  month: number,
  includeSettled = false
): Promise<SplitLedgerRow[]> => {
  const { data } = await client.get<SplitLedgerRow[]>('/dashboard/split-ledger', {
    params: { year, month, include_settled: includeSettled },
  })
  return data
}

export const getYTD = async (year: number): Promise<YTDRow[]> => {
  const { data } = await client.get<YTDRow[]>('/dashboard/ytd', { params: { year } })
  return data
}

// Re-export PersonShareOut so pages can import it from api if needed
export type { PersonShareOut }
