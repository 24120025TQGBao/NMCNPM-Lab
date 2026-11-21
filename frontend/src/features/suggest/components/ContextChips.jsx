import { CONTEXT_CHIPS, REGIONS } from '../constants'

export default function ContextChips({
  selectedChips,
  selectedRegion,
  onToggleChip,
  onSelectRegion,
  onClearAll,
  disabled,
}) {
  const hasFilter = selectedChips.length > 0 || Boolean(selectedRegion)

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-medium text-foreground">
          Chọn hoàn cảnh (có thể chọn nhiều):
        </label>
        {hasFilter && (
          <button
            type="button"
            onClick={onClearAll}
            disabled={disabled}
            className="text-xs font-medium text-jungle-green underline hover:text-opacity-80 disabled:opacity-50"
          >
            Xóa chọn
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {CONTEXT_CHIPS.map((chip) => {
          const isSelected = selectedChips.includes(chip.id)
          return (
            <button
              key={chip.id}
              type="button"
              disabled={disabled}
              onClick={() => onToggleChip(chip.id)}
              className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                isSelected
                  ? 'bg-lemon-gold text-foreground font-semibold shadow-sm'
                  : 'bg-paper text-muted hover:bg-border/60 hover:text-foreground'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {chip.label}
            </button>
          )
        })}
      </div>

      {/* P1: Vùng miền (Chọn một) */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-xs text-muted">Vùng miền:</span>
        {REGIONS.map((r) => {
          const isSelected = selectedRegion === r.id
          return (
            <button
              key={r.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectRegion(isSelected ? null : r.id)}
              className={`rounded px-2.5 py-0.5 text-xs transition-colors ${
                isSelected
                  ? 'bg-jungle-green text-white font-medium'
                  : 'bg-paper text-muted hover:bg-border/60'
              } disabled:opacity-50`}
            >
              {r.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
