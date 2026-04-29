import { exportBackup } from '@/lib/api/backup'
import { getAllProcessedTransactions } from '@/lib/api/transactions'

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadTransactionsCSV(): Promise<void> {
  const txns = await getAllProcessedTransactions()
  const rows = [
    ['Date', 'Description', 'Amount', 'Category', 'Notes', 'Tags'],
    ...txns.map((t) => [
      t.txn_date,
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount,
      t.category,
      t.notes ? `"${t.notes.replace(/"/g, '""')}"` : '',
      t.tags.map((tag) => tag.name).join('; '),
    ]),
  ]
  const csv = rows.map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  triggerDownload(blob, `transactions-${new Date().toISOString().slice(0, 10)}.csv`)
}

export async function downloadBackupJSON(): Promise<void> {
  const backup = await exportBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  triggerDownload(blob, `backup-${new Date().toISOString().slice(0, 10)}.json`)
}
