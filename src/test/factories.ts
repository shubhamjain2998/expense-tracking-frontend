import type { BudgetEntry } from '@/types/budget'
import type { Category, Person, Tag } from '@/types/settings'
import type {
  ImportResponse,
  PreviewResponse,
  ProcessedTransactionItem,
  RawTransaction,
} from '@/types/transaction'

let _id = 0
const nextId = () => `test-${++_id}`

export function makeCategory(overrides: Partial<Category> = {}): Category {
  return { id: nextId(), name: 'Test Category', is_income: false, ...overrides }
}

export function makeTag(overrides: Partial<Tag> = {}): Tag {
  return { id: nextId(), name: 'Test Tag', ...overrides }
}

export function makePerson(overrides: Partial<Person> = {}): Person {
  return { id: nextId(), name: 'Test Person', ...overrides }
}

export function makeRawTransaction(overrides: Partial<RawTransaction> = {}): RawTransaction {
  return {
    id: nextId(),
    txn_date: '2026-05-01',
    description: 'Supermarket',
    amount: '-100.00',
    status: 'pending',
    ...overrides,
  }
}

export function makeProcessedTransaction(
  overrides: Partial<ProcessedTransactionItem> = {}
): ProcessedTransactionItem {
  return {
    id: nextId(),
    raw_txn_id: nextId(),
    mapping_id: null,
    category_id: 'cat-1',
    category: 'Groceries',
    txn_date: '2026-05-01',
    description: 'Supermarket',
    amount: '-100.00',
    effective_amount: '-100.00',
    month: 5,
    year: 2026,
    notes: null,
    shares: [],
    tags: [],
    ...overrides,
  }
}

export function makeBudgetEntry(overrides: Partial<BudgetEntry> = {}): BudgetEntry {
  return {
    id: nextId(),
    year: 2026,
    category_id: 'cat-1',
    category: 'Groceries',
    allocated_amount: '1200.00',
    ...overrides,
  }
}

export function makePreviewResponse(overrides: Partial<PreviewResponse> = {}): PreviewResponse {
  return {
    rows: [{ txn_date: '2026-05-01', description: 'Coffee Shop', amount: '-50.00' }],
    would_insert: 1,
    skipped: 0,
    skipped_rows: [],
    ...overrides,
  }
}

export function makeImportResponse(overrides: Partial<ImportResponse> = {}): ImportResponse {
  return {
    inserted: 1,
    skipped: 0,
    skipped_rows: [],
    rows: [
      {
        id: nextId(),
        txn_date: '2026-05-01',
        description: 'Coffee Shop',
        amount: '-50.00',
        status: 'pending',
      },
    ],
    warnings: [],
    ...overrides,
  }
}
