export function EmptyState({ title, children, action }) {
  return (
    <div className="rounded-card border border-border bg-surface px-6 py-10 text-center">
      {title && <h2 className="font-serif text-2xl font-medium">{title}</h2>}
      {children && <p className="mx-auto mt-2 max-w-prose text-ink-muted">{children}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  )
}
