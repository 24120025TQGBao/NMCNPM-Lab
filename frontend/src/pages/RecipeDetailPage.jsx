import { useCallback } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { recipes } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import { CatalogError, RecipeFacts } from '../features/dishes/CatalogUI'
import { searchReturnPath } from '../features/dishes/catalogNavigation'
import { useCatalogResource } from '../features/dishes/useCatalogResource'

export default function RecipeDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const searchReturnTo = searchReturnPath(location.state?.searchReturnTo)
  const load = useCallback((signal) => recipes.get(id, { signal }), [id])
  const { data: recipe, loading, error, retry } = useCatalogResource(load)
  const fromList = location.state?.recipeListTo
  const recipeListTo = typeof fromList === 'string' && /^\/dishes\/\d+\/recipes(?:\?[^#]*)?$/.test(fromList)
    ? fromList : recipe?.dishId ? `/dishes/${recipe.dishId}/recipes` : searchReturnTo
  const incomplete = recipe && (recipe.incomplete || !recipe.ingredients.length || !recipe.steps.length || !recipe.prepTimeMinutes)

  return (
    <article className="mx-auto max-w-4xl space-y-6">
      <Button variant="secondary" to={recipeListTo} state={{ searchReturnTo }}>
        {recipeListTo.startsWith('/dishes/') ? 'Quay lại danh sách công thức' : 'Quay lại tìm món'}
      </Button>
      {loading ? <Spinner label="Đang tải công thức…" /> : error || !recipe ? (
        <CatalogError message={error?.status === 404 || !error ? 'Công thức không còn tồn tại hoặc không còn khả dụng.' : 'Không tải được công thức. Vui lòng thử lại hoặc quay lại danh sách.'}
          retry={error?.status === 404 ? undefined : retry} />
      ) : (
        <>
          <header className="space-y-5 rounded-card border border-border bg-surface p-6 sm:p-8">
            <p className="font-medium text-ink-muted">Cùng vào bếp</p>
            <h1 className="break-words text-3xl font-semibold text-jungle-green sm:text-4xl">{recipe.name}</h1>
            <RecipeFacts recipe={recipe} />
          </header>
          {incomplete && <Alert tone="warning">Công thức chưa đầy đủ thông tin hướng dẫn. Một số nguyên liệu, thời gian hoặc bước nấu có thể chưa được cập nhật.</Alert>}
          <div className="grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
            <section aria-labelledby="ingredients-heading" className="min-w-0 space-y-4 rounded-card border border-border p-5 sm:p-6">
              <h2 id="ingredients-heading" className="text-2xl font-semibold">Nguyên liệu</h2>
              {!recipe.ingredients.length ? <p className="text-ink-muted">Chưa cập nhật nguyên liệu.</p> : (
                <ul className="divide-y divide-border">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={ingredient.ingredientId ?? index} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3">
                      <span className="min-w-0 break-words">{ingredient.name || 'Nguyên liệu chưa có tên'}</span>
                      <span className="font-medium">{ingredient.quantity === null ? 'Tùy khẩu vị' : `${new Intl.NumberFormat('vi-VN').format(ingredient.quantity)}${ingredient.unit ? ` ${ingredient.unit}` : ' (chưa có đơn vị)'}`}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section aria-labelledby="steps-heading" className="min-w-0 space-y-4">
              <h2 id="steps-heading" className="text-2xl font-semibold">Các bước thực hiện</h2>
              {!recipe.steps.length ? <EmptyState>Chưa cập nhật các bước thực hiện.</EmptyState> : (
                <ol className="space-y-5">
                  {recipe.steps.map((step, index) => (
                    <li key={`${step.order}-${index}`} className="rounded-card border border-border p-5">
                      <h3 className="mb-2 text-lg font-semibold text-jungle-green">Bước {step.order}</h3>
                      <p className="whitespace-pre-line break-words">{step.content || 'Chưa cập nhật nội dung bước này.'}</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      )}
    </article>
  )
}
