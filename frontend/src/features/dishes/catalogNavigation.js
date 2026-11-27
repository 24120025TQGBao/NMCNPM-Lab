export function searchReturnPath(value) {
  return typeof value === 'string' && /^\/search(?:\?[^#]*)?$/.test(value) ? value : '/search'
}

export function positivePage(value) {
  const page = Number(value)
  return Number.isSafeInteger(page) && page > 0 ? page : 1
}
