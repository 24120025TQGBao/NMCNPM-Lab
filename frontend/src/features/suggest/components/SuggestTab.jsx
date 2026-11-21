import { useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Dices, SkipForward } from 'lucide-react'
import { useDishSuggestions } from '../useDishSuggestions'
import ContextChips from './ContextChips'
import DishSuggestionCard from './DishSuggestionCard'
import { SuggestSkeleton, SuggestError, SuggestEmpty } from './SuggestStates'
import { Button } from '../../../components/ui/Button'

export default function SuggestTab() {
  const {
    currentDish,
    isCurrentSkipped,
    chips,
    region,
    history,
    index,
    loading,
    error,
    isExhausted,
    nextDish,
    previousDish,
    toggleChip,
    selectRegion,
    clearChips,
    randomDish,
    retry,
    restart,
  } = useDishSuggestions()

  const titleRef = useRef(null)

  // Focus về tiêu đề thẻ khi có món mới hoặc đổi index (Mục 5.5)
  useEffect(() => {
    if (currentDish && titleRef.current) {
      titleRef.current.focus()
    }
  }, [currentDish, index])

  const canGoBack = index > 0 && !loading
  const isFirstTimeExhausted = history.length === 0 && isExhausted

  return (
    <div className="w-full">
      {/* Khối chọn hoàn cảnh */}
      <ContextChips
        selectedChips={chips}
        selectedRegion={region}
        onToggleChip={toggleChip}
        onSelectRegion={selectRegion}
        onClearAll={clearChips}
        disabled={loading}
      />

      {/* Vùng hiển thị trạng thái chính */}
      <div className="min-h-[460px] flex flex-col justify-center py-2" aria-live="polite">
        {loading && <SuggestSkeleton />}

        {!loading && error && <SuggestError message={error} onRetry={retry} />}

        {!loading && !error && isExhausted && (
          <SuggestEmpty
            isFirstTime={isFirstTimeExhausted}
            onClearChips={clearChips}
            onRestart={restart}
            onViewPrevious={() => previousDish()}
            hasPrevious={history.length > 0}
          />
        )}

        {!loading && !error && !isExhausted && currentDish && (
          <div className="space-y-6">
            <DishSuggestionCard
              dish={currentDish}
              isSkipped={isCurrentSkipped}
              titleRef={titleRef}
            />

            {/* Các nút hành động phụ: Trước đó, Bỏ qua, Hôm nay ăn gì?, Gợi ý khác */}
            <div className="flex flex-wrap items-center justify-between gap-3 max-w-xl mx-auto px-1">
              <Button
                variant="secondary"
                disabled={!canGoBack}
                onClick={previousDish}
                className="flex-1 sm:flex-none"
                aria-label="Xem lại món trước đó"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Trước đó
              </Button>

              <div className="flex flex-1 sm:flex-none items-center gap-2 justify-center">
                <Button
                  variant="ghost"
                  disabled={loading}
                  onClick={() => nextDish(true)}
                  className="text-muted hover:text-foreground"
                  aria-label="Bỏ qua món này"
                >
                  <SkipForward className="mr-1 h-4 w-4" />
                  Bỏ qua
                </Button>

                <Button
                  variant="secondary"
                  disabled={loading}
                  onClick={randomDish}
                  className="border-lemon-gold/40 text-foreground"
                  aria-label="Hôm nay ăn gì ngẫu nhiên"
                >
                  <Dices className="mr-1.5 h-4 w-4 text-lemon-gold" />
                  Hôm nay ăn gì?
                </Button>
              </div>

              <Button
                variant="primary"
                disabled={loading}
                onClick={() => nextDish(false)}
                className="flex-1 sm:flex-none bg-lemon-gold text-foreground font-semibold hover:bg-lemon-gold/90"
                aria-label="Xem gợi ý khác"
              >
                Gợi ý khác
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
