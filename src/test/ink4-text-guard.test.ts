/**
 * Guard against `--ink-4` regressing back onto text. MASTER.md §2: `--ink-4`
 * is non-text only (hairlines, disabled glyphs, icon strokes) — it fails
 * the 4.5:1 text-contrast threshold by design (it's tuned for the 3:1
 * non-text minimum instead). Phase 9 fixed 11 sites; the 2026-09-21
 * follow-up fixed the ~28 remaining ones this grep turned up (see
 * docs/ledger-sweep-findings.md, Phase 9 section).
 *
 * This can't fully automate "is this a text node or an icon" — that took a
 * live-DOM read of each of the ~40 original matches. What it CAN do is
 * lock the post-fix set in place: every remaining `color`/`text-[...]` use
 * of `--ink-4` below has been manually verified as an icon (an <Icon>, an
 * icon-only button, or a JSDoc'd icon/illustration wrapper), never a text
 * node. Any new match — from a re-introduced text use OR a genuinely new
 * icon use that isn't in the allowlist yet — fails this test, so it can't
 * slip in unreviewed. Extending the allowlist is a deliberate, visible
 * diff; that's the point.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const srcRoot = join(here, '..')

/** `color:` (including a ternary's non-active branch) or a Tailwind
 *  `text-[...]` arbitrary-value class — both compile to the CSS `color`
 *  property, which is what the 4.5:1 text threshold actually gates. */
const INK4_TEXT_CONTEXT = /color:\s*[^,}]*?var\(--ink-4\)|text-\[var\(--ink-4\)\]/

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, out)
    } else if (/\.(tsx|ts)$/.test(entry.name) && !/\.test\.(tsx|ts)$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

function findInk4TextContextSites(): string[] {
  const hits: string[] = []
  for (const file of walk(srcRoot)) {
    const lines = readFileSync(file, 'utf-8').split('\n')
    lines.forEach((line, i) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return // comments
      if (INK4_TEXT_CONTEXT.test(line)) {
        hits.push(`${relative(srcRoot, file)}:${i + 1}`)
      }
    })
  }
  return hits.sort()
}

// Every one of these has been read in context and confirmed to color an
// <Icon>, an icon-only button (no text children), or an explicitly-documented
// icon/illustration wrapper (EmptyState's `illustration` prop) — never a
// text node. See docs/ledger-sweep-findings.md, Phase 9 section, for the
// per-site classification.
const ALLOWED_INK4_TEXT_CONTEXT_SITES = [
  'components/ui/EmptyState.tsx:24', // illustration wrapper (JSDoc: "Use currentColor")
  'components/ui/EmptyState.tsx:28', // icon badge circle
  'components/ui/MultiSelect.tsx:121', // chip remove <Icon name="close">
  'components/ui/MultiSelect.tsx:136', // search <Icon>
  'components/ui/MultiSelect.tsx:162', // dropdown row <Icon>
  'components/ui/MultiSelect.tsx:180', // create-new-item <Icon>
  'components/ui/SearchableSelect.tsx:168', // search <Icon>
  'components/ui/SearchableSelect.tsx:251', // create-checkbox <Icon>
  'components/ui/Toast.tsx:48', // dismiss <Icon name="close">
  'components/onboarding/GettingStartedChecklist.tsx:112', // step <Icon>
  'features/budget/components/BudgetCategoryRow.tsx:108', // edit <Icon>
  'features/budget/components/BudgetCategoryRow.tsx:125', // reset <Icon name="restart_alt">
  'features/budget/components/PeriodModePromptCard.tsx:77', // radio <Icon>
  'features/settings/components/IgnoreRulesSection.tsx:58', // chip remove <Icon name="close">
  'features/settings/components/ProfileSection.tsx:264', // edit <Icon>
  'features/settings/components/TagsSection.tsx:44', // chip remove <Icon name="close">
  'features/transactions/components/DragDropOverlay.tsx:90', // drag_indicator <Icon>
  'features/transactions/components/TransactionRow.tsx:111', // drag_indicator <Icon> (pointerEvents:none)
  'features/upload/components/FileCard.tsx:175', // search <Icon>
  'features/upload/components/FileCard.tsx:242', // expand/collapse <Icon>
  'features/upload/components/FileCard.tsx:306', // expand/collapse <Icon>
  'features/upload/components/PdfUploadPanel.tsx:112', // "Not stored" <Icon name="close">
  'features/upload/components/PdfUploadPanel.tsx:116', // "No bank connection" <Icon name="close">
].sort()

describe('--ink-4 stays off text (guard against regression)', () => {
  it('every color/text-[...] use of --ink-4 in src/**/*.{ts,tsx} is on the reviewed icon allowlist', () => {
    const found = findInk4TextContextSites()
    const unexpected = found.filter((f) => !ALLOWED_INK4_TEXT_CONTEXT_SITES.includes(f))
    const missing = ALLOWED_INK4_TEXT_CONTEXT_SITES.filter((f) => !found.includes(f))

    if (unexpected.length > 0) {
      throw new Error(
        `New --ink-4 use(s) in a color/text-[...] context, not on the reviewed allowlist ` +
          `(src/test/ink4-text-guard.test.ts). --ink-4 is non-text only per MASTER.md §2 — ` +
          `if this is a genuine icon, add it to ALLOWED_INK4_TEXT_CONTEXT_SITES; if it colors ` +
          `real text, use --ink-3 (or darker) instead:\n` +
          unexpected.join('\n')
      )
    }
    if (missing.length > 0) {
      throw new Error(
        `Allowlisted --ink-4 site(s) no longer found — remove from ` +
          `ALLOWED_INK4_TEXT_CONTEXT_SITES in this test if the code moved on purpose:\n` +
          missing.join('\n')
      )
    }
  })
})
