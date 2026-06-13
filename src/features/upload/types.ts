import type { PreviewResponse } from '@/types/transaction'

export type UploadMode = 'pdf' | 'bulk-paste' | 'manual' | 'backup'
export type FileStatus =
  | 'previewing'
  | 'ready'
  | 'error'
  | 'importing'
  | 'done'
  /** Backend reported the PDF is encrypted; awaiting user-typed password. */
  | 'needs_password'

export interface FileUpload {
  id: string
  file: File
  preview: PreviewResponse | null
  excludedIndices: Set<number>
  dupeIndices: Set<number>
  status: FileStatus
  error?: string
  /** Password the user supplied to decrypt the PDF. Kept in memory only —
   *  never written to storage; cleared on clearAll/removeUpload. Forwarded
   *  on import so the same decrypt key is used both times. */
  password?: string
  /** Last-attempt error message ("wrong password") shown inline in the
   *  password dialog. Cleared on a successful unlock. */
  passwordError?: string
}
