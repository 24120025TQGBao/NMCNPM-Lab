import { useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/TextField'
import { PageHeader } from '../../components/ui/PageHeader'
import { MAX_DISPLAY_NAME_LENGTH } from '../../lib/config'
import { safeRedirect, withRedirect } from '../../lib/redirect'
import { vi } from '../../i18n/vi'
import { mapAuthError } from './authErrors'
import { validateAuth } from './validation'
import { useAuth } from './useAuth'

export function AuthForm({ mode }) {
  const isRegister = mode === 'register'
  const { configured, status, session, signIn, signUp } = useAuth()
  const [params] = useSearchParams()
  const redirectTo = safeRedirect(params.get('redirectTo'))
  const formRef = useRef(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [confirmEmail, setConfirmEmail] = useState(false)

  // Chỉ chuyển trang khi đã có hồ sơ (status member), để thấy thông báo nếu tài khoản bị khóa.
  const busy = submitting || (Boolean(session) && status === 'loading')
  if (status === 'member' && !confirmEmail) return <Navigate to={redirectTo} replace />

  async function onSubmit(event) {
    event.preventDefault()
    if (busy) return
    setError('')
    const form = new FormData(event.currentTarget)
    const values = { mode, name: form.get('name') ?? '', email: form.get('email'), password: form.get('password') }
    const errors = validateAuth(values)
    setFieldErrors(errors)
    const firstInvalid = ['name', 'email', 'password'].find((key) => errors[key])
    if (firstInvalid) {
      formRef.current?.elements[firstInvalid]?.focus()
      return
    }
    setSubmitting(true)
    try {
      const email = values.email.trim()
      if (isRegister) {
        const result = await signUp({ email, password: values.password, displayName: values.name.trim() })
        if (result.needsEmailConfirmation) setConfirmEmail(true)
      } else {
        await signIn({ email, password: values.password })
      }
    } catch (err) {
      setError(mapAuthError(err, mode))
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmEmail) {
    return (
      <div className="mx-auto max-w-md">
        <PageHeader title={vi.auth.checkEmailTitle} />
        <Alert tone="success">{vi.auth.checkEmail}</Alert>
        <p className="mt-4 text-center">
          <Link to={withRedirect('/login', redirectTo)} className="font-semibold text-jungle-green underline">
            {vi.auth.toLoginAfterConfirm}
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title={isRegister ? vi.auth.registerTitle : vi.auth.loginTitle} />
      {!configured && <Alert tone="warning" className="mb-4">{vi.auth.notConfigured}</Alert>}
      {status === 'blocked' && <Alert tone="error" className="mb-4">{vi.auth.blocked}</Alert>}
      <form ref={formRef} noValidate onSubmit={onSubmit} className="space-y-4 rounded-card border border-border bg-surface p-7 shadow-card">
        {isRegister && (
          <TextField label={vi.auth.displayName} name="name" autoComplete="nickname" maxLength={MAX_DISPLAY_NAME_LENGTH} error={fieldErrors.name} />
        )}
        <TextField label={vi.auth.email} name="email" type="email" autoComplete="email" error={fieldErrors.email} />
        <TextField
          label={vi.auth.password}
          name="password"
          type="password"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          error={fieldErrors.password}
        />
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" disabled={busy || !configured} className="w-full">
          {busy ? vi.auth.busy : isRegister ? vi.auth.submitRegister : vi.auth.submitLogin}
        </Button>
      </form>
      <p className="mt-4 text-center">
        <Link to={withRedirect(isRegister ? '/login' : '/register', redirectTo)} className="font-semibold text-jungle-green underline">
          {isRegister ? vi.auth.toLogin : vi.auth.toRegister}
        </Link>
      </p>
    </div>
  )
}
