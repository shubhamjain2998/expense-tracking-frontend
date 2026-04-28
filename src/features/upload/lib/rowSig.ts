/** Stable identity key for a transaction row — used for intra-file and DB dupe detection. */
export function rowSig(date: string, description: string, amount: string | number): string {
  return `${date.slice(0, 10)}||${description}||${parseFloat(String(amount)).toFixed(2)}`
}
