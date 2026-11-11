const tones = {
  success: 'bg-ok-bg text-ok-fg',
  warning: 'bg-warn-bg text-warn-fg',
  error: 'bg-danger-bg text-danger-fg',
  info: 'bg-neutral-bg text-ink',
}

export function Alert({ tone = 'info', children, className = '' }) {
  const live = tone === 'error' ? { role: 'alert' } : { role: 'status' }
  return <div {...live} className={`rounded-control px-4 py-3 text-base ${tones[tone]} ${className}`}>{children}</div>
}
