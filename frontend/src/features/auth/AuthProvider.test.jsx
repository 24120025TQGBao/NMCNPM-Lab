import { act, render, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './useAuth'

const mocks = vi.hoisted(() => ({
  callback: null,
  auth: {
    onAuthStateChange: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn(),
    signOut: vi.fn(), getSession: vi.fn(),
  },
  me: vi.fn(), unsubscribe: vi.fn(),
}))
vi.mock('../../lib/supabase', () => ({ supabase: { auth: mocks.auth } }))
vi.mock('../../lib/api', () => ({ me: { get: mocks.me } }))

let auth
function Probe() {
  const current = useAuth()
  useEffect(() => { auth = current }, [current])
  return <output>{JSON.stringify({ status: current.status, profile: current.profile, error: current.profileError, authenticated: current.isAuthenticated })}</output>
}
const session = id => ({ user: { id }, access_token: `test-token-${id}` })
const profile = id => ({ ma_nd: id, ten_hien_thi: `Member ${id}`, vai_tro: 'USER', trang_thai: 'ACTIVE' })
const mount = () => render(<AuthProvider><Probe /></AuthProvider>)
async function event(name, next) { await act(async () => { mocks.callback(name, next) }) }
function deferred() {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.me.mockReset()
  mocks.auth.onAuthStateChange.mockImplementation(callback => {
    mocks.callback = callback
    return { data: { subscription: { unsubscribe: mocks.unsubscribe } } }
  })
  mocks.auth.signInWithPassword.mockResolvedValue({ error: null })
  mocks.auth.signUp.mockResolvedValue({ data: { session: null }, error: null })
  mocks.auth.signOut.mockResolvedValue({ error: null })
  mocks.auth.getSession.mockResolvedValue({ data: { session: null } })
})

