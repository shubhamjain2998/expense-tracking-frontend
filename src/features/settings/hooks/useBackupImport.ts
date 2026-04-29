import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'

import { useToastContext } from '@/hooks/useToastContext'
import { importBackup } from '@/lib/api/backup'
import type { BackupImportResponse, ParsedBackupPayload } from '@/types/backup'

export type MappingMode = 'derive' | 'explicit' | 'skip'

export interface ParsedSummary {
  txnCount: number
  bpCount: number
  explicitMappings: number | null
  derivedMappings: number
  catCount: number
  tagCount: number
  personCount: number
  incomeCount: number
  expenseCount: number
}

function computeSummary(parsedPayload: ParsedBackupPayload): ParsedSummary {
  const txns = parsedPayload.transactions
  const txnCount = txns.length
  const bpCount = Array.isArray(parsedPayload.budget_plans) ? parsedPayload.budget_plans.length : 0
  const explicitMappings = Array.isArray(parsedPayload.category_mappings)
    ? parsedPayload.category_mappings.length
    : null

  const cats = new Set<string>()
  const tags = new Set<string>()
  const persons = new Set<string>()
  let incomeCount = 0
  let expenseCount = 0
  for (const t of txns) {
    if (typeof t.category === 'string') cats.add(t.category.trim().toLowerCase())
    if (Array.isArray(t.tags)) {
      for (const tag of t.tags) {
        if (typeof tag === 'string') tags.add(tag.trim().toLowerCase())
      }
    }
    if (Array.isArray(t.shares)) {
      for (const s of t.shares) {
        const p = (s as { person?: unknown }).person
        if (typeof p === 'string') persons.add(p.trim().toLowerCase())
      }
    }
    const amtStr = typeof t.amount === 'string' ? t.amount : String(t.amount ?? '')
    const amt = Number(amtStr)
    if (!Number.isNaN(amt)) {
      if (amt < 0) incomeCount++
      else if (amt > 0) expenseCount++
    }
  }

  const pairs = new Set<string>()
  for (const t of txns) {
    if (typeof t.description === 'string' && typeof t.category === 'string') {
      pairs.add(`${t.description.trim()}::${t.category.trim().toLowerCase()}`)
    }
  }
  return {
    txnCount,
    bpCount,
    explicitMappings,
    derivedMappings: pairs.size,
    catCount: cats.size,
    tagCount: tags.size,
    personCount: persons.size,
    incomeCount,
    expenseCount,
  }
}

export function useBackupImport() {
  const toast = useToastContext()
  const qc = useQueryClient()
  const importFileRef = useRef<HTMLInputElement | null>(null)
  const [importingJSON, setImportingJSON] = useState(false)
  const [importResult, setImportResult] = useState<BackupImportResponse | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [parsedPayload, setParsedPayload] = useState<ParsedBackupPayload | null>(null)
  const [parsedFileName, setParsedFileName] = useState<string | null>(null)
  const [optImportTransactions, setOptImportTransactions] = useState(true)
  const [optImportBudgetPlans, setOptImportBudgetPlans] = useState(true)
  const [optMappingMode, setOptMappingMode] = useState<MappingMode>('derive')

  const parsedSummary: ParsedSummary | null = parsedPayload ? computeSummary(parsedPayload) : null

  async function handleParseImportFile(file: File) {
    setImportError(null)
    setImportResult(null)
    setParsedPayload(null)
    setParsedFileName(null)
    try {
      const text = await file.text()
      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(text)
      } catch {
        setImportError(
          'The selected file is not valid JSON. Open it in a text editor and verify the syntax.'
        )
        return
      }
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.transactions)) {
        setImportError(
          'JSON is missing the required "transactions" array. Download the template for a working example.'
        )
        return
      }
      const payload = parsed as unknown as ParsedBackupPayload
      setParsedPayload(payload)
      setParsedFileName(file.name)
      setOptImportTransactions(true)
      setOptImportBudgetPlans(true)
      setOptMappingMode(Array.isArray(payload.category_mappings) ? 'explicit' : 'derive')
    } catch {
      setImportError('Could not read the selected file.')
    } finally {
      if (importFileRef.current) importFileRef.current.value = ''
    }
  }

  function handleCancelImport() {
    setParsedPayload(null)
    setParsedFileName(null)
    setImportError(null)
  }

  async function handleConfirmImport() {
    if (!parsedPayload) return
    setImportingJSON(true)
    setImportError(null)
    try {
      const toSend: Record<string, unknown> = {
        version: parsedPayload.version ?? '1',
        categories: parsedPayload.categories ?? [],
        tags: parsedPayload.tags ?? [],
        persons: parsedPayload.persons ?? [],
        transactions: optImportTransactions ? parsedPayload.transactions : [],
        budget_plans: optImportBudgetPlans ? (parsedPayload.budget_plans ?? []) : [],
      }
      if (optMappingMode === 'explicit') {
        toSend.category_mappings = parsedPayload.category_mappings ?? []
      } else if (optMappingMode === 'skip') {
        toSend.category_mappings = []
      }
      const result = await importBackup(toSend)
      setImportResult(result)
      setParsedPayload(null)
      setParsedFileName(null)
      void qc.invalidateQueries()
      const total =
        result.transactions_imported +
        result.categories_created +
        result.tags_created +
        result.persons_created +
        result.budget_plans_created +
        result.category_mappings_created
      if (total === 0 && result.transactions_skipped_duplicates === 0) {
        toast.warning('Nothing was imported — the file may be empty or malformed.')
      } else if (result.skipped_rows.length > 0) {
        toast.warning(
          `Imported ${result.transactions_imported} transactions, ${result.skipped_rows.length} rows skipped.`
        )
      } else {
        toast.success(
          `Imported ${result.transactions_imported} transactions${
            result.transactions_skipped_duplicates > 0
              ? ` (${result.transactions_skipped_duplicates} duplicates skipped)`
              : ''
          }.`
        )
      }
    } catch (err) {
      const detail = (err as { detail?: string }).detail ?? 'Import failed.'
      setImportError(detail)
      toast.error(detail)
    } finally {
      setImportingJSON(false)
    }
  }

  return {
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
  }
}
