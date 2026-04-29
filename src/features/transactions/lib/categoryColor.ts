const CAT_PALETTE = [
  'var(--cat-1)',
  'var(--cat-2)',
  'var(--cat-3)',
  'var(--cat-4)',
  'var(--cat-5)',
  'var(--cat-6)',
  'var(--cat-7)',
  'var(--cat-8)',
]

export function categoryColor(categoryId: string): string {
  let h = 0
  for (let i = 0; i < categoryId.length; i++) h = (h * 31 + categoryId.charCodeAt(i)) & 0xffffffff
  return CAT_PALETTE[Math.abs(h) % CAT_PALETTE.length]
}
