import { useState } from 'react'
import { CookingPot } from 'lucide-react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'

export function CatalogError({ message, retry }) {
  return (
    <div className="space-y-4">
      <Alert tone="error">{message}</Alert>
      {retry && <Button onClick={retry}>Thử lại</Button>}
    </div>
  )
}

export function DishImage({ dish, className = '' }) {
  const [failedUrl, setFailedUrl] = useState(null)
  return dish.imageUrl && failedUrl !== dish.imageUrl ? (
    <img src={dish.imageUrl} alt={dish.name} loading="lazy"
      onError={() => setFailedUrl(dish.imageUrl)} className={`w-full object-cover ${className}`} />
  ) : (
    <div role="img" aria-label={`${dish.name} — chưa có hình ảnh`}
      className={`flex items-center justify-center bg-ok-bg text-jungle-green ${className}`}>
      <CookingPot aria-hidden="true" className="size-16" strokeWidth={1} />
    </div>
  )
}

export function Pagination({ page, limit, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / limit))
  if (pages === 1 && page === 1) return null
  return (
    <nav aria-label="Phân trang" className="mt-8 flex flex-wrap items-center justify-center gap-4">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Trang trước</Button>
      <span aria-live="polite">Trang {page} / {pages}</span>
      <Button variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>Trang sau</Button>
    </nav>
  )
}

export function RecipeFacts({ recipe }) {
  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-3 text-base">
      <div><dt className="text-ink-muted">Khẩu phần</dt><dd className="font-medium">{recipe.servings > 0 ? `${recipe.servings} người` : 'Chưa cập nhật'}</dd></div>
      <div><dt className="text-ink-muted">Thời gian chế biến</dt><dd className="font-medium">{recipe.prepTimeMinutes > 0 ? `${recipe.prepTimeMinutes} phút` : 'Chưa cập nhật'}</dd></div>
    </dl>
  )
}

