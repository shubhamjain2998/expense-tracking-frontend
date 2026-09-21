import { useNavigate } from 'react-router-dom'

import { EmptyState } from '@/components/ui/EmptyState'

/**
 * Settings → Import history. The API has no endpoint listing past imports
 * (only the most recent one, shown inline in Backup → "Last import"), so
 * this is an honest empty state rather than an invented table — importing
 * still points at the real Transactions import flow.
 */
export function ImportHistorySection() {
  const navigate = useNavigate()

  return (
    <section id="imports" className="sec">
      <div className="sec-head">
        <h2 className="sec-title">Import history</h2>
        <span className="sub">Every statement you have brought in</span>
      </div>
      <div className="card">
        <EmptyState
          icon="upload_file"
          title="No import history yet"
          description="Kosh doesn't keep a log of past imports beyond the most recent one (see Backup below). Bring in a statement from Transactions to get started."
          action={{ label: 'Import', onClick: () => navigate('/transactions?import=pdf') }}
        />
      </div>
    </section>
  )
}