describe('Sprint 1 AuthProvider business rules', () => {
  it('restores an existing session and loads only its profile before becoming ready', async () => {
    const pending = deferred()
    mocks.me.mockReturnValue(pending.promise)
    mount()
    expect(auth.status).toBe('loading')
    await event('INITIAL_SESSION', session('A'))
    expect(auth.status).toBe('loading')
    await act(async () => { pending.resolve(profile('A')) })
    expect(auth.status).toBe('member')
    expect(auth.profile).toEqual(profile('A'))
    expect(mocks.me).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) })
  })

  it('does not load a profile for a guest session', async () => {
    mount()
    await event('INITIAL_SESSION', null)
    expect(auth.status).toBe('guest')
    expect(auth.isAuthenticated).toBe(false)
    expect(mocks.me).not.toHaveBeenCalled()
  })

  it('QĐ 5.6: a locked profile causes sign-out and a blocked state without exposing profile data', async () => {
    mocks.me.mockRejectedValue({ status: 403 })
    mount()
    await event('SIGNED_IN', session('locked'))
    await waitFor(() => expect(mocks.auth.signOut).toHaveBeenCalledTimes(1))
    await event('SIGNED_OUT', null)
    expect(auth.status).toBe('blocked')
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.profile).toBeNull()
    expect(screen.getByRole('status').textContent).not.toContain('Member locked')
  })

  it('permits a new active login after a previously locked session', async () => {
    mocks.me.mockRejectedValueOnce({ status: 403 }).mockResolvedValueOnce(profile('A'))
    mount()
    await event('SIGNED_IN', session('locked'))
    await waitFor(() => expect(auth.status).toBe('blocked'))
    await event('SIGNED_OUT', null)
    await event('SIGNED_IN', session('A'))
    await waitFor(() => expect(auth.profile).toEqual(profile('A')))
    expect(auth.status).toBe('member')
    expect(auth.isAuthenticated).toBe(true)
  })

  it('QĐ 5.3: signing out clears the visible profile and access to the old account', async () => {
    mocks.me.mockResolvedValue(profile('A'))
    mount()
    await event('SIGNED_IN', session('A'))
    await waitFor(() => expect(auth.profile).toEqual(profile('A')))
    await act(async () => { await auth.signOut() })
    await event('SIGNED_OUT', null)
    expect(auth.status).toBe('guest')
    expect(auth.user).toBeNull()
    expect(auth.profile).toBeNull()
    expect(screen.getByRole('status').textContent).not.toContain('Member A')
  })

  it('QĐ 5.3: a delayed old profile cannot replace the newly signed-in account', async () => {
    const oldProfile = deferred()
    mocks.me.mockReturnValueOnce(oldProfile.promise).mockResolvedValueOnce(profile('B'))
    mount()
    await event('SIGNED_IN', session('A'))
    const oldSignal = mocks.me.mock.calls[0][0].signal
    await event('SIGNED_OUT', null)
    await event('SIGNED_IN', session('B'))
    await waitFor(() => expect(auth.profile).toEqual(profile('B')))
    expect(oldSignal.aborted).toBe(true)
    await act(async () => { oldProfile.resolve(profile('A')) })
    expect(auth.profile).toEqual(profile('B'))
    expect(auth.status).toBe('member')
  })

  it('revalidates the same account on a new login instead of reusing its pre-logout profile', async () => {
    const recheck = deferred()
    mocks.me.mockResolvedValueOnce(profile('A')).mockReturnValueOnce(recheck.promise)
    mount()
    await event('SIGNED_IN', session('A'))
    await waitFor(() => expect(auth.profile).toEqual(profile('A')))
    await event('SIGNED_OUT', null)
    await event('SIGNED_IN', session('A'))
    expect(auth.status).toBe('loading')
    expect(auth.profile).toBeNull()
    await act(async () => { recheck.resolve(profile('A')) })
    expect(auth.status).toBe('member')
  })

  it.each([[409, 'missing'], [500, 'failed']])('reports profile failure %s without retaining another profile', async (status, error) => {
    mocks.me.mockRejectedValue({ status })
    mount()
    await event('SIGNED_IN', session('A'))
    await waitFor(() => expect(auth.profileError).toBe(error))
    expect(auth.profile).toBeNull()
  })

  it('QĐ 5.1/5.5: registration sends display name but never grants a role from client input', async () => {
    mount()
    const password = 'x'.repeat(12)
    let result
    await act(async () => {
      result = await auth.signUp({ email: 'qa@example.test', password, displayName: 'QA', role: 'ADMIN' })
    })
    expect(mocks.auth.signUp).toHaveBeenCalledWith({
      email: 'qa@example.test', password,
      options: { data: { display_name: 'QA' }, emailRedirectTo: window.location.origin },
    })
    expect(result).toEqual({ needsEmailConfirmation: true })
  })

  it('propagates duplicate email rejection rather than claiming successful registration', async () => {
    const error = { code: 'user_already_exists' }
    mocks.auth.signUp.mockResolvedValue({ data: null, error })
    mount()
    await expect(auth.signUp({ email: 'qa@example.test', password: 'x'.repeat(12), displayName: 'QA' })).rejects.toEqual(error)
  })

  it('supports signup without confirmation when Supabase supplies a session', async () => {
    mocks.auth.signUp.mockResolvedValue({ data: { session: session('A') }, error: null })
    mount()
    await expect(auth.signUp({ email: 'qa@example.test', password: 'x'.repeat(12), displayName: 'QA' }))
      .resolves.toEqual({ needsEmailConfirmation: false })
  })

  it('reads the latest token from Supabase instead of keeping an expired copy', async () => {
    mount()
    mocks.auth.getSession.mockResolvedValueOnce({ data: { session: { access_token: 'refreshed-token' } } })
    await expect(auth.getAccessToken()).resolves.toBe('refreshed-token')
    await expect(auth.getAccessToken()).resolves.toBeNull()
  })

  it('unsubscribes from auth events and aborts the profile request when unmounted', async () => {
    mocks.me.mockReturnValue(new Promise(() => {}))
    const view = mount()
    await event('SIGNED_IN', session('A'))
    const signal = mocks.me.mock.calls[0][0].signal
    view.unmount()
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1)
    expect(signal.aborted).toBe(true)
  })
})
