import { http, HttpResponse } from 'msw'

import { makeBudgetEntry, makeCategory, makeImportResponse, makePreviewResponse } from './factories'

const BASE = 'http://localhost:8000'

export const handlers = [
  // Auth
  http.post(`${BASE}/auth/login`, () =>
    HttpResponse.json({ access_token: 'test-token', token_type: 'bearer' })
  ),
  http.post(`${BASE}/auth/register`, () =>
    HttpResponse.json({ access_token: 'test-token', token_type: 'bearer' })
  ),

  // Reference data
  http.get(`${BASE}/categories`, () =>
    HttpResponse.json([
      makeCategory({ id: 'cat-1', name: 'Groceries' }),
      makeCategory({ id: 'cat-2', name: 'Transport' }),
    ])
  ),
  http.get(`${BASE}/tags`, () => HttpResponse.json([])),
  http.get(`${BASE}/persons`, () => HttpResponse.json([])),
  http.get(`${BASE}/category-mappings`, () => HttpResponse.json([])),

  // Transactions
  http.get(`${BASE}/transactions/raw`, () => HttpResponse.json([])),
  http.get(`${BASE}/transactions/processed`, () => HttpResponse.json([])),
  http.get(`${BASE}/transactions/pending-manual`, () => HttpResponse.json([])),
  http.post(`${BASE}/transactions/process`, () =>
    HttpResponse.json({
      id: 'proc-1',
      raw_txn_id: 'raw-1',
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
    })
  ),

  // Uploads
  http.post(`${BASE}/uploads/preview`, () => HttpResponse.json(makePreviewResponse())),
  http.post(`${BASE}/uploads/statement`, () => HttpResponse.json(makeImportResponse())),
  http.post(`${BASE}/uploads/json-import`, () => HttpResponse.json(makeImportResponse())),

  // Dashboard
  http.get(`${BASE}/dashboard/summary`, () => HttpResponse.json([])),
  http.get(`${BASE}/dashboard/ytd`, () => HttpResponse.json([])),
  http.get(`${BASE}/dashboard/split-ledger`, () => HttpResponse.json([])),
  http.get(`${BASE}/dashboard/monthly-trend`, () => HttpResponse.json([])),

  // Budget
  http.get(`${BASE}/budget/:year/monthly-overrides`, () => HttpResponse.json([])),
  http.get(`${BASE}/budget/:year`, () =>
    HttpResponse.json([
      makeBudgetEntry({ id: 'budget-entry-1', category_id: 'cat-1', category: 'Groceries' }),
    ])
  ),
  http.post(`${BASE}/budget`, () => HttpResponse.json([makeBudgetEntry()])),
  http.put(`${BASE}/budget/:id`, () =>
    HttpResponse.json(makeBudgetEntry({ allocated_amount: '1800.00' }))
  ),
  http.delete(`${BASE}/budget/:id`, () => new HttpResponse(null, { status: 204 })),
  http.put(`${BASE}/budget/:year/:month/categories/:categoryId`, () =>
    HttpResponse.json({
      year: 2026,
      month: 5,
      category_id: 'cat-1',
      category: 'Groceries',
      allocated_amount: 150,
    })
  ),
  http.delete(
    `${BASE}/budget/:year/:month/categories/:categoryId`,
    () => new HttpResponse(null, { status: 204 })
  ),
]
