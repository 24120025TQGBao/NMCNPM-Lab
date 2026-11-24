import { useCallback } from 'react'
import { useLocation, useParams, useSearchParams } from 'react-router-dom'
import { dishes, recipes } from '../lib/api'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import { Alert } from '../components/ui/Alert'
import { CatalogError, Pagination, RecipeFacts } from '../features/dishes/CatalogUI'
import { positivePage, searchReturnPath } from '../features/dishes/catalogNavigation'
import { useCatalogResource } from '../features/dishes/useCatalogResource'

const LIMIT = 12

export default function DishRecipesPage() {
  const { id } = useParams()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const page = positivePage(params.get('page'))
  const searchReturnTo = searchReturnPath(location.state?.searchReturnTo)
  const load = useCallback(async (signal) => {
    const [dish, list] = await Promise.all([
      dishes.get(id, { signal }), recipes.listByDish(id, { page, limit: LIMIT, signal }),
    ])
    return { dish, ...list }
  }, [id, page])
  const { data, error, loading, retry } = useCatalogResource(load)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" to={`/dishes/${id}`} state={{ searchReturnTo }}>Quay lại món ăn</Button>
        <Button variant="secondary" to={searchReturnTo}>Quay lại tìm món</Button>
      </div>
      <h1 className="break-words text-3xl font-semibold text-jungle-green">Công thức{data?.dish?.name ? ` cho ${data.dish.name}` : ''}</h1>
      {loading ? <Spinner label="Đang tải danh sách công thức…" /> : error ? (
        <CatalogError message={error.status === 404 ? 'Món ăn không còn tồn tại hoặc không còn khả dụng.' : 'Không tải được danh sách công thức. Vui lòng thử lại.'}
          retry={error.status === 404 ? undefined : retry} />
      ) : (
        <>
          {!data.data.length ? (
            <EmptyState title={data.meta.total ? 'Trang này không có công thức' : 'Món này chưa có công thức'}>
              {data.meta.total ? 'Chọn trang trước để xem các công thức khác.' : 'Hiện chưa có hướng dẫn tự nấu cho món này. Bạn có thể quay lại và chọn món khác.'}
            </EmptyState>
          ) : (
            <ul className="space-y-4">
              {data.data.map((recipe) => (
                <li key={recipe.id} className="space-y-4 rounded-card border border-border p-5 sm:p-6">
                  <h2 className="break-words text-2xl font-semibold">{recipe.name}</h2>
                  <RecipeFacts recipe={recipe} />
                  {recipe.incomplete && <Alert tone="warning">Công thức chưa đầy đủ thông tin hướng dẫn.</Alert>}
                  <Button to={`/recipes/${recipe.id}`} state={{ searchReturnTo, recipeListTo: `${location.pathname}${location.search}` }}>Xem công thức</Button>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={page} limit={LIMIT} total={data.meta.total}
            onPage={(next) => setParams({ page: String(next) }, { replace: true, state: { searchReturnTo } })} />
        </>
      )}
    </div>
  )
}
