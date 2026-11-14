import { useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { posts as postsApi } from '../../lib/api'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { TextArea } from '../../components/ui/TextArea'
import { TextField } from '../../components/ui/TextField'
import { ReloginDialog } from '../auth/ReloginDialog'
import { DishPicker } from './DishPicker'
import { toPostInput, validatePostForm } from './postFormValidation'
import { vi } from '../../i18n/vi'

const t = vi.createPost
const MAX_ROWS = 50

let nextKey = 0
const newIngredient = () => ({ key: ++nextKey, name: '', quantity: '', unit: '', toTaste: false })
const newStep = () => ({ key: ++nextKey, content: '' })

// FE05: form đăng bài công thức. Chỉ dành cho người đã đăng nhập (RequireAuth ở router).
export default function CreatePostPage() {
  const navigate = useNavigate()
  const formRef = useRef(null)
  const submittedRef = useRef(false)
  const [dish, setDish] = useState(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [ingredients, setIngredients] = useState(() => [newIngredient()])
  const [steps, setSteps] = useState(() => [newStep()])
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [relogin, setRelogin] = useState(false)
  const submitControllerRef = useRef(null)

  const form = { dishId: dish?.id ?? null, title, content, ingredients, steps }
  const dirty = Boolean(dish) || title.trim() !== '' || content.trim() !== '' ||
    ingredients.some((r) => r.name.trim() || r.quantity.trim() || r.unit.trim()) ||
    steps.some((r) => r.content.trim())

  // Cảnh báo khi rời trang mà còn dữ liệu chưa gửi (đổi route trong ứng dụng và đóng/tải lại tab).
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    dirty && !submittedRef.current && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm(t.leaveConfirm)) blocker.proceed()
    else blocker.reset()
  }, [blocker])
  useEffect(() => {
    if (!dirty) return
    const handler = (event) => { if (!submittedRef.current) event.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])
  useEffect(() => () => submitControllerRef.current?.abort(), [])

  const clearError = (...keys) => setErrors((prev) => {
    if (!keys.some((k) => k in prev)) return prev
    const next = { ...prev }
    for (const k of keys) delete next[k]
    return next
  })

  function focusFirstError(errs) {
    const el = formRef.current?.querySelector('[aria-invalid="true"]')
    if (el) el.focus()
    else if (Object.keys(errs).length) formRef.current?.querySelector('[data-form-error]')?.focus()
  }

  async function submit() {
    if (submitting) return
    setFormError('')
    const clientErrors = validatePostForm(form)
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors)
      setFormError(t.formInvalid)
      // Đợi giao diện gắn aria-invalid rồi mới focus.
      setTimeout(() => focusFirstError(clientErrors), 0)
      return
    }
    setErrors({})
    setSubmitting(true)
    const controller = new AbortController()
    submitControllerRef.current = controller
    try {
      const post = await postsApi.create(toPostInput(form), { signal: controller.signal })
      submittedRef.current = true
      navigate(`/posts/${post.id}`, { state: { posted: true } })
    } catch (err) {
      if (controller.signal.aborted) return
      if (err.status === 401) {
        setRelogin(true)
      } else if (err.status === 400) {
        const fields = err.fields ?? {}
        setErrors(fields)
        setFormError(Object.keys(fields).length ? t.formInvalid : err.message)
        setTimeout(() => focusFirstError(fields), 0)
      } else {
        // 5xx, mất mạng, 403...: giữ nguyên toàn bộ dữ liệu.
        setFormError(err.message || t.submitFailed)
      }
    } finally {
      if (!controller.signal.aborted) setSubmitting(false)
    }
  }

  const update = (setter, key, patch) => setter((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  return (
    <div className="max-w-3xl">
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <form ref={formRef} noValidate onSubmit={(e) => { e.preventDefault(); submit() }} className="space-y-8">
        <DishPicker value={dish} onChange={(d) => { setDish(d); clearError('dish_id') }} error={errors.dish_id} />
        <TextField
          label={t.postTitle}
          value={title}
          maxLength={150}
          onChange={(e) => { setTitle(e.target.value); clearError('title') }}
          error={errors.title}
        />
        <TextArea
          label={t.postContent}
          hint={t.postContentHint}
          value={content}
          rows={4}
          onChange={(e) => { setContent(e.target.value); clearError('content') }}
          error={errors.content}
        />

        <fieldset className="space-y-4">
          <legend className="font-serif text-2xl font-semibold">{t.ingredients}</legend>
          {errors.ingredients && <p role="alert" data-form-error tabIndex={-1} className="text-sm text-danger-fg">{errors.ingredients}</p>}
          {ingredients.map((row, i) => {
            const n = i + 1
            return (
              <div key={row.key} className="space-y-3 rounded-card border border-border bg-white p-4">
                <TextField
                  label={t.ingredientName(n)}
                  value={row.name}
                  onChange={(e) => { update(setIngredients, row.key, { name: e.target.value }); clearError(`ingredients[${i}].name`) }}
                  error={errors[`ingredients[${i}].name`]}
                />
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    label={t.ingredientQuantity(n)}
                    inputMode="decimal"
                    value={row.toTaste ? '' : row.quantity}
                    disabled={row.toTaste}
                    onChange={(e) => { update(setIngredients, row.key, { quantity: e.target.value }); clearError(`ingredients[${i}].quantity`) }}
                    error={errors[`ingredients[${i}].quantity`]}
                  />
                  <TextField
                    label={t.ingredientUnit(n)}
                    value={row.unit}
                    onChange={(e) => { update(setIngredients, row.key, { unit: e.target.value }); clearError(`ingredients[${i}].unit`) }}
                    error={errors[`ingredients[${i}].unit`]}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex min-h-11 items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-5"
                      aria-label={t.toTasteFor(n)}
                      checked={row.toTaste}
                      onChange={(e) => { update(setIngredients, row.key, { toTaste: e.target.checked }); clearError(`ingredients[${i}].quantity`) }}
                    />
                    <span aria-hidden="true">{t.toTaste}</span>
                  </label>
                  <Button
                    variant="secondary"
                    aria-label={t.removeIngredient(n)}
                    disabled={ingredients.length <= 1}
                    onClick={() => { setIngredients((rows) => rows.filter((r) => r.key !== row.key)); setErrors({}) }}
                  >
                    <Trash2 aria-hidden="true" size={18} strokeWidth={1.5} />
                  </Button>
                </div>
              </div>
            )
          })}
          <Button variant="secondary" disabled={ingredients.length >= MAX_ROWS} onClick={() => { setIngredients((rows) => [...rows, newIngredient()]); clearError('ingredients') }}>
            <Plus aria-hidden="true" size={18} strokeWidth={1.5} />
            {t.addIngredient}
          </Button>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="font-serif text-2xl font-semibold">{t.steps}</legend>
          {errors.steps && <p role="alert" data-form-error tabIndex={-1} className="text-sm text-danger-fg">{errors.steps}</p>}
          {steps.map((row, i) => {
            const n = i + 1
            return (
              <div key={row.key} className="flex items-start gap-3">
                <TextArea
                  className="min-w-0 flex-1"
                  label={t.stepContent(n)}
                  value={row.content}
                  onChange={(e) => { update(setSteps, row.key, { content: e.target.value }); clearError(`steps[${i}].content`) }}
                  error={errors[`steps[${i}].content`]}
                />
                <Button
                  variant="secondary"
                  className="mt-6"
                  aria-label={t.removeStep(n)}
                  disabled={steps.length <= 1}
                  onClick={() => { setSteps((rows) => rows.filter((r) => r.key !== row.key)); setErrors({}) }}
                >
                  <Trash2 aria-hidden="true" size={18} strokeWidth={1.5} />
                </Button>
              </div>
            )
          })}
          <Button variant="secondary" disabled={steps.length >= MAX_ROWS} onClick={() => { setSteps((rows) => [...rows, newStep()]); clearError('steps') }}>
            <Plus aria-hidden="true" size={18} strokeWidth={1.5} />
            {t.addStep}
          </Button>
        </fieldset>

        {formError && <Alert tone="error">{formError}</Alert>}
        <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
          {submitting ? t.submitting : t.submit}
        </Button>
      </form>
      {relogin && (
        <ReloginDialog
          onCancel={() => setRelogin(false)}
          onSuccess={() => { setRelogin(false); submit() }}
        />
      )}
    </div>
  )
}
