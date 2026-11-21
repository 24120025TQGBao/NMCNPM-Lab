import { useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Sparkles, UtensilsCrossed } from 'lucide-react'
import SuggestTab from '../features/suggest/components/SuggestTab'
import IngredientMatchTab from '../features/ingredient-match/components/IngredientMatchTab'

export default function SuggestPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') === 'nguyen-lieu' ? 'nguyen-lieu' : 'goi-y'
  const tabListRef = useRef(null)

  const handleSelectTab = (tab) => {
    // replace=true để đổi query string không tạo history push liên tục
    setSearchParams({ tab }, { replace: true })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const nextTab = activeTab === 'goi-y' ? 'nguyen-lieu' : 'goi-y'
      handleSelectTab(nextTab)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-2 sm:px-4 py-4">
      {/* Tab bar header */}
      <div className="mb-6 border-b border-border">
        <div
          ref={tabListRef}
          role="tablist"
          aria-label="Phương thức gợi ý"
          onKeyDown={handleKeyDown}
          className="flex gap-2 sm:gap-6"
        >
          <button
            type="button"
            role="tab"
            id="tab-goi-y"
            aria-selected={activeTab === 'goi-y'}
            aria-controls="panel-goi-y"
            tabIndex={activeTab === 'goi-y' ? 0 : -1}
            onClick={() => handleSelectTab('goi-y')}
            className={`inline-flex items-center gap-2 border-b-2 py-3 px-3 sm:px-4 text-base sm:text-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lemon-gold ${
              activeTab === 'goi-y'
                ? 'border-lemon-gold text-jungle-green font-semibold'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            <Sparkles className="h-5 w-5 text-lemon-gold" aria-hidden="true" />
            <span>Gợi ý món</span>
          </button>

          <button
            type="button"
            role="tab"
            id="tab-nguyen-lieu"
            aria-selected={activeTab === 'nguyen-lieu'}
            aria-controls="panel-nguyen-lieu"
            tabIndex={activeTab === 'nguyen-lieu' ? 0 : -1}
            onClick={() => handleSelectTab('nguyen-lieu')}
            className={`inline-flex items-center gap-2 border-b-2 py-3 px-3 sm:px-4 text-base sm:text-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lemon-gold ${
              activeTab === 'nguyen-lieu'
                ? 'border-lemon-gold text-jungle-green font-semibold'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            <UtensilsCrossed className="h-5 w-5 text-jungle-green" aria-hidden="true" />
            <span>Theo nguyên liệu</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {/* Giữ nguyên DOM panel với hidden để bảo toàn state khi chuyển qua lại (FR-02) */}
      <div
        role="tabpanel"
        id="panel-goi-y"
        aria-labelledby="tab-goi-y"
        hidden={activeTab !== 'goi-y'}
        className={activeTab === 'goi-y' ? 'block' : 'hidden'}
      >
        <SuggestTab />
      </div>

      <div
        role="tabpanel"
        id="panel-nguyen-lieu"
        aria-labelledby="tab-nguyen-lieu"
        hidden={activeTab !== 'nguyen-lieu'}
        className={activeTab === 'nguyen-lieu' ? 'block' : 'hidden'}
      >
        <IngredientMatchTab />
      </div>
    </div>
  )
}
