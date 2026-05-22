import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../../contexts/AuthContext'

export function ProtectedRoute() {
  const { token } = useAuth()
  const location = useLocation()
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />
  return <Outlet />
}
