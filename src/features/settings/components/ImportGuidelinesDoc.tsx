export function ImportGuidelinesDoc() {
  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        padding: 14,
        background: 'var(--surface-2)',
      }}
    >
      <p className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)', marginBottom: 4 }}>
        JSON import guidelines (v2.0)
      </p>
      <p className="text-[11.5px]" style={{ color: 'var(--ink-3)', marginBottom: 10 }}>
        The same shape produced by Full backup (JSON). Hand-author smaller files for spreadsheet
        imports.
      </p>

      <p
        className="text-[11.5px] font-semibold"
        style={{
          color: 'var(--ink)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginTop: 4,
          marginBottom: 4,
        }}
      >
        1 · Top-level structure
      </p>
      <ul
        className="text-[12px]"
        style={{ color: 'var(--ink-2)', paddingLeft: 18, listStyle: 'disc' }}
      >
        <li>
          <code className="mono">version</code>: always <code className="mono">&quot;1&quot;</code>.
        </li>
        <li>
          <code className="mono">exported_at</code>: ISO 8601 timestamp (informational).
        </li>
        <li>
          <code className="mono">transactions</code>: <strong>required</strong> — array of all
          entries.
        </li>
        <li>
          <code className="mono">budget_plans</code>: optional — annual allocations.
        </li>
        <li>
          <code className="mono">category_mappings</code>, <code className="mono">categories</code>,{' '}
          <code className="mono">tags</code>, <code className="mono">persons</code>: all optional.
        </li>
      </ul>

      <p
        className="text-[11.5px] font-semibold"
        style={{
          color: 'var(--ink)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginTop: 12,
          marginBottom: 4,
        }}
      >
        2 · Transaction schema
      </p>
      <ul
        className="text-[12px]"
        style={{ color: 'var(--ink-2)', paddingLeft: 18, listStyle: 'disc' }}
      >
        <li>
          <code className="mono">txn_date</code>: real calendar date,{' '}
          <code className="mono">YYYY-MM-DD</code>.
        </li>
        <li>
          <code className="mono">description</code>: vendor or purpose string.
        </li>
        <li>
          <code className="mono">category</code>: high-level bucket (e.g.{' '}
          <code className="mono">food</code>, <code className="mono">salary</code>). Created on the
          fly.
        </li>
        <li>
          <code className="mono">amount</code>: <strong>string</strong> for precision (e.g.{' '}
          <code className="mono">&quot;125.50&quot;</code>).
        </li>
        <li>
          <code className="mono">tags</code>: array of strings — use this for sub-categories you had
          in your spreadsheet.
        </li>
        <li>
          <code className="mono">notes</code>, <code className="mono">shares</code>: optional —{' '}
          <code className="mono">null</code> / <code className="mono">[]</code> are fine.
        </li>
      </ul>
      <div
        className="mt-2 text-[12px]"
        style={{
          border: '1px solid var(--accent)',
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
          padding: 10,
          color: 'var(--ink-2)',
        }}
      >
        <p className="font-semibold" style={{ color: 'var(--ink)', marginBottom: 4 }}>
          Sign convention (critical)
        </p>
        <p>
          <strong>Expenses</strong> are positive (<code className="mono">&quot;412.00&quot;</code>).{' '}
          <strong>Incomes</strong> are negative (
          <code className="mono">&quot;-100000.00&quot;</code>). The dashboard uses the sign to
          separate income from expense — getting it wrong will show your salary as a spike of
          expenses.
        </p>
      </div>

      <p
        className="text-[11.5px] font-semibold"
        style={{
          color: 'var(--ink)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginTop: 12,
          marginBottom: 4,
        }}
      >
        3 · Budget plan schema
      </p>
      <ul
        className="text-[12px]"
        style={{ color: 'var(--ink-2)', paddingLeft: 18, listStyle: 'disc' }}
      >
        <li>
          <code className="mono">year</code>: starting year of the period (e.g.{' '}
          <code className="mono">2025</code>; in FY mode this means &ldquo;FY 25-26&rdquo;).
        </li>
        <li>
          <code className="mono">category</code>: must match a category name used in transactions
          (or pre-declared).
        </li>
        <li>
          <code className="mono">allocated_amount</code>: the <strong>annual total</strong> as a
          string. The dashboard divides by 12 to derive the monthly threshold — multiply your
          monthly target by 12 before writing it here.
        </li>
      </ul>

      <p
        className="text-[11.5px] font-semibold"
        style={{
          color: 'var(--ink)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginTop: 12,
          marginBottom: 4,
        }}
      >
        4 · System logic &amp; constraints
      </p>
      <ul
        className="text-[12px]"
        style={{ color: 'var(--ink-2)', paddingLeft: 18, listStyle: 'disc' }}
      >
        <li>
          <strong>Deduplication:</strong> a row is skipped if{' '}
          <em>(txn_date, description, amount)</em> already exists for your account.
        </li>
        <li>
          <strong>Auto-categorisation:</strong> omit <code className="mono">category_mappings</code>{' '}
          and the server generates one mapping per unique <em>(description, category)</em> pair —
          used to auto-categorise future statement uploads. (You can opt out per-import in the next
          step.)
        </li>
        <li>
          <strong>Fiscal year grouping:</strong> derived from <code className="mono">txn_date</code>
          . Any date from <code className="mono">2025-04-01</code> to{' '}
          <code className="mono">2026-03-31</code> falls under &ldquo;FY 25-26&rdquo;.
        </li>
        <li>
          <strong>On-the-fly creation:</strong> categories, tags and persons don&rsquo;t need to be
          pre-declared — they&rsquo;re initialised the moment they&rsquo;re referenced.
        </li>
        <li>
          Money values must be strings (to preserve precision). Import is additive — nothing is
          deleted. Use the Danger zone first for a clean slate.
        </li>
      </ul>
    </div>
  )
}
