import { formatCurrency } from '../../lib/format'
import { getEffectiveAmount } from '../../lib/shareMath'
import type { Person } from '../../types/settings'
import type { PersonShareIn } from '../../types/transaction'

import { MultiSelect } from './MultiSelect'

interface PersonShareBuilderProps {
  persons: Person[]
  shares: PersonShareIn[]
  onChange: (shares: PersonShareIn[]) => void
  totalAmount: number
  onCreatePerson?: (name: string) => Promise<Person>
}

const fmt = (n: number) => formatCurrency(n, { fractionDigits: 2 })


export function PersonShareBuilder({
  persons,
  shares,
  onChange,
  totalAmount,
  onCreatePerson,
}: PersonShareBuilderProps) {
  const selectedIds = shares.map((s) => s.person_id)

  function handlePersonChange(ids: string[]) {
    const next: PersonShareIn[] = ids.map((pid) => {
      const existing = shares.find((s) => s.person_id === pid)
      return existing ?? { person_id: pid, share_type: 'percentage', share_value: 0 }
    })
    onChange(next)
  }

  function updateShare(personId: string, field: 'share_type' | 'share_value', val: string) {
    onChange(
      shares.map((s) =>
        s.person_id === personId
          ? {
              ...s,
              [field]: field === 'share_value' ? Number(val) : (val as 'percentage' | 'amount'),
            }
          : s
      )
    )
  }

  const pctShares = shares.filter((s) => s.share_type === 'percentage')
  const pctSum = pctShares.reduce((acc, s) => acc + s.share_value, 0)
  const pctWarning = pctSum > 100

  const yourShare = getEffectiveAmount(totalAmount, shares)

  return (
    <div className="space-y-3">
      <MultiSelect
        label="Split with persons"
        persons={persons}
        selectedIds={selectedIds}
        onChange={handlePersonChange}
        onCreatePerson={onCreatePerson}
      />

      {shares.length > 0 && (
        <div className="space-y-1.5">
          {shares.map((share) => {
            const person = persons.find((p) => p.id === share.person_id)
            const name = person?.name ?? share.person_id
            return (
              <div
                key={share.person_id}
                className="flex items-center gap-2"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius)',
                  padding: '6px 8px',
                }}
              >
                <span
                  className="min-w-[110px] truncate text-[12.5px] font-medium"
                  style={{ color: 'var(--ink)' }}
                >
                  {name}
                </span>

                <div className="seg" style={{ height: 22, padding: 1 }}>
                  {(['percentage', 'amount'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => updateShare(share.person_id, 'share_type', t)}
                      className={share.share_type === t ? 'on' : ''}
                      style={{ height: 18, padding: '0 8px', fontSize: 11 }}
                    >
                      {t === 'percentage' ? '%' : '₹'}
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  value={share.share_value || ''}
                  min={0}
                  max={share.share_type === 'percentage' ? 100 : undefined}
                  placeholder="0"
                  onChange={(e) => updateShare(share.person_id, 'share_value', e.target.value)}
                  className="input num w-20 text-right"
                  style={{ height: 24, padding: '0 8px', fontSize: 12 }}
                  aria-label={`${name} share value`}
                />

                <span
                  className="num ml-auto shrink-0 text-[11.5px]"
                  style={{ color: 'var(--ink-3)' }}
                >
                  {share.share_type === 'percentage'
                    ? fmt(totalAmount * (share.share_value / 100))
                    : fmt(share.share_value)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {pctWarning && (
        <p className="text-[11.5px] font-medium" style={{ color: 'var(--neg)' }}>
          Percentage shares sum to {pctSum}% — must be ≤ 100%.
        </p>
      )}

      {shares.length > 0 && (
        <div
          className="flex items-center justify-between"
          style={{
            background: 'var(--accent-soft)',
            borderRadius: 'var(--radius)',
            padding: '8px 12px',
          }}
        >
          <span className="text-[12px] font-medium" style={{ color: 'var(--accent)' }}>
            Your share
          </span>
          <span
            className="num text-[13px] font-semibold"
            style={{ color: 'var(--accent)', letterSpacing: '-0.005em' }}
          >
            {fmt(yourShare)}
          </span>
        </div>
      )}
    </div>
  )
}
