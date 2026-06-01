import { useQuery } from '@tanstack/react-query'

import { useAuth } from '../contexts/AuthContext'
import { getMe } from '../lib/api/auth'
import { qk } from '../lib/queryKeys'

/** Wraps `/auth/me`. Disabled when no token so we don't fire 401s on /login. */
export function useMe() {
  const { token } = useAuth()
  return useQuery({
    queryKey: qk.auth.me,
    queryFn: getMe,
    enabled: !!token,
    staleTime: Infinity,
  })
}
