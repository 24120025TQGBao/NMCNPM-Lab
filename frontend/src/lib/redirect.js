// Chỉ cho phép chuyển hướng tới đường dẫn nội bộ, tránh open redirect.
export function safeRedirect(value, fallback = '/') {
  if (typeof value !== 'string' || !value.startsWith('/')) return fallback
  if (value.startsWith('//') || value.includes('\\') || [...value].some((c) => c.charCodeAt(0) < 32)) return fallback
  return value
}

export function withRedirect(path, redirectTo) {
  const target = safeRedirect(redirectTo, '')
  return target ? `${path}?redirectTo=${encodeURIComponent(target)}` : path
}
