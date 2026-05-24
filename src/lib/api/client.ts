/**
 * Axios client + auth/error interceptors. Every domain module imports `client`
 * from here so headers, base URL, and error normalization stay consistent.
 */

import axios, { type AxiosError } from 'axios'

import { API_URL } from '../config'

export interface ApiError {
  detail: string
  status?: number
  /** Backend sometimes returns `detail: { code, message }` so the frontend
   *  can branch on a stable string instead of regexing the message. When
   *  present, `detail` holds the human message and `code` the machine value. */
  code?: string
}

let onUnauthorized: () => void = () => {
  // Default is a no-op — App.tsx wires this to navigate('/login') + cache clear.
}

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

export const client = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ detail?: string | { code?: string; message?: string } } | string>) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token')
      onUnauthorized()
    }
    if (!err.response) {
      // Surface to BackendStatus banner; let the request keep failing normally.
      window.dispatchEvent(new CustomEvent('backend:offline'))
    }
    const data = err.response?.data
    const rawDetail = typeof data === 'object' && data && 'detail' in data ? data.detail : undefined
    let detail: string
    let code: string | undefined
    if (typeof rawDetail === 'object' && rawDetail) {
      detail = rawDetail.message ?? 'An unexpected error occurred'
      code = rawDetail.code
    } else {
      detail = String(
        rawDetail ??
          (typeof data === 'string' ? data : undefined) ??
          err.message ??
          'An unexpected error occurred'
      )
    }
    const apiError: ApiError = {
      detail,
      status: err.response?.status,
      code,
    }
    return Promise.reject(apiError)
  }
)
