import { Button } from '../../../components/ui/Button'

export default function PurchaseSuggestions({ state, onRetry, onAddIngredient, disabled }) {
  if (state.loading) return <p role="status" className="text-sm text-muted">Đang tìm nguyên liệu nên mua thêm…</p>
  if (state.error) return (
    <div role="alert" className="rounded-xl border border-border bg-paper p-4 space-y-2">
      <p className="text-sm">Chưa tải được gợi ý mua thêm. Bạn vẫn có thể xem các món bên dưới.</p>
      <Button variant="secondary" onClick={onRetry} disabled={disabled}>Thử lại gợi ý mua thêm</Button>
    </div>
  )
  if (!state.items.length) return null
  return (
    <section aria-label="Gợi ý mua thêm" className="rounded-2xl border border-lemon-gold bg-paper p-4 space-y-3">
      <h3 className="font-bold text-jungle-green">Mua thêm 1 thứ mở khóa nhiều món</h3>
      <ul className="space-y-3">
        {state.items.map(item => (
          <li key={item.ingredient.id} className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Mua thêm 1 thứ mở khóa {item.unlockCount} món</p>
              <p className="text-sm">{item.ingredient.name}</p>
            </div>
            <Button variant="secondary" disabled={disabled}
              aria-label={`Thêm ${item.ingredient.name} vào nguyên liệu đang có`}
              onClick={() => onAddIngredient(item.ingredient)}>
              Đã có nguyên liệu này
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
