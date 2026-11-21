import { useState, useRef, useEffect } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { useIngredientSearch } from '../useIngredientSearch'

export default function IngredientPicker({ onSelectIngredient, disabled, error }) {
  const { query, setQuery, suggestions, loading, hasSearched, clearSuggestions } =
    useIngredientSearch()

  const [activeIndex, setActiveIndex] = useState(-1)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  // Đóng danh sách gợi ý khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Mở menu khi có kết quả hoặc đang loading
  useEffect(() => {
    if (query.trim() && (suggestions.length > 0 || hasSearched || loading)) {
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }, [query, suggestions, hasSearched, loading])

  const handleSelect = (item) => {
    const res = onSelectIngredient(item)
    setQuery('')
    clearSuggestions()
    setIsOpen(false)
    setActiveIndex(-1)
    return res
  }

  const handleKeyDown = (e) => {
    if (!isOpen) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        handleSelect(suggestions[activeIndex])
      }
      // QĐ 4.1: Chỉ nguyên liệu có trong từ điển mới thêm được! Enter khi không chọn từ list thì không thêm gì.
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-jungle-green" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </div>
        <input
          type="text"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value)
            setActiveIndex(-1)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim()) setIsOpen(true)
          }}
          placeholder="Nhập nguyên liệu đang có (ví dụ: cà chua, trứng gà, thịt ba chỉ...)"
          className={`w-full rounded-control border py-2.5 pl-10 pr-4 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-lemon-gold ${
            error ? 'border-rose-400 bg-rose-50/20' : 'border-border bg-white'
          } disabled:bg-paper disabled:text-muted`}
          aria-autocomplete="list"
          aria-controls="ingredient-suggestions"
          aria-expanded={isOpen}
        />
      </div>

      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}

      {/* Dropdown danh sách gợi ý */}
      {isOpen && (
        <ul
          id="ingredient-suggestions"
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-control border border-border bg-white py-1 shadow-lg focus:outline-none"
        >
          {suggestions.length > 0 ? (
            suggestions.map((item, idx) => (
              <li
                key={item.id}
                role="option"
                aria-selected={idx === activeIndex}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`cursor-pointer px-4 py-2.5 text-sm transition-colors ${
                  idx === activeIndex
                    ? 'bg-lemon-gold/20 text-foreground font-medium'
                    : 'text-foreground hover:bg-paper'
                }`}
              >
                <span>{item.name}</span>
                {item.isBasicPantry && (
                  <span className="ml-2 text-xs text-muted">(gia vị cơ bản)</span>
                )}
              </li>
            ))
          ) : hasSearched && !loading ? (
            <li className="px-4 py-3 text-center text-sm text-muted">
              Không tìm thấy nguyên liệu này
            </li>
          ) : null}
        </ul>
      )}
    </div>
  )
}
