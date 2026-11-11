import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { AuthContext } from './AuthContext'
import { AuthForm } from './AuthForm'
import { vi as text } from '../../i18n/vi'

function setup(mode, authOverrides = {}, entry = '/register') {
  const auth = { configured: true, status: 'guest', session: null, signIn: vi.fn(), signUp: vi.fn(), ...authOverrides }
  const router = createMemoryRouter(
    [{ path: '/register', element: <AuthForm mode={mode} /> }, { path: '/login', element: <AuthForm mode="login" /> }, { path: '/', element: <p>home</p> }],
    { initialEntries: [entry] },
  )
  render(<AuthContext.Provider value={auth}><RouterProvider router={router} /></AuthContext.Provider>)
  return auth
}

describe('AuthForm', () => {
  it('shows field errors in Vietnamese and does not call signUp', async () => {
    const auth = setup('register')
    await userEvent.type(screen.getByLabelText(text.auth.displayName), '   ')
    await userEvent.type(screen.getByLabelText(text.auth.email), 'abc')
    await userEvent.type(screen.getByLabelText(text.auth.password), '123')
    await userEvent.click(screen.getByRole('button', { name: text.auth.submitRegister }))
    expect(screen.getByText(text.auth.validation.nameRequired)).toBeInTheDocument()
    expect(screen.getByText(text.auth.validation.emailInvalid)).toBeInTheDocument()
    expect(screen.getByText(text.auth.validation.passwordShort(6))).toBeInTheDocument()
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it('maps a sign-in error', async () => {
    const signIn = vi.fn().mockRejectedValue({ code: 'invalid_credentials' })
    setup('login', { signIn }, '/login')
    await userEvent.type(screen.getByLabelText(text.auth.email), 'a@b.co')
    await userEvent.type(screen.getByLabelText(text.auth.password), 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: text.auth.submitLogin }))
    expect(await screen.findByText(text.auth.errors.invalidCredentials)).toBeInTheDocument()
  })

  it('shows check-email screen when signUp returns no session', async () => {
    const signUp = vi.fn().mockResolvedValue({ needsEmailConfirmation: true })
    setup('register', { signUp })
    await userEvent.type(screen.getByLabelText(text.auth.displayName), 'Lan')
    await userEvent.type(screen.getByLabelText(text.auth.email), 'a@b.co')
    await userEvent.type(screen.getByLabelText(text.auth.password), '123456')
    await userEvent.click(screen.getByRole('button', { name: text.auth.submitRegister }))
    expect(await screen.findByText(text.auth.checkEmailTitle)).toBeInTheDocument()
  })

  it('shows blocked notice on login page', () => {
    setup('login', { status: 'blocked' }, '/login')
    expect(screen.getByText(text.auth.blocked)).toBeInTheDocument()
  })

  it('redirects member to redirectTo, ignoring external URLs', () => {
    setup('login', { status: 'member' }, '/login?redirectTo=https%3A%2F%2Fevil.com')
    expect(screen.getByText('home')).toBeInTheDocument()
  })
})
