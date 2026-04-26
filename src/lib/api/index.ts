/**
 * Barrel that preserves the legacy `import { ... } from '@/lib/api'` API.
 *
 * Prefer importing from a specific domain module (e.g. `@/lib/api/budget`) in
 * new code — it keeps bundles tighter and dependencies explicit.
 */

export type { ApiError } from './client'
export { setUnauthorizedHandler } from './client'

export type { TokenResponse } from './auth'
export { login, register } from './auth'

export {
  createBudget,
  deleteBudgetEntry,
  deleteMonthlyBudgetOverride,
  getBudget,
  getMonthlyBudgetOverrides,
  setMonthlyBudget,
  updateBudgetEntry,
} from './budget'

export {
  importStatement,
  importStatementText,
  previewStatement,
  previewStatementText,
} from './uploads'

export {
  autoCategorise,
  bulkTagTransactions,
  createRawTransaction,
  deleteProcessedTransaction,
  deleteRawTransaction,
  editProcessedTransaction,
  getAllProcessedTransactions,
  getPendingManual,
  getProcessedTransactions,
  getRawTransactions,
  patchShareSettled,
  processTransaction,
  restoreRawTransaction,
} from './transactions'

export {
  createCategory,
  deleteCategory,
  deleteCategoryMapping,
  getCategories,
  getCategoryMappings,
  renameCategory,
  setCategoryIncomeFlag,
} from './categories'

export { createTag, deleteTag, getTags } from './tags'

export { createPerson, deletePerson, getPersons } from './persons'

export { getDashboardSummary, getMonthlyTrend, getSplitLedger, getYTD } from './dashboard'

export { exportBackup, importBackup } from './backup'

export {
  clearAllMappings,
  deleteAllBudget,
  deleteAllData,
  deleteAllPersons,
  deleteAllProcessedTransactions,
  deleteAllRawTransactions,
} from './admin'
