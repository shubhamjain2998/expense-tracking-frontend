import { useParams } from 'react-router-dom'

/**
 * Category (/c/:categoryId) — one category's trend, stats and transactions.
 * A drill-down reached from Home, not a nav destination — see
 * design-system/kosh-ledger/MASTER.md §7.
 *
 * Phase 2 placeholder only; Phase 4 fills this in with the real panels from
 * design-mock/ledger/category.html.
 */
export function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>()

  return (
    <div className="sec">
      <div className="sec-head">
        <h1 className="sec-title">Category</h1>
        <span className="sub">
          Trend, stats and transactions for this category ({categoryId}). Coming in a later phase.
        </span>
      </div>
    </div>
  )
}
