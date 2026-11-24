import { createContext, useContext, useReducer, useEffect } from 'react'
import { loadSession, sessionReducer, STORAGE_KEY } from './sessionReducer'

const SuggestSessionContext = createContext(null)

export function SuggestSessionProvider({ children }) {
  const [state, dispatch] = useReducer(sessionReducer, null, loadSession)

  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // sessionStorage bị chặn hoặc đầy, bỏ qua lỗi an toàn
    }
  }, [state])

  return (
    <SuggestSessionContext.Provider value={{ state, dispatch }}>
      {children}
    </SuggestSessionContext.Provider>
  )
}

export function useSuggestSession() {
  const context = useContext(SuggestSessionContext)
  if (!context) {
    throw new Error('useSuggestSession must be used within a SuggestSessionProvider')
  }
  return context
}
