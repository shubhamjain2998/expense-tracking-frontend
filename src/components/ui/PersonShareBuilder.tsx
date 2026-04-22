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

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n)
}

function getEffectiveAmount(total: number, shares: PersonShareIn[]): number {
  let deducted = 0
  for (const s of shares) {
    if (s.share_type === 'percentage') {
      deducted += total * (s.share_value / 100)
    } else {
      deducted += s.share_value
    }
  }
  return total - deducted
}

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
        label="Split With Persons"
        persons={persons}
        selectedIds={selectedIds}
        onChange={handlePersonChange}
        onCreatePerson={onCreatePerson}
      />

      {shares.length > 0 && (
        <div className="space-y-2">
          {shares.map((share) => {
            const person = persons.find(
              (p) => p.person_id === share.person_id || p.id === share.person_id
            )
            const name = person?.name ?? share.person_id
            return (
              <div
                key={share.person_id}
                className="bg-surface-container-lowest flex items-center gap-2 rounded-xl px-3 py-2"
              >
                <span className="text-on-surface min-w-[100px] truncate text-sm font-medium">
                  {name}
                </span>

                {/* Type toggle */}
                <div className="bg-surface-container flex rounded-lg p-0.5">
                  {(['percentage', 'amount'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => updateShare(share.person_id, 'share_type', t)}
                      className={`rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${
                        share.share_type === t
                          ? 'bg-primary text-on-primary'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {t === 'percentage' ? '%' : '₹'}
                    </button>
                  ))}
                </div>

                {/* Value input */}
                <input
                  type="number"
                  value={share.share_value || ''}
                  min={0}
                  max={share.share_type === 'percentage' ? 100 : undefined}
                  placeholder="0"
                  onChange={(e) => updateShare(share.person_id, 'share_value', e.target.value)}
                  className="input-field w-24 text-right"
                  aria-label={`${name} share value`}
                />

                {/* Calculated amount preview */}
                <span className="text-on-surface-variant ml-auto shrink-0 text-xs">
                  {share.share_type === 'percentage'
                    ? formatCurrency(totalAmount * (share.share_value / 100))
                    : formatCurrency(share.share_value)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {pctWarning && (
        <p className="text-error text-xs font-medium">
          Percentage shares sum to {pctSum}% — must be ≤ 100%.
        </p>
      )}

      {shares.length > 0 && (
        <div className="bg-primary/8 flex items-center justify-between rounded-xl px-3 py-2">
          <span className="text-primary text-sm font-medium">Your share</span>
          <span className="text-primary text-sm font-black">{formatCurrency(yourShare)}</span>
        </div>
      )}
    </div>
  )
}
