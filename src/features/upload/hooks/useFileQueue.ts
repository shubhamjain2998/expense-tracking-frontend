import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useToastContext } from '@/hooks/useToastContext'
import { PDF_PASSWORD_INCORRECT, PDF_PASSWORD_REQUIRED } from '@/lib/api/uploads'

import type { FileStatus, FileUpload } from '../types'

import { useStatementImport } from './useStatementImport'
import { useStatementPreview } from './useStatementPreview'

export function useFileQueue() {
  const navigate = useNavigate()
  const toast = useToastContext()
  const { previewFile } = useStatementPreview()
  const { importFile } = useStatementImport()

  const [uploads, setUploads] = useState<FileUpload[]>([])
  const [fileError, setFileError] = useState('')
  const [isImportingAll, setIsImportingAll] = useState(false)

  async function previewUpload(upload: FileUpload, password?: string) {
    try {
      const { preview, autoExcluded, dupeIndices } = await previewFile(upload.file, password)
      setUploads((prev) =>
        prev.map((u) =>
          u.id === upload.id
            ? {
                ...u,
                preview,
                excludedIndices: autoExcluded,
                dupeIndices,
                status: 'ready' as FileStatus,
                // Stash the password so importFile can reuse it without
                // re-prompting; in-memory only.
                password: password ?? u.password,
                passwordError: undefined,
              }
            : u
        )
      )
    } catch (err) {
      const e = err as { detail?: string; code?: string }
      if (e.code === PDF_PASSWORD_REQUIRED || e.code === PDF_PASSWORD_INCORRECT) {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === upload.id
              ? {
                  ...u,
                  status: 'needs_password' as FileStatus,
                  passwordError:
                    e.code === PDF_PASSWORD_INCORRECT
                      ? (e.detail ?? 'Incorrect password')
                      : undefined,
                }
              : u
          )
        )
        return
      }
      setUploads((prev) =>
        prev.map((u) =>
          u.id === upload.id
            ? {
                ...u,
                status: 'error' as FileStatus,
                error: e.detail ?? 'Failed to parse file',
              }
            : u
        )
      )
    }
  }

  async function submitPassword(uploadId: string, password: string) {
    const target = uploads.find((u) => u.id === uploadId)
    if (!target) return
    setUploads((prev) =>
      prev.map((u) => (u.id === uploadId ? { ...u, status: 'previewing' as FileStatus } : u))
    )
    await previewUpload(target, password)
  }

  function cancelPasswordPrompt(uploadId: string) {
    // User backed out — drop the file from the queue rather than leaving a
    // half-stuck row behind.
    setUploads((prev) => prev.filter((u) => u.id !== uploadId))
  }

  function addPdfFiles(newFiles: File[]) {
    setFileError('')
    const errors: string[] = []
    const valid: File[] = []

    for (const f of newFiles) {
      if (f.type !== 'application/pdf') {
        errors.push(`"${f.name}" is not a PDF`)
      } else if (f.size > 10 * 1024 * 1024) {
        errors.push(`"${f.name}" exceeds 10 MB`)
      } else {
        valid.push(f)
      }
    }

    if (errors.length > 0) setFileError(errors.join(' · '))
    if (valid.length === 0) return

    const existingKeys = new Set(uploads.map((u) => `${u.file.name}:${u.file.size}`))
    const toAdd = valid.filter((f) => !existingKeys.has(`${f.name}:${f.size}`))

    if (toAdd.length === 0) {
      toast.warning('File(s) already added')
      return
    }

    const newUploads: FileUpload[] = toAdd.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file: f,
      preview: null,
      excludedIndices: new Set(),
      dupeIndices: new Set(),
      status: 'previewing' as FileStatus,
    }))

    setUploads((prev) => [...prev, ...newUploads])
    void Promise.allSettled(newUploads.map((u) => previewUpload(u)))
  }

  function removeUpload(id: string) {
    setUploads((prev) => prev.filter((u) => u.id !== id))
  }

  function toggleExcludeInUpload(uploadId: string, rowIndex: number) {
    setUploads((prev) =>
      prev.map((u) => {
        if (u.id !== uploadId) return u
        const next = new Set(u.excludedIndices)
        if (next.has(rowIndex)) next.delete(rowIndex)
        else next.add(rowIndex)
        return { ...u, excludedIndices: next }
      })
    )
  }

  async function importAllPdfs() {
    const readyUploads = uploads.filter((u) => u.status === 'ready')
    if (readyUploads.length === 0) return

    setIsImportingAll(true)
    setUploads((prev) =>
      prev.map((u) => (u.status === 'ready' ? { ...u, status: 'importing' as FileStatus } : u))
    )

    let totalInserted = 0
    let totalSkipped = 0
    let errorCount = 0

    await Promise.allSettled(
      readyUploads.map(async (upload) => {
        try {
          const excludedRows = upload.preview
            ? upload.preview.rows.filter((_, i) => upload.excludedIndices.has(i))
            : []
          const data = await importFile(upload.file, excludedRows, upload.password)
          totalInserted += data.inserted
          totalSkipped += data.skipped
          setUploads((prev) =>
            prev.map((u) => (u.id === upload.id ? { ...u, status: 'done' as FileStatus } : u))
          )
        } catch (err) {
          errorCount++
          const e = err as { detail?: string; status?: number }
          if (e.status === 409) {
            const msg =
              typeof e.detail === 'string' ? e.detail : 'This statement has already been imported.'
            toast.warning(msg)
            setUploads((prev) =>
              prev.map((u) =>
                u.id === upload.id
                  ? { ...u, status: 'error' as FileStatus, error: 'Already imported' }
                  : u
              )
            )
          } else {
            setUploads((prev) =>
              prev.map((u) =>
                u.id === upload.id
                  ? { ...u, status: 'error' as FileStatus, error: e.detail ?? 'Import failed' }
                  : u
              )
            )
          }
        }
      })
    )

    setIsImportingAll(false)

    if (errorCount > 0)
      toast.error(`${errorCount} file${errorCount > 1 ? 's' : ''} failed to import`)
    if (totalInserted > 0 || totalSkipped > 0)
      toast.success(`${totalInserted} transactions imported, ${totalSkipped} skipped`)
    if (totalInserted > 0) navigate('/transactions')
  }

  function clearAll() {
    setUploads([])
    setFileError('')
  }

  const readyUploads = uploads.filter((u) => u.status === 'ready')
  const totalReadyTxns = readyUploads.reduce(
    (sum, u) => sum + (u.preview?.would_insert ?? 0) - u.excludedIndices.size,
    0
  )
  const hasPreviewing = uploads.some((u) => u.status === 'previewing')

  return {
    uploads,
    fileError,
    isImportingAll,
    readyUploads,
    totalReadyTxns,
    hasPreviewing,
    addPdfFiles,
    removeUpload,
    toggleExcludeInUpload,
    importAllPdfs,
    clearAll,
    submitPassword,
    cancelPasswordPrompt,
  }
}
