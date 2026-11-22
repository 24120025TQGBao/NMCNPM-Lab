import { useState } from 'react'
import { Utensils, RotateCcw, AlertCircle } from 'lucide-react'
import { useIngredientMatch } from '../useIngredientMatch'
import IngredientPicker from './IngredientPicker'
import IngredientChip from './IngredientChip'
import PantryToggle from './PantryToggle'
import MatchResults from './MatchResults'
import { Button } from '../../../components/ui/Button'

export default function IngredientMatchTab() {
  const {
    ingredients,
    pantry,
    results,
    groupedResults,
    loading,
    error,
    addIngredient,
    removeIngredient,
    clearAllIngredients,
    findDishes,
    togglePantry,
  } = useIngredientMatch()

  const [inputError, setInputError] = useState(null)

  const handleSelectIngredient = (item) => {
    setInputError(null)
    const res = addIngredient(item)
    if (!res.success) {
      if (res.reason === 'MAX_LIMIT') {
        setInputError('Bạn chỉ có thể chọn tối đa 20 nguyên liệu')
      } else if (res.reason === 'DUPLICATE') {
        setInputError('Nguyên liệu này đã được chọn')
      }
    }
  }

  const handleSearch = () => {
    setInputError(null)
    if (ingredients.length === 0) {
      setInputError('Hãy chọn ít nhất 1 nguyên liệu')
      return // QĐ 4.1: Chặn và không gọi API
    }
    findDishes()
  }

  return (
    <div className="w-full space-y-6">
      {/* Khối chọn nguyên liệu */}
      <div className="rounded-2xl border border-border bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <label htmlFor="ingredient-input" className="block text-sm font-semibold text-foreground">
          Bạn đang có những nguyên liệu gì?
        </label>

        <IngredientPicker
          onSelectIngredient={handleSelectIngredient}
          onSubmit={handleSearch}
          disabled={loading}
          error={inputError}
        />

        {/* Danh sách chip nguyên liệu đã chọn */}
        {ingredients.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Đã chọn ({ingredients.length}/20):</span>
              <button
                type="button"
                onClick={clearAllIngredients}
                disabled={loading}
                className="hover:text-jungle-green underline"
              >
                Xóa tất cả
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {ingredients.map((ing) => (
                <IngredientChip
                  key={ing.id}
                  ingredient={ing}
                  onRemove={removeIngredient}
                  disabled={loading}
                />
              ))}
            </div>
          </div>
        )}

        {/* Công tắc tủ bếp cơ bản */}
        <PantryToggle
          checked={pantry}
          onChange={togglePantry}
          disabled={loading}
        />

        {/* Nút Tìm món */}
        <div className="pt-2">
          <Button
            variant="primary"
            disabled={loading || ingredients.length === 0}
            onClick={handleSearch}
            className="w-full sm:w-auto bg-jungle-green text-white font-semibold hover:bg-jungle-green/90 px-6 py-2.5"
          >
            <Utensils className="mr-2 h-4 w-4" />
            Tìm món
          </Button>
        </div>
      </div>

      {/* Vùng hiển thị kết quả */}
      <div aria-live="polite" className="pt-2">
        {loading && (
          <div className="space-y-4 animate-pulse motion-reduce:animate-none">            <div className="h-6 w-32 bg-paper rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 rounded-xl bg-paper" />
              ))}
            </div>
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-foreground"
          >
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-rose-500" />
            <p className="font-medium text-rose-900 mb-1">
              Không tìm được món lúc này. Vui lòng thử lại.
            </p>
            <p className="text-sm text-rose-700 mb-5">{error}</p>
            <Button variant="secondary" onClick={() => findDishes()}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Thử lại
            </Button>
          </div>
        )}

        {!loading && !error && results === null && (
          <div className="rounded-2xl border border-dashed border-border bg-paper/50 p-8 text-center text-muted">
            <p className="text-sm">
              Chọn nguyên liệu bạn đang có, rồi bấm Tìm món.
            </p>
          </div>
        )}

        {!loading && !error && results !== null && (
          <MatchResults groups={groupedResults} />
        )}
      </div>
    </div>
  )
}
