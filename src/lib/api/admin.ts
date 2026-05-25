import { client } from './client'

export async function deleteAllRawTransactions(): Promise<void> {
  await client.delete('/admin/transactions/raw')
}

export async function deleteAllProcessedTransactions(): Promise<void> {
  await client.delete('/admin/transactions/processed')
}

export async function clearAllMappings(): Promise<void> {
  await client.delete('/admin/categories')
}

export async function deleteAllBudget(): Promise<void> {
  await client.delete('/admin/budget')
}

export async function deleteAllPersons(): Promise<void> {
  await client.delete('/admin/persons')
}

export async function deleteAllData(): Promise<void> {
  await client.delete('/admin/all')
}

export async function deleteAccount(): Promise<void> {
  await client.delete('/admin/account')
}
