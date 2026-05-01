import type { PersonShareIn } from '@/types/transaction'

/** Returns the remaining amount after deducting all person shares from the total. */
export function getEffectiveAmount(total: number, shares: PersonShareIn[]): number {
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
