import { AlertCircle, RotateCcw, Sparkles } from 'lucide-react'
import { Button } from '../../../components/ui/Button'

export function SuggestSkeleton() {
  return (
    <div className="w-full max-w-xl mx-auto animate-pulse rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
      <div className="aspect-[4/3] w-full bg-paper" />
      <div className="p-6 space-y-4">
        <div className="h-6 w-3/4 rounded bg-paper" />
        <div className="h-4 w-full rounded bg-paper" />
        <div className="h-4 w-5/6 rounded bg-paper" />
        <div className="flex gap-2 pt-2">
          <div className="h-6 w-16 rounded-full bg-paper" />
          <div className="h-6 w-20 rounded-full bg-paper" />
        </div>
      </div>
    </div>
  )
}

export function SuggestError({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="w-full max-w-xl mx-auto rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-foreground"
    >
      <AlertCircle className="mx-auto mb-3 h-10 w-10 text-rose-500" />
      <p className="font-medium text-rose-900 mb-1">
        {message || 'Không tải được gợi ý. Vui lòng thử lại.'}
      </p>
      <p className="text-sm text-rose-700 mb-5">Vui lòng thử lại để tiếp tục nhận gợi ý.</p>
      <Button variant="secondary" onClick={onRetry}>
        <RotateCcw className="mr-2 h-4 w-4" />
        Thử lại
      </Button>
    </div>
  )
}

export function SuggestEmpty({ isFirstTime, onClearChips, onRestart, onViewPrevious, hasPrevious }) {
  if (isFirstTime) {
    return (
      <div className="w-full max-w-xl mx-auto rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-paper text-jungle-green">
          <Sparkles className="h-6 w-6 text-lemon-gold" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Chưa có món phù hợp</h3>
        <p className="text-sm text-muted mb-6 max-w-md mx-auto">
          Chưa có món nào phù hợp với lựa chọn này. Hãy bỏ bớt một lựa chọn.
        </p>
        {onClearChips && (
          <Button variant="primary" onClick={onClearChips}>
            Xóa chọn
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="w-full max-w-xl mx-auto rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-paper text-jungle-green">
        <Sparkles className="h-6 w-6 text-lemon-gold" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Đã xem hết gợi ý</h3>
      <p className="text-sm text-muted mb-6 max-w-md mx-auto">
        Bạn đã xem hết các món phù hợp.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {hasPrevious && (
          <Button variant="secondary" onClick={onViewPrevious}>
            Xem lại các món trước
          </Button>
        )}
        <Button variant="primary" onClick={onRestart}>
          Bắt đầu lại
        </Button>
      </div>
    </div>
  )
}
