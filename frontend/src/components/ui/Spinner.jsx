export function Spinner({ label }) {
  return (
    <div role="status" className="flex items-center gap-3 py-6 text-ink-muted">
      <span aria-hidden="true" className="size-5 animate-spin rounded-full border-2 border-border border-t-jungle-green" />
      <span>{label}</span>
    </div>
  )
}
