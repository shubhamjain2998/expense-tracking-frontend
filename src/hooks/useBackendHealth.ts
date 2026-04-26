import axios from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
export const RETRY_SECONDS = 12

export function useBackendHealth() {
  const [status, setStatus] = useState<'online' | 'offline' | 'recovered'>('online')
  const [retryIn, setRetryIn] = useState(0)
  const offlineRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const cdRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  // Ref so the scheduled retry always calls the latest ping without a circular useCallback dep
  const pingRef = useRef<(() => Promise<void>) | undefined>(undefined)

  const startCountdown = useCallback(() => {
    clearInterval(cdRef.current)
    setRetryIn(RETRY_SECONDS)
    cdRef.current = setInterval(() => {
      setRetryIn((s) => {
        if (s <= 1) {
          clearInterval(cdRef.current)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }, [])

  const ping = useCallback(async () => {
    try {
      await axios.get(BASE_URL + '/', { timeout: 5000 }).catch((e) => {
        // HTTP errors (4xx/5xx) still mean the server is alive — only rethrow network errors
        if (!e.response) throw e
      })
      if (offlineRef.current) {
        offlineRef.current = false
        clearInterval(cdRef.current)
        setRetryIn(0)
        setStatus('recovered')
        setTimeout(() => setStatus('online'), 2600)
      }
    } catch {
      offlineRef.current = true
      setStatus('offline')
      startCountdown()
      timerRef.current = setTimeout(() => pingRef.current?.(), RETRY_SECONDS * 1000)
    }
  }, [startCountdown])

  // Keep the ref pointing at the latest ping so scheduled retries don't go stale
  useEffect(() => {
    pingRef.current = ping
  }, [ping])

  useEffect(() => {
    const goOffline = () => {
      if (offlineRef.current) return
      offlineRef.current = true
      clearTimeout(timerRef.current)
      clearInterval(cdRef.current)
      setStatus('offline')
      startCountdown()
      timerRef.current = setTimeout(() => pingRef.current?.(), RETRY_SECONDS * 1000)
    }
    window.addEventListener('backend:offline', goOffline)
    return () => {
      window.removeEventListener('backend:offline', goOffline)
      clearTimeout(timerRef.current)
      clearInterval(cdRef.current)
    }
  }, [ping, startCountdown])

  const retryNow = useCallback(() => {
    clearTimeout(timerRef.current)
    clearInterval(cdRef.current)
    setRetryIn(0)
    ping()
  }, [ping])

  return { status, retryIn, retryNow }
}
