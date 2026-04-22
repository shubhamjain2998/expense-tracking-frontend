export interface Category {
  id: string
  name: string
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

export interface CategoryMapping {
  id: string
  description_pattern: string
  category_id: string
  category: string
  match_count: number
  last_used?: string | null
}
