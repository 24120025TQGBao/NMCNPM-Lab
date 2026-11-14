import { useEffect, useId, useState } from 'react'
import { dishes as dishesApi } from '../../lib/api'
import { TextField } from '../../components/ui/TextField'
import { vi } from '../../i18n/vi'

// Tìm món qua GET /api/dishes?search= (backend BE05 đã hỗ trợ) rồi chọn trong danh sách.
// value: món đang chọn { id, name } hoặc null; giữ nguyên dù kết quả tìm kiếm thay đổi.
export function DishPicker({ value, onChange, error }) {
  const selectId = useId()
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState([])
  const [state, setState] = useState('loading') // loading | ready | error

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      dishesApi.list({ search: query.trim() || undefined, limit: 20, signal: controller.signal })
        .then((result) => { setOptions(result.data); setState('ready') })
        .catch(() => { if (!controller.signal.aborted) setState('error') })
    }, query ? 300 : 0)
    return () => { clearTimeout(timer); controller.abort() }
  }, [query])

  const list = value && !options.some((d) => d.id === value.id) ? [value, ...options] : options
  const status = state === 'loading' ? vi.createPost.dishLoading
    : state === 'error' ? vi.createPost.dishLoadFailed
    : options.length === 0 ? vi.createPost.dishNoResult : ''

  return (
    <div className="space-y-3">
      <TextField
        label={vi.createPost.dishSearch}
        hint={vi.createPost.dishSearchHint}
        type="search"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setState('loading') }}
      />
      <div>
        <label htmlFor={selectId} className="mb-1 block text-sm font-semibold">{vi.createPost.dishSelect}</label>
        <select
          id={selectId}
          value={value?.id ?? ''}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${selectId}-error` : undefined}
          onChange={(e) => onChange(list.find((d) => String(d.id) === e.target.value) ?? null)}
          className="min-h-14 w-full rounded-control border border-border bg-white px-4 text-base"
        >
          <option value="">{vi.createPost.dishPlaceholder}</option>
          {list.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <p role="status" className="mt-1 text-sm text-ink-muted">{status}</p>
        {error && <p id={`${selectId}-error`} role="alert" className="mt-1 text-sm text-danger-fg">{error}</p>}
      </div>
    </div>
  )
}
