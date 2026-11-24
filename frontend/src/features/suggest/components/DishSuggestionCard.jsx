import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Utensils, ImageOff, ChefHat } from 'lucide-react'
import { CONTEXT_CHIPS, formatFlavor } from '../constants'

export default function DishSuggestionCard({ dish, isSkipped, onCook, titleRef }) {
  const [imageError, setImageError] = useState(false)

  // Map mã thẻ hoàn cảnh sang nhãn hiển thị
  const tagLabels = (dish.tags || []).map((t) => {
    const found = CONTEXT_CHIPS.find((c) => c.id === t)
    return found ? found.label : t
  })

  return (
    <article
      className={`w-full max-w-xl mx-auto rounded-2xl border bg-white shadow-sm overflow-hidden transition-all duration-300 motion-reduce:transition-none ${        isSkipped ? 'opacity-60 border-dashed border-border' : 'border-border'
      }`}
    >
      {/* Ảnh món lớn tỷ lệ 4:3 */}
      <div className="relative aspect-[4/3] w-full bg-paper overflow-hidden flex items-center justify-center">
        {dish.imageUrl && !imageError ? (
          <img
            src={dish.imageUrl}
            alt={dish.name}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted p-4 text-center">
            <ImageOff className="h-12 w-12 stroke-[1.2] mb-2 text-border" />
            <span className="text-sm font-medium">Chưa có ảnh</span>
          </div>
        )}

        {isSkipped && (
          <div className="absolute top-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
            Đã bỏ qua
          </div>
        )}
      </div>

      {/* Nội dung chi tiết */}
      <div className="p-5 sm:p-6 space-y-4">
        <div>
          <h2
            ref={titleRef}
            tabIndex={-1}
            className="text-xl sm:text-2xl font-bold text-foreground line-clamp-2 outline-none"
          >
            {dish.name}
          </h2>

          {dish.shortDescription && (
            <p className="mt-2 text-sm sm:text-base text-muted line-clamp-3">
              {dish.shortDescription}
            </p>
          )}
        </div>

        {/* Thông số thời gian & khẩu vị */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted pt-1">
          {dish.cookTimeMinutes !== null && dish.cookTimeMinutes !== undefined && (
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Clock className="h-4 w-4 text-jungle-green" />
              <span>{dish.cookTimeMinutes} phút</span>
            </div>
          )}

          {dish.flavor && (
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Utensils className="h-4 w-4 text-jungle-green" />
              <span>Khẩu vị: {formatFlavor(dish.flavor)}</span>
            </div>
          )}
        </div>

        {/* Tags hoàn cảnh nhỏ */}
        {tagLabels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tagLabels.map((tag, idx) => (
              <span
                key={idx}
                className="inline-block rounded-md bg-paper px-2.5 py-1 text-xs font-medium text-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Nút hành động chính: Nấu món này */}
        <div className="pt-2">
          <Link
            to={`/dishes/${dish.id}`}
            onClick={onCook}
            className="w-full inline-flex items-center justify-center rounded-control bg-jungle-green px-5 py-3 text-base font-semibold text-white shadow-sm hover:bg-opacity-90 transition-colors"
          >
            <ChefHat className="mr-2 h-5 w-5" />
            Nấu món này
          </Link>
        </div>
      </div>
    </article>
  )
}
