import { useCallback } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { ChefHat, MapPin } from 'lucide-react'
import { dishes, recipes } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { CatalogError, DishImage, RecipeFacts } from '../features/dishes/CatalogUI'
import { searchReturnPath } from '../features/dishes/catalogNavigation'
import { useCatalogResource } from '../features/dishes/useCatalogResource'

export default function DishDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const searchReturnTo = searchReturnPath(location.state?.searchReturnTo)
  const load = useCallback(async (signal) => {
    const [dish, recipePage] = await Promise.all([
      dishes.get(id, { signal }), recipes.listByDish(id, { page: 1, limit: 12, signal }),
    ])
    return { dish, recipePage }
  }, [id])
  const { data, loading, error, retry } = useCatalogResource(load)
  const dish = data?.dish

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
              <p>Thời gian nấu: {dish.cookTimeMinutes > 0 ? `${dish.cookTimeMinutes} phút` : 'Chưa có thông tin'}</p>
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
          <section className="space-y-3" aria-label="Danh sách công thức">
            <h2 className="text-2xl font-semibold">Công thức</h2>
            {data.recipePage.meta.total === 0 ? <p>Món này chưa có công thức.</p> : (
              <ul className="space-y-3">
                {data.recipePage.data.map((recipe) => <li key={recipe.id} className="rounded-card border border-border p-4">
                  <p className="font-semibold">{recipe.name}</p>
                  <RecipeFacts recipe={recipe} />
                </li>)}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
