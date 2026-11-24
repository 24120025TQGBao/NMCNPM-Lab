import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { buildShoppingList, copyShoppingList } from './shoppingList'
import { retainSelectedPins, togglePinnedIngredient, prioritizePinnedDishes } from './pinnedIngredients'
import ShoppingListButton from './ShoppingListButton'
import PinIngredientButton from './PinIngredientButton'
const dishes = [{ id: 33, missing: [{ id: 56, name: 'Sườn heo' }] }]

describe('FE11 shopping list and pin primitives', () => {
  it('copies only known missing names, de-duplicates canonical IDs and preserves order', () => {
    expect(buildShoppingList([...dishes, { missing: [{ id: 56, name: 'Sườn heo' }, { id: 28, name: 'Hành lá' }] }]))
      .toBe('- Sườn heo\n- Hành lá')
  })
  it('does not invent a shopping list for incomplete data with no known missing ingredients', () => {
    expect(buildShoppingList([{ isIncomplete: true, missing: [] }])).toBe('')
  })
  it('rejects empty list and unsupported Clipboard API', async () => {
    await expect(copyShoppingList('', { writeText: vi.fn() })).rejects.toThrow()
    await expect(copyShoppingList('- Sườn heo', undefined)).rejects.toThrow()
  })
  it('surfaces clipboard failure rather than claiming success', async () => {
    const denied = { writeText: vi.fn().mockRejectedValue(new Error('Permission denied')) }
    render(<ShoppingListButton dishes={dishes} clipboard={denied} />)
    fireEvent.click(screen.getByRole('button'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Không sao chép được danh sách')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
  it('reports success only after writeText resolves and clears feedback when list changes', async () => {
    let resolve
    const clipboard = { writeText: vi.fn(() => new Promise(done => { resolve = done })) }
    const { rerender } = render(<ShoppingListButton dishes={dishes} clipboard={clipboard} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    resolve()
    expect(await screen.findByRole('status')).toHaveTextContent('Đã sao chép')
    expect(clipboard.writeText).toHaveBeenCalledWith('- Sườn heo')
    rerender(<ShoppingListButton dishes={[]} clipboard={clipboard} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
  })
  it('only pins selected canonical IDs and removes stale/duplicate pins', () => {
    expect(retainSelectedPins([1,1,2,3], [1,2])).toEqual([1,2])
    expect(togglePinnedIngredient([1], 2, [1,2])).toEqual([1,2])
    expect(togglePinnedIngredient([1,2], 1, [1,2])).toEqual([2])
    expect(togglePinnedIngredient([1], 9, [1])).toEqual([1])
  })
  it('prioritizes within groups stably without mutating inputs or changing match ratios', () => {
    const a = { id: 1, matchRatio: .9 }, b = { id: 2, matchRatio: .5 }, c = { id: 3, matchRatio: .7 }
    const groups = [{ id: 'READY', items: [a,b,c] }, { id: 'INCOMPLETE', items: [{ id: 4, isIncomplete: true }] }]
    const sorted = prioritizePinnedDishes(groups,[56],new Map([[2,[56]],[3,[56]]]))
    expect(sorted[0].items).toEqual([b,c,a])
    expect(groups[0].items).toEqual([a,b,c])
    expect(sorted[1].items[0].isIncomplete).toBe(true)
    expect(sorted[0].items[0]).toBe(b)
  })
  it('preserves API order when no verified ingredient metadata is available', () => {
    const groups = [{ id: 'READY', items: [{ id: 1 }, { id: 2 }] }]
    expect(prioritizePinnedDishes(groups,[56],new Map())).toEqual(groups)
  })
  it('exposes accessible pin state and canonical ID to the caller', async () => {
    const onToggle = vi.fn()
    render(<PinIngredientButton ingredient={{ id: 56, name: 'Sườn heo' }} pinned={false} onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ghim Sườn heo' }))
    await waitFor(() => expect(onToggle).toHaveBeenCalledWith(56))
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed','false')
  })
})
