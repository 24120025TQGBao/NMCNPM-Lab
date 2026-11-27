import { useState } from 'react'
import MatchDishCard from './MatchDishCard'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function MatchResultGroup({ group, renderDishActions }) {
  const [showAll, setShowAll] = useState(false)
  const items = group.items || []

  // Mỗi nhóm hiển thị tối đa 6 món, còn lại ẩn sau nút "Xem thêm (n)"
  const maxInitial = 6
  const visibleItems = showAll ? items : items.slice(0, maxInitial)
  const hasMore = items.length > maxInitial

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-base sm:text-lg font-bold text-foreground">
            {group.title}
          </h3>
          <span className="rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold text-muted">
            {items.length} món
          </span>
        </div>
      </div>

      {group.description && (
        <p className="text-xs sm:text-sm text-amber-700 bg-amber-50 rounded-lg p-2.5 border border-amber-200">
          {group.description}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visibleItems.map((dish) => (
          <div key={dish.id} className="space-y-2">
            <MatchDishCard dish={dish} />
            {renderDishActions?.(dish)}
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center text-sm font-semibold text-jungle-green hover:underline focus:outline-none"
          >
            {showAll ? (
              <>
                Thu gọn
                <ChevronUp className="ml-1 h-4 w-4" />
              </>
            ) : (
              <>
                Xem thêm ({items.length - maxInitial})
                <ChevronDown className="ml-1 h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}
    </section>
  )
}
