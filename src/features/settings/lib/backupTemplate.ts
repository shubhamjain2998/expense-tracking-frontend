function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadBackupTemplate(): void {
  const template = {
    version: '1',
    exported_at: new Date().toISOString(),
    // categories/tags/persons are auto-created from any names referenced in
    // transactions — listing them here is only needed to pre-create empty ones.
    categories: [{ name: 'groceries' }, { name: 'transport' }, { name: 'salary' }],
    tags: [{ name: 'essential' }],
    persons: [{ name: 'alice' }],
    // allocated_amount is the *annual* total for the year. The dashboard divides
    // by 12 to get the monthly spending threshold.
    budget_plans: [
      { year: 2025, category: 'groceries', allocated_amount: '96000.00' },
      { year: 2025, category: 'transport', allocated_amount: '24000.00' },
    ],
    // Optional — omit to let the server auto-derive from (description, category).
    // category_mappings: [{ description_pattern: "swiggy", category: "food" }],
    transactions: [
      // Expense → positive amount.
      {
        txn_date: '2025-04-15',
        description: 'Swiggy Bangalore',
        amount: '412.00',
        category: 'food',
        notes: null,
        tags: ['essential'],
        shares: [],
      },
      // Income → negative amount. Note "salary" is also a category.
      {
        txn_date: '2025-04-30',
        description: 'Monthly salary credit',
        amount: '-100000.00',
        category: 'salary',
        notes: null,
        tags: [],
        shares: [],
      },
      // Expense with a person split — Alice owes 50%.
      {
        txn_date: '2025-05-04',
        description: 'BMTC bus pass',
        amount: '1100.00',
        category: 'transport',
        notes: 'monthly pass',
        tags: [],
        shares: [{ person: 'alice', share_type: 'percentage', share_value: '50', settled: false }],
      },
    ],
  }
  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
  triggerDownload(blob, 'backup-template.json')
}
