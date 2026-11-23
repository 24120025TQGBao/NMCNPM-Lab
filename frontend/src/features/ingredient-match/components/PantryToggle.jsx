export default function PantryToggle({ checked, onChange, disabled }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <label className="relative inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <div className="peer h-6 w-11 rounded-full bg-border after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-jungle-green peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-lemon-gold disabled:opacity-50" />
      </label>
      <span className="text-xs sm:text-sm text-foreground">
        Đã có sẵn gia vị cơ bản (muối, đường, dầu ăn, nước mắm, tiêu)
      </span>
    </div>
  )
}
