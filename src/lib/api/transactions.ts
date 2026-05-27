import type {
  AutoCategoriseResponse,
  CreateRawTransactionPayload,
  EditProcessedPayload,
  PendingManualTransaction,
  ProcessedTransaction,
  ProcessedTransactionItem,
  ProcessTransactionPayload,
  RawTransaction,
} from '../../types/transaction'
import type { PeriodMode } from '../period'

import { client } from './client'

export async function getRawTransactions(
  year: number,
  month: number,
  periodMode?: PeriodMode,
  includeDeleted?: boolean
): Promise<RawTransaction[]> {
  const { data } = await client.get<RawTransaction[]>('/transactions/raw', {
    params: {
      year,
      month,
      ...(periodMode ? { period_mode: periodMode } : {}),
      ...(includeDeleted ? { include_deleted: true } : {}),
    },
  })
  return data
}

export async function deleteRawTransaction(id: string): Promise<void> {
  await client.delete(`/transactions/raw/${id}`)
}

export async function createRawTransaction(
  payload: CreateRawTransactionPayload
): Promise<RawTransaction> {
  const { data } = await client.post<RawTransaction>('/transactions/raw', payload)
  return data
}

export async function restoreRawTransaction(id: string): Promise<void> {
  await client.patch(`/transactions/raw/${id}/restore`)
}

export async function autoCategorise(rawTxnIds?: string[]): Promise<AutoCategoriseResponse> {
  // Omit the body entirely when categorising everything — preserves the
  // existing endpoint behaviour for callers that don't pass an id list.
  const body = rawTxnIds ? { raw_txn_ids: rawTxnIds } : undefined
  const { data } = await client.post<AutoCategoriseResponse>('/transactions/auto-categorise', body)
  return data
}

export async function getPendingManual(): Promise<PendingManualTransaction[]> {
  const { data } = await client.get<PendingManualTransaction[]>('/transactions/pending-manual')
  return data
}

export async function processTransaction(
  payload: ProcessTransactionPayload
): Promise<ProcessedTransaction> {
  const { data } = await client.post<ProcessedTransaction>('/transactions/process', payload)
  return data
}

export async function getProcessedTransactions(
  year: number,
  month: number,
  categoryId?: string,
  tagId?: string,
  periodMode?: PeriodMode
): Promise<ProcessedTransactionItem[]> {
  const { data } = await client.get<ProcessedTransactionItem[]>('/transactions/processed', {
    params: {
      year,
      month,
      ...(categoryId ? { category_id: categoryId } : {}),
      ...(tagId ? { tag_id: tagId } : {}),
      ...(periodMode ? { period_mode: periodMode } : {}),
    },
  })
  return data
}

export async function getAllProcessedTransactions(): Promise<ProcessedTransactionItem[]> {
  const { data } = await client.get<ProcessedTransactionItem[]>('/transactions/processed')
  return data
}

export async function bulkTagTransactions(
  transactionIds: string[],
  tagIds: string[]
): Promise<void> {
  await client.post('/transactions/processed/bulk-tag', {
    transaction_ids: transactionIds,
    tag_ids: tagIds,
  })
}

export async function deleteProcessedTransaction(id: string): Promise<void> {
  await client.delete(`/transactions/processed/${id}`)
}

export async function editProcessedTransaction(
  id: string,
  payload: EditProcessedPayload
): Promise<ProcessedTransaction> {
  const { data } = await client.patch<ProcessedTransaction>(
    `/transactions/processed/${id}`,
    payload
  )
  return data
}

export async function patchShareSettled(
  txnId: string,
  personId: string,
  settled: boolean
): Promise<ProcessedTransaction> {
  const { data } = await client.patch<ProcessedTransaction>(
    `/transactions/processed/${txnId}/shares/${personId}`,
    { settled }
  )
  return data
}
