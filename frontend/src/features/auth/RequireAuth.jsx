import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spinner } from '../../components/ui/Spinner'
import { withRedirect } from '../../lib/redirect'
import { vi } from '../../i18n/vi'
import { useAuth } from './useAuth'

// Giao diện chỉ chặn để tiện cho người dùng; backend vẫn kiểm tra quyền thật.
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <Spinner label={vi.auth.checkingSession} />
  if (status !== 'member') return <Navigate to={withRedirect('/login', location.pathname + location.search)} replace />
  return <Outlet />
}
