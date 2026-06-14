import { Button } from '@/components/ui/Button'

import type { DateMode, MappingMode, ParsedSummary } from '../hooks/useBackupImport'

interface ImportPreviewPanelProps {
  parsedSummary: ParsedSummary
  parsedFileName: string | null
  optImportTransactions: boolean
  setOptImportTransactions: (v: boolean) => void
  optImportBudgetPlans: boolean
  setOptImportBudgetPlans: (v: boolean) => void
  optMappingMode: MappingMode
  setOptMappingMode: (m: MappingMode) => void
  optDateMode: DateMode
  setOptDateMode: (m: DateMode) => void
  rangeStart: string
  setRangeStart: (v: string) => void
  rangeEnd: string
  setRangeEnd: (v: string) => void
  fileDateBounds: { min: string; max: string } | null
  filteredTxnCount: number
  importingJSON: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ImportPreviewPanel({
  parsedSummary,
  parsedFileName,
  optImportTransactions,
  setOptImportTransactions,
  optImportBudgetPlans,
  setOptImportBudgetPlans,
  optMappingMode,
  setOptMappingMode,
  optDateMode,
  setOptDateMode,
  rangeStart,
  setRangeStart,
  rangeEnd,
  setRangeEnd,
  fileDateBounds,
  filteredTxnCount,
  importingJSON,
  onConfirm,
  onCancel,
}: ImportPreviewPanelProps) {
  return (
    <div
      className="mt-3"
      style={{
        border: '1px solid var(--accent)',
        background: 'var(--surface-2)',
        borderRadius: 'var(--radius)',
        padding: 14,
      }}
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
          Review what to import
        </p>
        {parsedFileName && (
          <p className="mono text-[11px]" style={{ color: 'var(--ink-3)' }}>
            {parsedFileName}
          </p>
        )}
      </div>

      <p className="text-[11.5px]" style={{ color: 'var(--ink-3)', marginBottom: 10 }}>
        Tick what you want imported. Categories, tags and persons referenced by your transactions
        are always created automatically (they&rsquo;re required for the rows to land).
      </p>

      <div
        className="text-[12px]"
        style={{
          color: 'var(--ink-2)',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius)',
          padding: 10,
          display: 'grid',
          gap: 4,
          marginBottom: 12,
        }}
      >
        <div>
          Transactions: <strong style={{ color: 'var(--ink)' }}>{parsedSummary.txnCount}</strong> (
          {parsedSummary.expenseCount} expense
          {parsedSummary.expenseCount === 1 ? '' : 's'}, {parsedSummary.incomeCount} income
          {parsedSummary.incomeCount === 1 ? '' : 's'})
        </div>
        <div>
          References: <strong style={{ color: 'var(--ink)' }}>{parsedSummary.catCount}</strong>{' '}
          unique categor{parsedSummary.catCount === 1 ? 'y' : 'ies'},{' '}
          <strong style={{ color: 'var(--ink)' }}>{parsedSummary.tagCount}</strong> tag
          {parsedSummary.tagCount === 1 ? '' : 's'},{' '}
          <strong style={{ color: 'var(--ink)' }}>{parsedSummary.personCount}</strong> person
          {parsedSummary.personCount === 1 ? '' : 's'}
        </div>
        {parsedSummary.bpCount > 0 && (
          <div>
            Budget plans in file:{' '}
            <strong style={{ color: 'var(--ink)' }}>{parsedSummary.bpCount}</strong>
          </div>
        )}
        {parsedSummary.explicitMappings !== null && (
          <div>
            Explicit mappings in file:{' '}
            <strong style={{ color: 'var(--ink)' }}>{parsedSummary.explicitMappings}</strong>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <label
          className="flex items-start gap-2 text-[12.5px]"
          style={{ color: 'var(--ink)', cursor: 'pointer' }}
        >
          <input
            type="checkbox"
            checked={optImportTransactions}
            onChange={(e) => setOptImportTransactions(e.target.checked)}
            style={{ marginTop: 2 }}
          />
          <span>
            Import transactions ({parsedSummary.txnCount})
            <span className="block text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
              Untick if you only want to load budget plans or pre-create mappings.
            </span>
          </span>
        </label>

        <div
          style={{
            marginLeft: 24,
            opacity: optImportTransactions ? 1 : 0.45,
          }}
        >
          <label
            className="flex items-start gap-2 text-[12.5px]"
            style={{
              color: 'var(--ink)',
              cursor: optImportTransactions ? 'pointer' : 'default',
            }}
          >
            <input
              type="radio"
              name="import-date-mode"
              checked={optDateMode === 'all'}
              disabled={!optImportTransactions}
              onChange={() => setOptDateMode('all')}
              style={{ marginTop: 3 }}
            />
            <span>Import everything</span>
          </label>
          <label
            className="mt-2 flex items-start gap-2 text-[12.5px]"
            style={{
              color: 'var(--ink)',
              cursor: optImportTransactions ? 'pointer' : 'default',
            }}
          >
            <input
              type="radio"
              name="import-date-mode"
              checked={optDateMode === 'range'}
              disabled={!optImportTransactions}
              onChange={() => setOptDateMode('range')}
              style={{ marginTop: 3 }}
            />
            <span>Only a date range</span>
          </label>

          {optDateMode === 'range' && (
            <div style={{ marginLeft: 24, marginTop: 6 }}>
              <div className="flex flex-wrap gap-3">
                <label
                  className="text-[11.5px]"
                  style={{ color: 'var(--ink-3)', display: 'grid', gap: 2 }}
                >
                  From
                  <input
                    type="date"
                    value={rangeStart}
                    disabled={!optImportTransactions}
                    min={fileDateBounds?.min}
                    max={fileDateBounds?.max}
                    onChange={(e) => setRangeStart(e.target.value)}
                    className="text-[12.5px]"
                    style={{
                      color: 'var(--ink)',
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--radius)',
                      padding: '4px 6px',
                    }}
                  />
                </label>
                <label
                  className="text-[11.5px]"
                  style={{ color: 'var(--ink-3)', display: 'grid', gap: 2 }}
                >
                  To
                  <input
                    type="date"
                    value={rangeEnd}
                    disabled={!optImportTransactions}
                    min={fileDateBounds?.min}
                    max={fileDateBounds?.max}
                    onChange={(e) => setRangeEnd(e.target.value)}
                    className="text-[12.5px]"
                    style={{
                      color: 'var(--ink)',
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--radius)',
                      padding: '4px 6px',
                    }}
                  />
                </label>
              </div>
              <p className="text-[11.5px]" style={{ color: 'var(--ink-3)', marginTop: 6 }}>
                {filteredTxnCount} transaction{filteredTxnCount === 1 ? '' : 's'} in range.
              </p>
            </div>
          )}
        </div>

        {parsedSummary.bpCount > 0 && (
          <label
            className="flex items-start gap-2 text-[12.5px]"
            style={{ color: 'var(--ink)', cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              checked={optImportBudgetPlans}
              onChange={(e) => setOptImportBudgetPlans(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>
              Import budget plans ({parsedSummary.bpCount})
              <span className="block text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
                Updates the allocation when (year, category) already exists.
              </span>
            </span>
          </label>
        )}

        <fieldset
          style={{
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
            padding: '8px 10px',
            margin: 0,
          }}
        >
          <legend className="card-eyebrow" style={{ padding: '0 6px' }}>
            Category mappings
          </legend>
          <label
            className="flex items-start gap-2 text-[12.5px]"
            style={{ color: 'var(--ink)', cursor: 'pointer' }}
          >
            <input
              type="radio"
              name="mapping-mode"
              checked={optMappingMode === 'derive'}
              onChange={() => setOptMappingMode('derive')}
              style={{ marginTop: 3 }}
            />
            <span>
              Auto-derive from transactions
              <span className="block text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
                {parsedSummary.derivedMappings} mapping
                {parsedSummary.derivedMappings === 1 ? '' : 's'} would be created — one per unique
                (description, category) pair.
              </span>
            </span>
          </label>
          {parsedSummary.explicitMappings !== null && (
            <label
              className="mt-2 flex items-start gap-2 text-[12.5px]"
              style={{ color: 'var(--ink)', cursor: 'pointer' }}
            >
              <input
                type="radio"
                name="mapping-mode"
                checked={optMappingMode === 'explicit'}
                onChange={() => setOptMappingMode('explicit')}
                style={{ marginTop: 3 }}
              />
              <span>
                Use the {parsedSummary.explicitMappings} mapping
                {parsedSummary.explicitMappings === 1 ? '' : 's'} from the file
                <span className="block text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
                  Patterns and category assignments exactly as written.
                </span>
              </span>
            </label>
          )}
          <label
            className="mt-2 flex items-start gap-2 text-[12.5px]"
            style={{ color: 'var(--ink)', cursor: 'pointer' }}
          >
            <input
              type="radio"
              name="mapping-mode"
              checked={optMappingMode === 'skip'}
              onChange={() => setOptMappingMode('skip')}
              style={{ marginTop: 3 }}
            />
            <span>
              Don&rsquo;t create any mappings
              <span className="block text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
                Use this when descriptions are too generic to auto-match future statements.
              </span>
            </span>
          </label>
        </fieldset>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={onConfirm}
          loading={importingJSON}
          disabled={!optImportTransactions && !optImportBudgetPlans && optMappingMode === 'skip'}
        >
          Import selected
        </Button>
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={importingJSON}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
