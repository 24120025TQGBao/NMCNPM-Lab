import { Button } from '../../../components/ui/Button'

export default function PinIngredientButton({ ingredient, pinned, onToggle, disabled = false }) {
  return (
    <Button variant="secondary" className="min-h-8 px-2 py-0 text-xs" aria-pressed={pinned} disabled={disabled}
      aria-label={`${pinned ? 'Bỏ ghim' : 'Ghim'} ${ingredient.name}`}
      onClick={() => onToggle(ingredient.id)}>
      {pinned ? 'Đã ghim' : 'Dùng gấp'}
    </Button>
  )
}
