import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { useToastContext } from '@/hooks/useToastContext'

import { useBackupImport } from '../hooks/useBackupImport'
import { downloadBackupJSON, downloadTransactionsCSV } from '../lib/backupExport'
import { downloadBackupTemplate } from '../lib/backupTemplate'

import { ImportGuidelinesDoc } from './ImportGuidelinesDoc'
import { ImportPreviewPanel } from './ImportPreviewPanel'

export function BackupImportSection() {
  const {
    importFileRef,
    importingJSON,
    importResult,
    importError,
    parsedPayload,
    parsedFileName,
    parsedSummary,
    optImportTransactions,
    setOptImportTransactions,
    optImportBudgetPlans,
    setOptImportBudgetPlans,
    optMappingMode,
    setOptMappingMode,
    handleParseImportFile,
    handleCancelImport,
    handleConfirmImport,
  } = useBackupImport()

  const toast = useToastContext()
  const [exportingCSV, setExportingCSV] = useState(false)
  const [exportingJSON, setExportingJSON] = useState(false)

  async function handleExportCSV() {
    setExportingCSV(true)
    try {
      await downloadTransactionsCSV()
    } catch {
      toast.error('Export failed')
    } finally {
      setExportingCSV(false)
    }
  }

  async function handleExportJSON() {
    setExportingJSON(true)
    try {
      await downloadBackupJSON()
    } catch {
      toast.error('Export failed')
    } finally {
      setExportingJSON(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="card">
        <div className="card-head">
          <div>
            <p className="card-title">Privacy posture</p>
            <p className="card-sub">
              This app does not connect to banks, read emails, or use AI for categorization.
            </p>
          </div>
        </div>
        <div
          style={{
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
          }}
        >
          {[
            { label: 'Bank account connections', value: 'Never', highlight: true },
            { label: 'Email / inbox access', value: 'Never', highlight: true },
            { label: 'AI / LLM categorization', value: 'Off', highlight: true },
            {
              label: 'Uploaded PDFs retained',
              value: 'In-memory only, never stored',
              highlight: true,
            },
            { label: 'Saved pattern matching', value: 'On (RapidFuzz)', highlight: false },
          ].map((item, i) => (
            <div
              key={item.label}
              className="flex items-center justify-between"
              style={{
                padding: '10px 14px',
                borderTop: i === 0 ? 'none' : '1px solid var(--line)',
              }}
            >
              <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>
                {item.label}
              </span>
              <span
                className="text-[13px] font-medium"
                style={{ color: item.highlight ? 'var(--pos)' : 'var(--ink-2)' }}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <p className="card-title">Data export</p>
            <p className="card-sub">
              Download a copy of your data at any time. The JSON backup is the authoritative export
              — the same format is accepted by the import below, so a backup can be round-tripped.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={handleExportCSV} loading={exportingCSV}>
            Export CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportJSON} loading={exportingJSON}>
            Full backup (JSON)
          </Button>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <p className="card-title">Data import</p>
            <p className="card-sub">
              Restore from a backup or bulk-load historical data (e.g. from a spreadsheet
              you&rsquo;ve converted to JSON).
            </p>
          </div>
        </div>

        <ImportGuidelinesDoc />

        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="tertiary" size="sm" onClick={downloadBackupTemplate}>
            Download template
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => importFileRef.current?.click()}
            disabled={parsedPayload !== null || importingJSON}
          >
            Choose JSON file…
          </Button>
          <input
            ref={importFileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleParseImportFile(file)
            }}
          />
        </div>

        {parsedPayload && parsedSummary && (
          <ImportPreviewPanel
            parsedSummary={parsedSummary}
            parsedFileName={parsedFileName}
            optImportTransactions={optImportTransactions}
            setOptImportTransactions={setOptImportTransactions}
            optImportBudgetPlans={optImportBudgetPlans}
            setOptImportBudgetPlans={setOptImportBudgetPlans}
            optMappingMode={optMappingMode}
            setOptMappingMode={setOptMappingMode}
            importingJSON={importingJSON}
            onConfirm={handleConfirmImport}
            onCancel={handleCancelImport}
          />
        )}

        {importError && (
          <div
            className="mt-3 text-[12.5px]"
            style={{
              border: '1px solid var(--neg)',
              background: 'var(--neg-soft)',
              borderRadius: 'var(--radius)',
              padding: 10,
              color: 'var(--neg)',
            }}
          >
            {importError}
          </div>
        )}

        {importResult && (
          <div
            className="mt-3"
            style={{
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              padding: 12,
              background: 'var(--surface)',
            }}
          >
            <p className="card-eyebrow" style={{ marginBottom: 8 }}>
              Last import
            </p>
            <div
              className="text-[12.5px]"
              style={{ color: 'var(--ink-2)', display: 'grid', gap: 4 }}
            >
              <div>
                Transactions imported:{' '}
                <strong style={{ color: 'var(--ink)' }}>
                  {importResult.transactions_imported}
                </strong>
              </div>
              <div>
                Duplicates skipped:{' '}
                <strong style={{ color: 'var(--ink)' }}>
                  {importResult.transactions_skipped_duplicates}
                </strong>
              </div>
              <div>
                Categories created:{' '}
                <strong style={{ color: 'var(--ink)' }}>{importResult.categories_created}</strong>
                {' · '}Tags:{' '}
                <strong style={{ color: 'var(--ink)' }}>{importResult.tags_created}</strong>
                {' · '}Persons:{' '}
                <strong style={{ color: 'var(--ink)' }}>{importResult.persons_created}</strong>
              </div>
              <div>
                Budget plans:{' '}
                <strong style={{ color: 'var(--ink)' }}>{importResult.budget_plans_created}</strong>
                {' · '}Mappings:{' '}
                <strong style={{ color: 'var(--ink)' }}>
                  {importResult.category_mappings_created}
                </strong>
              </div>
            </div>
            {importResult.skipped_rows.length > 0 && (
              <details className="mt-2">
                <summary className="text-[12px]" style={{ color: 'var(--neg)', cursor: 'pointer' }}>
                  {importResult.skipped_rows.length} row
                  {importResult.skipped_rows.length === 1 ? '' : 's'} skipped due to errors
                </summary>
                <ul
                  className="mono text-[11.5px]"
                  style={{
                    color: 'var(--ink-3)',
                    marginTop: 6,
                    paddingLeft: 14,
                    listStyle: 'disc',
                    maxHeight: 160,
                    overflowY: 'auto',
                  }}
                >
                  {importResult.skipped_rows.map((row, i) => (
                    <li key={i}>{row}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
