import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/TextField'
import { PageHeader } from '../../components/ui/PageHeader'
import { MAX_DISPLAY_NAME_LENGTH, MIN_PASSWORD_LENGTH } from '../../lib/config'
import { vi } from '../../i18n/vi'
import { useAuth } from './useAuth'

// Biểu mẫu tạm của FE01. FE02 sẽ thay bằng kiểm tra từng ô và lỗi tiếng Việt chi tiết.
export function AuthForm({ mode }) {
  const isRegister = mode === 'register'
  const { configured, isAuthenticated, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  if (isAuthenticated) return <Navigate to="/" replace />

  async function onSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    const fields = new FormData(event.currentTarget)
    const email = fields.get('email').trim()
    const password = fields.get('password')
    try {
      if (isRegister) {
        const result = await signUp({ email, password, displayName: fields.get('name').trim() })
        if (result.needsEmailConfirmation) setNotice(vi.auth.checkEmail)
        else navigate('/', { replace: true })
      } else {
        await signIn({ email, password })
        navigate('/', { replace: true })
      }
    } catch {
      setError(vi.auth.failed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title={isRegister ? vi.auth.registerTitle : vi.auth.loginTitle} />
      {!configured && <Alert tone="warning" className="mb-4">{vi.auth.notConfigured}</Alert>}
      <form onSubmit={onSubmit} className="space-y-4 rounded-card border border-border bg-surface p-7 shadow-card">
        {isRegister && (
          <TextField label={vi.auth.displayName} name="name" autoComplete="nickname" required maxLength={MAX_DISPLAY_NAME_LENGTH} />
        )}
        <TextField label={vi.auth.email} name="email" type="email" autoComplete="email" required />
        <TextField
          label={vi.auth.password}
          name="password"
          type="password"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
        <Button type="submit" disabled={busy || !configured} className="w-full">
          {busy ? vi.auth.busy : isRegister ? vi.auth.submitRegister : vi.auth.submitLogin}
        </Button>
        {notice && <Alert tone="success">{notice}</Alert>}
        {error && <Alert tone="error">{error}</Alert>}
      </form>
      <p className="mt-4 text-center">
        <Link to={isRegister ? '/login' : '/register'} className="font-semibold text-jungle-green underline">
          {isRegister ? vi.auth.toLogin : vi.auth.toRegister}
        </Link>
      </p>
    </div>
  )
}
