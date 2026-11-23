import { describe, it, expect } from 'vitest'
import { sessionReducer } from './sessionReducer'

describe('SuggestSessionContext sessionReducer', () => {
  const initialState = {
    suggest: {
      chips: [],
      region: null,
      history: [],
      index: -1,
      skippedIds: [],
    },
    match: {
      ingredients: [],
      pantry: true,
      results: null,
      queryKey: null,
    },
  }

  it('resets history and index when changing suggest chips', () => {
    const populated = {
      ...initialState,
      suggest: {
        ...initialState.suggest,
        chips: ['OLD'],
        history: [{ id: 1, name: 'Món 1' }],
        index: 0,
      },
    }

    const next = sessionReducer(populated, {
      type: 'SET_SUGGEST_CHIPS',
      payload: ['TROI_MUA', 'LUOI_NAU'],
    })

    expect(next.suggest.chips).toEqual(['TROI_MUA', 'LUOI_NAU'])
    expect(next.suggest.history).toEqual([])
    expect(next.suggest.index).toBe(-1)
  })

  it('pushes new dish into history and advances index without duplicates', () => {
    const state1 = sessionReducer(initialState, {
      type: 'PUSH_SUGGEST_HISTORY',
      payload: { id: 10, name: 'Món A' },
    })
    expect(state1.suggest.history).toHaveLength(1)
    expect(state1.suggest.index).toBe(0)

    const state2 = sessionReducer(state1, {
      type: 'PUSH_SUGGEST_HISTORY',
      payload: { id: 20, name: 'Món B' },
    })
    expect(state2.suggest.history).toHaveLength(2)
    expect(state2.suggest.index).toBe(1)

    // Push duplicate id: không tăng length
    const stateDup = sessionReducer(state2, {
      type: 'PUSH_SUGGEST_HISTORY',
      payload: { id: 20, name: 'Món B' },
    })
    expect(stateDup.suggest.history).toHaveLength(2)
  })

  it('updates match ingredients and pantry toggle', () => {
    const s1 = sessionReducer(initialState, {
      type: 'SET_MATCH_INGREDIENTS',
      payload: [{ id: 1, name: 'Cà chua' }],
    })
    expect(s1.match.ingredients).toEqual([{ id: 1, name: 'Cà chua' }])

    const s2 = sessionReducer(s1, {
      type: 'SET_MATCH_PANTRY',
      payload: false,
    })
    expect(s2.match.pantry).toBe(false)
  })
})
