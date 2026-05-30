import { useIgnoreRules } from '@/hooks/useIgnoreRules'
import { previewStatement } from '@/lib/api/uploads'

import { buildPreviewResult, type PreviewResult } from '../lib/buildPreviewResult'

export type { PreviewResult }

export function useStatementPreview() {
  const ignoreRules = useIgnoreRules()

  async function previewFile(file: File, password?: string): Promise<PreviewResult> {
    const data = await previewStatement(file, password)
    return buildPreviewResult(data, ignoreRules)
  }

  return { previewFile }
}
