import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spinner } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { withRedirect } from '../../lib/redirect'
import { vi } from '../../i18n/vi'
import { useAuth } from './useAuth'

export function RequireRole({ role }) {
  const { status, profile } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <Spinner label={vi.auth.checkingSession} />
  if (status !== 'member') return <Navigate to={withRedirect('/login', location.pathname + location.search)} replace />
  if (profile?.vai_tro !== role) {
    return (
      <EmptyState title={vi.auth.forbiddenTitle} action={<Button to="/">{vi.notFound.home}</Button>}>
        {vi.auth.forbiddenBody}
      </EmptyState>
    )
  }
  return <Outlet />
}
