import { useEffect, useState } from 'react'
import { dishes as dishesApi } from '../../lib/api'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { Spinner } from '../../components/ui/Spinner'
import { vi } from '../../i18n/vi'

// Giữ chức năng danh sách món hiện có (GET /api/dishes). FE09 sẽ mở rộng tìm kiếm.
export default function DishListPage() {
  const [dishes, setDishes] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    dishesApi.list({ signal: controller.signal })
      .then((result) => setDishes(result.data))
      .catch((err) => { if (!controller.signal.aborted) setError(err.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [reload])

  function retry() {
    setLoading(true)
    setError('')
    setReload((n) => n + 1)
  }

  let content
  if (loading) content = <Spinner label={vi.dishes.loading} />
  else if (error) {
    content = (
      <div className="space-y-3">
        <Alert tone="error">{error}</Alert>
        <Button variant="secondary" onClick={retry}>{vi.dishes.retry}</Button>
      </div>
    )
  } else if (!dishes.length) content = <EmptyState>{vi.dishes.empty}</EmptyState>
  else {
    content = (
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {dishes.map((dish) => (
          <li key={dish.id} className="rounded-card border border-border bg-white p-5">
            <h2 className="font-serif text-2xl leading-[30px] font-semibold">{dish.name}</h2>
            <p className="mt-2 text-ink-muted">{dish.description || vi.dishes.noDescription}</p>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <>
      <PageHeader title={vi.dishes.title} subtitle={vi.dishes.subtitle} />
      {content}
    </>
  )
}
