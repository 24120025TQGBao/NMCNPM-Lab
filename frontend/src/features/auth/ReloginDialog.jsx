import { useEffect, useRef, useState } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/TextField'
import { vi } from '../../i18n/vi'
import { mapAuthError } from './authErrors'
import { validateAuth } from './validation'
import { useAuth } from './useAuth'

// Hộp thoại đăng nhập lại ngay trên trang (khi API trả 401) để không mất dữ liệu đang nhập.
// onSuccess chạy sau khi đăng nhập xong; onCancel khi người dùng đóng hộp thoại.
export function ReloginDialog({ onSuccess, onCancel }) {
  const { signIn } = useAuth()
  const formRef = useRef(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    const previous = document.activeElement
    formRef.current?.elements.email?.focus()
    return () => previous?.focus?.()
  }, [])

  async function onSubmit(event) {
    event.preventDefault()
    if (submitting) return
    setError('')
    const form = new FormData(event.currentTarget)
    const values = { email: form.get('email'), password: form.get('password') }
    const errors = validateAuth({ mode: 'login', ...values })
    setFieldErrors(errors)
    const firstInvalid = ['email', 'password'].find((key) => errors[key])
    if (firstInvalid) {
      formRef.current?.elements[firstInvalid]?.focus()
      return
    }
    setSubmitting(true)
    try {
      await signIn({ email: values.email.trim(), password: values.password })
    } catch (err) {
      setError(mapAuthError(err, 'login'))
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" onKeyDown={(e) => { if (e.key === 'Escape' && !submitting) onCancel() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="relogin-title" className="max-h-full w-full max-w-md overflow-y-auto rounded-card bg-surface p-6 shadow-card">
        <h2 id="relogin-title" className="font-serif text-2xl font-semibold">{vi.relogin.title}</h2>
        <p className="mt-2 text-ink-muted">{vi.relogin.body}</p>
        <form ref={formRef} noValidate onSubmit={onSubmit} className="mt-4 space-y-4">
          <TextField label={vi.auth.email} name="email" type="email" autoComplete="email" error={fieldErrors.email} />
          <TextField label={vi.auth.password} name="password" type="password" autoComplete="current-password" error={fieldErrors.password} />
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={submitting}>{submitting ? vi.auth.busy : vi.relogin.submit}</Button>
            <Button variant="secondary" onClick={onCancel} disabled={submitting}>{vi.relogin.cancel}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
