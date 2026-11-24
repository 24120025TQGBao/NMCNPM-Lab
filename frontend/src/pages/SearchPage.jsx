import { useCallback } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { ChevronDown, Search } from 'lucide-react'
import { dishes } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import { CatalogError, DishImage, Pagination } from '../features/dishes/CatalogUI'
import { positivePage } from '../features/dishes/catalogNavigation'
import { useCatalogResource } from '../features/dishes/useCatalogResource'

const LIMIT = 12
const flavors = [['MAN', 'Mặn'], ['CAY', 'Cay'], ['NGOT', 'Ngọt'], ['CHUA', 'Chua'], ['THANH', 'Thanh đạm']]

function FilterSelect({ label, name, value, children, onChange, disabled }) {
  return (
    <label className="block min-w-0 space-y-2 font-medium">
      <span>{label}</span>
      <span className="relative block">
        <select name={name} value={value} onChange={(event) => onChange(name, event.target.value)} disabled={disabled}
          className="min-h-11 w-full appearance-none rounded-control border border-border bg-white py-2 pl-3 pr-9 text-base font-normal">
          {children}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-3 size-5" />
      </span>
    </label>
  )
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const search = (params.get('search') ?? '').slice(0, 100)
  const category = params.get('category') ?? ''
  const flavor = params.get('flavor') ?? ''
  const maxCookTime = params.get('max_cook_time') ?? ''
  const page = positivePage(params.get('page'))
  const load = useCallback((signal) => dishes.search({ search, category, flavor, maxCookTime, page, limit: LIMIT, signal }),
    [search, category, flavor, maxCookTime, page])
  const result = useCatalogResource(load)
  const loadCategories = useCallback((signal) => dishes.categories({ signal }), [])
  const categories = useCatalogResource(loadCategories)

  function update(name, value) {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      if (value) next.set(name, value)
      else next.delete(name)
      if (name !== 'page') next.delete('page')
      return next
    }, { replace: true })
  }

  return (
    <>
      <PageHeader title="Tìm món ăn" subtitle="Tìm món bạn thích và chọn công thức để tự nấu tại nhà." />
      <form role="search" onSubmit={(event) => event.preventDefault()} className="mb-8 space-y-5 rounded-card border border-border bg-surface p-5 sm:p-6">
        <label className="block space-y-2 font-medium">
          <span>Tên món ăn</span>
          <span className="relative block">
            <Search aria-hidden="true" className="absolute left-3 top-3 size-5 text-ink-muted" />
            <input type="search" maxLength={100} value={search} onChange={(event) => update('search', event.target.value)}
              placeholder="Thử tìm “pho bo” hoặc “cơm tấm”"
              className="min-h-11 w-full rounded-control border border-border bg-white py-2 pl-11 pr-3 text-base font-normal" />
          </span>
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <FilterSelect label="Loại món" name="category" value={category} onChange={update} disabled={categories.loading}>
            <option value="">{categories.loading ? 'Đang tải loại món…' : 'Tất cả loại món'}</option>
            {category && !categories.data?.some((row) => row.code === category) && <option value={category}>{category}</option>}
            {categories.data?.map((row) => <option key={row.code} value={row.code}>{row.name}</option>)}
          </FilterSelect>
          <FilterSelect label="Khẩu vị" name="flavor" value={flavor} onChange={update}>
            <option value="">Tất cả khẩu vị</option>
            {flavors.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </FilterSelect>
          <FilterSelect label="Thời gian chế biến" name="max_cook_time" value={maxCookTime} onChange={update}>
            <option value="">Không giới hạn</option>
            {[15, 30, 60, 120].map((minutes) => <option key={minutes} value={minutes}>Tối đa {minutes} phút</option>)}
          </FilterSelect>
        </div>
        {categories.error && <CatalogError message="Không tải được loại món. Bạn vẫn có thể tìm theo tên và các bộ lọc khác." retry={categories.retry} />}
        {!categories.loading && !categories.error && !categories.data?.length && <p className="text-ink-muted">Chưa có danh mục loại món.</p>}
        <Button variant="secondary" onClick={() => setParams({}, { replace: true })}>Xóa bộ lọc</Button>
      </form>
      <section aria-label="Kết quả tìm món" aria-busy={result.loading}>
        {result.loading ? <Spinner label="Đang tìm món ăn…" /> : result.error ? (
          <CatalogError message="Không tải được danh sách món ăn. Vui lòng thử lại." retry={result.retry} />
        ) : (
          <>
            <p role="status" className="mb-5 text-ink-muted">Tìm thấy {result.data.meta.total} món ăn</p>
            {!result.data.data.length ? (
              <EmptyState title="Không tìm thấy món phù hợp" action={<Button variant="secondary" onClick={() => setParams({})}>Xóa bộ lọc</Button>}>
                Thử từ khóa khác hoặc giảm bớt bộ lọc.
              </EmptyState>
            ) : (
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {result.data.data.map((dish) => (
                  <li key={dish.id} className="min-w-0">
                    <Link to={`/dishes/${dish.id}`} state={{ searchReturnTo: `${location.pathname}${location.search}` }}
                      className="block h-full overflow-hidden rounded-card border border-border bg-white text-ink no-underline shadow-card transition-shadow hover:shadow-md">
                      <DishImage dish={dish} className="aspect-[16/10]" />
                      <div className="space-y-2 p-5">
                        <h2 className="break-words text-2xl font-semibold text-jungle-green">{dish.name}</h2>
                        <p className="break-words text-ink-muted">{dish.description || 'Chưa có mô tả món ăn.'}</p>
                        <span className="inline-block pt-2 font-semibold text-jungle-green">Xem món và công thức</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Pagination page={page} limit={LIMIT} total={result.data.meta.total} onPage={(next) => update('page', String(next))} />
          </>
        )}
      </section>
    </>
  )
}
