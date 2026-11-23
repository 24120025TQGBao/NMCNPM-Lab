import { Button } from '../../../components/ui/Button'

export default function PinIngredientButton({ ingredient, pinned, onToggle, disabled = false }) {
  return (
    <Button variant="secondary" aria-pressed={pinned} disabled={disabled}
      aria-label={`${pinned ? 'Bỏ ghim' : 'Ghim'} ${ingredient.name}`}
      onClick={() => onToggle(ingredient.id)}>
      {pinned ? 'Đã ghim' : 'Dùng gấp'}: {ingredient.name}
    </Button>
  )
}
