import { useCallback } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { ChefHat, MapPin } from 'lucide-react'
import { dishes } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { CatalogError, DishImage } from '../features/dishes/CatalogUI'
import { searchReturnPath } from '../features/dishes/catalogNavigation'
import { useCatalogResource } from '../features/dishes/useCatalogResource'

export default function DishDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const searchReturnTo = searchReturnPath(location.state?.searchReturnTo)
  const load = useCallback((signal) => dishes.get(id, { signal }), [id])
  const { data: dish, loading, error, retry } = useCatalogResource(load)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="secondary" to={searchReturnTo}>Quay lại tìm món</Button>
      {loading ? <Spinner label="Đang tải món ăn…" /> : error || !dish ? (
        <CatalogError message={error?.status === 404 || !error ? 'Món ăn không còn tồn tại hoặc không còn khả dụng.' : 'Không tải được món ăn. Vui lòng thử lại.'}
          retry={error?.status === 404 ? undefined : retry} />
      ) : (
        <>
          <div className="grid overflow-hidden rounded-card border border-border md:grid-cols-2">
            <DishImage dish={dish} className="aspect-[4/3] h-full" />
            <div className="space-y-4 p-6 sm:p-8">
              <p className="font-medium text-ink-muted">Hôm nay vào bếp</p>
              <h1 className="break-words text-3xl font-semibold text-jungle-green sm:text-4xl">{dish.name}</h1>
              <p className="whitespace-pre-line break-words text-ink-muted">{dish.description || 'Chưa có mô tả món ăn.'}</p>
            </div>
          </div>
          <section aria-labelledby="cooking-method" className="space-y-4">
            <h2 id="cooking-method" className="text-2xl font-semibold">Bạn muốn thưởng thức thế nào?</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Button to={`/dishes/${id}/recipes`} state={{ searchReturnTo }} className="min-h-20">
                <ChefHat aria-hidden="true" className="size-5" /> Tự nấu
              </Button>
              <Button variant="secondary" disabled className="min-h-20">
                <MapPin aria-hidden="true" className="size-5" /> Quán ăn · Sắp có
              </Button>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
