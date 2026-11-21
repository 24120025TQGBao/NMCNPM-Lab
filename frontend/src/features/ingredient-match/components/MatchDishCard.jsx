import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ImageOff, AlertTriangle } from 'lucide-react'

export default function MatchDishCard({ dish }) {
  const [imageError, setImageError] = useState(false)

  // Tính phần trăm khớp
  const percentage = Math.round(dish.matchRatio * 100)

  // Hiển thị tối đa 4 chip nguyên liệu thiếu, còn lại là +n
  const maxMissingDisplay = 4
  const visibleMissing = (dish.missing || []).slice(0, maxMissingDisplay)
  const remainingCount = (dish.missing || []).length - maxMissingDisplay

  return (
    <Link
      to={`/dishes/${dish.id}`}
      className="group flex flex-col sm:flex-row items-start gap-4 rounded-xl border border-border bg-white p-4 shadow-sm transition-all hover:border-lemon-gold hover:shadow-md no-underline text-foreground"
    >
      {/* Ảnh nhỏ */}
      <div className="relative h-28 w-full sm:w-28 flex-shrink-0 overflow-hidden rounded-lg bg-paper">
        {dish.imageUrl && !imageError ? (
          <img
            src={dish.imageUrl}
            alt={dish.name}
            loading="lazy"
            onError={() => setImageError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            <ImageOff className="h-6 w-6 stroke-[1.5]" />
          </div>
        )}
      </div>

      {/* Thông tin chi tiết */}
      <div className="flex-1 min-w-0 w-full">
        <h4 className="text-base font-bold text-foreground group-hover:text-jungle-green transition-colors line-clamp-1">
          {dish.name}
        </h4>

        {/* Thanh tiến độ */}
        <div className="mt-2 space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-jungle-green">{percentage}% khớp</span>
            <span className="text-muted">
              Có {dish.haveCount}/{dish.totalCount} nguyên liệu
            </span>
          </div>

          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentage}
            aria-label={`Mức khớp ${percentage}%`}
            className="h-2 w-full overflow-hidden rounded-full bg-border"
          >
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                percentage >= 80
                  ? 'bg-emerald-500'
                  : percentage >= 50
                    ? 'bg-lemon-gold'
                    : 'bg-amber-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Cảnh báo chưa đủ dữ liệu (QĐ 4.4) */}
        {dish.isIncomplete && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Chưa đủ dữ liệu thành phần để kết luận</span>
          </div>
        )}

        {/* Chip nguyên liệu thiếu */}
        {dish.missing && dish.missing.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
            <span className="text-muted mr-1 font-medium">Thiếu:</span>
            {visibleMissing.map((m) => (
              <span
                key={m.id}
                className="inline-block rounded bg-rose-50 border border-rose-200 px-2 py-0.5 font-medium text-rose-700"
              >
                {m.name}
              </span>
            ))}
            {remainingCount > 0 && (
              <span className="inline-block text-muted font-medium">+{remainingCount}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
