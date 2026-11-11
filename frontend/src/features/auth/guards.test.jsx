import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { RequireAuth } from './RequireAuth'
import { RequireRole } from './RequireRole'
import { renderRoutes } from '../../test/renderWithAuth'

const login = { path: '/login', element: <p>trang đăng nhập</p> }

function authRoutes() {
  return [login, { element: <RequireAuth />, children: [{ path: '/posts/new', element: <p>form đăng bài</p> }] }]
}
function adminRoutes() {
  return [login, { element: <RequireRole role="ADMIN" />, children: [{ path: '/admin/reports', element: <p>kiểm duyệt</p> }] }]
}

describe('RequireAuth', () => {
  it('redirects guest to login with redirectTo', async () => {
    const router = renderRoutes(authRoutes(), { authValue: { status: 'guest' }, initialEntry: '/posts/new' })
    expect(await screen.findByText('trang đăng nhập')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?redirectTo=%2Fposts%2Fnew')
  })
  it('redirects blocked user to login', async () => {
    renderRoutes(authRoutes(), { authValue: { status: 'blocked' }, initialEntry: '/posts/new' })
    expect(await screen.findByText('trang đăng nhập')).toBeInTheDocument()
  })
  it('shows spinner while loading', () => {
    renderRoutes(authRoutes(), { authValue: { status: 'loading' }, initialEntry: '/posts/new' })
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('trang đăng nhập')).not.toBeInTheDocument()
  })
  it('renders page for member', () => {
    renderRoutes(authRoutes(), { authValue: { status: 'member' }, initialEntry: '/posts/new' })
    expect(screen.getByText('form đăng bài')).toBeInTheDocument()
  })
})

describe('RequireRole', () => {
  it('blocks regular member', () => {
    renderRoutes(adminRoutes(), { authValue: { status: 'member', profile: { vai_tro: 'USER' } }, initialEntry: '/admin/reports' })
    expect(screen.queryByText('kiểm duyệt')).not.toBeInTheDocument()
    expect(screen.getByText('Bạn không có quyền truy cập')).toBeInTheDocument()
  })
  it('blocks member without profile', () => {
    renderRoutes(adminRoutes(), { authValue: { status: 'member', profile: null }, initialEntry: '/admin/reports' })
    expect(screen.queryByText('kiểm duyệt')).not.toBeInTheDocument()
  })
  it('allows admin', () => {
    renderRoutes(adminRoutes(), { authValue: { status: 'member', profile: { vai_tro: 'ADMIN' } }, initialEntry: '/admin/reports' })
    expect(screen.getByText('kiểm duyệt')).toBeInTheDocument()
  })
  it('sends guest to login', async () => {
    renderRoutes(adminRoutes(), { authValue: { status: 'guest' }, initialEntry: '/admin/reports' })
    expect(await screen.findByText('trang đăng nhập')).toBeInTheDocument()
  })
})
