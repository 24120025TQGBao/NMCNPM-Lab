import { useId } from 'react'

export function TextArea({ label, error, hint, className = '', ...props }) {
  const id = useId()
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">{label}</label>
      <textarea
        id={id}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="w-full rounded-control border border-border bg-white px-4 py-3 text-base"
        {...props}
      />
      {hint && <p id={`${id}-hint`} className="mt-1 text-sm text-ink-muted">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-danger-fg">{error}</p>}
    </div>
  )
}
