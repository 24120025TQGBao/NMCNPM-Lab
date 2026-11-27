import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { buildShoppingList, copyShoppingList } from './shoppingList'

export default function ShoppingListButton({ dishes, clipboard = globalThis.navigator?.clipboard }) {
  const text = buildShoppingList(dishes)
  const [feedback, setFeedback] = useState(null)
  const [copying, setCopying] = useState(false)
  async function copy() {
    setCopying(true)
    setFeedback(null)
    try {
      await copyShoppingList(text, clipboard)
      setFeedback({ text, success: true, message: 'Đã sao chép danh sách đi chợ.' })
    } catch (error) {
      setFeedback({ text, success: false, message: error.message || 'Không sao chép được danh sách. Vui lòng thử lại.' })
    } finally {
      setCopying(false)
    }
  }
  return (
    <div className="space-y-2">
      <Button variant="secondary" disabled={!text || copying} onClick={copy}>
        {copying ? 'Đang sao chép…' : 'Sao chép danh sách đi chợ'}
      </Button>
      {feedback?.text === text && (
        <p role={feedback.success ? 'status' : 'alert'} className="text-sm">
          {feedback.message}
        </p>
      )}
    </div>
  )
}
