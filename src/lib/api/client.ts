/**
 * Axios client + auth/error interceptors. Every domain module imports `client`
 * from here so headers, base URL, and error normalization stay consistent.
 */

import axios, { type AxiosError } from 'axios'

import { API_URL } from '../config'

export interface ApiError {
  detail: string
  status?: number
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
  (err: AxiosError<{ detail?: string } | string>) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token')
      onUnauthorized()
    }
    if (!err.response) {
      // Surface to BackendStatus banner; let the request keep failing normally.
      window.dispatchEvent(new CustomEvent('backend:offline'))
    }
    const data = err.response?.data
    const detail =
      (typeof data === 'object' && data && 'detail' in data ? data.detail : undefined) ??
      (typeof data === 'string' ? data : undefined) ??
      err.message ??
      'An unexpected error occurred'
    const apiError: ApiError = {
      detail: String(detail),
      status: err.response?.status,
    }
    return Promise.reject(apiError)
  }
)
