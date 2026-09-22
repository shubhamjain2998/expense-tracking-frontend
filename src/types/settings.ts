export interface Category {
  id: string
  name: string
  is_income?: boolean
  txn_count?: number
}

export interface Tag {
  id: string
  name: string
}

export interface Person {
  id: string
  name: string
  created_at?: string
}

/** A mapping's default split. No share_amount: that depends on the txn total. */
export interface MappingShare {
  person_id: string
  person_name: string
  share_type: 'percentage' | 'amount'
  share_value: string | number
}

/**
 * A rule, not just a category: whatever it carries here is what
 * auto-categorise puts on every transaction it matches.
 */
export interface CategoryMapping {
  id: string
  description_pattern: string
  category_id: string
  category: string
  match_count: number
  last_used?: string | null
  tags: Tag[]
  shares: MappingShare[]
}

export interface MappingSharePayload {
  person_id: string
  share_type: 'percentage' | 'amount'
  share_value: number
}
