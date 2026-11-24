import { X } from 'lucide-react'

export default function IngredientChip({ ingredient, onRemove, disabled, actions }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-paper px-3 py-1 text-sm font-medium text-foreground transition-all">
      <span>{ingredient.name}</span>

      {/* Điểm cắm mở rộng cho FE11 (ví dụ nút ghim, hành động) */}
      {actions}

      <button
        type="button"
        disabled={disabled}
        onClick={() => onRemove(ingredient.id)}
        aria-label={`Bỏ ${ingredient.name}`}
        className="rounded-full p-0.5 text-muted hover:bg-border/60 hover:text-foreground focus:outline-none focus:ring-1 focus:ring-lemon-gold disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </span>
  )
}
