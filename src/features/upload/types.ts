import type { PreviewResponse } from '@/types/transaction'

export type UploadMode = 'pdf' | 'paste' | 'manual'
export type FileStatus = 'previewing' | 'ready' | 'error' | 'importing' | 'done'

export interface FileUpload {
  id: string
  file: File
  preview: PreviewResponse | null
  excludedIndices: Set<number>
  dupeIndices: Set<number>
  status: FileStatus
  error?: string
}
