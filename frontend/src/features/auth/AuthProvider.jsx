import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { me } from '../../lib/api'
import { AuthContext } from './AuthContext'

// status: 'loading' | 'guest' | 'member' | 'blocked'
// blocked: /api/me trả 403, phiên bị đăng xuất; giữ trạng thái này đến lần đăng nhập kế tiếp.
// profileError: 'missing' (409) | 'failed' (lỗi khác) khi đã đăng nhập nhưng chưa lấy được hồ sơ.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [initializing, setInitializing] = useState(Boolean(supabase))
  const [blocked, setBlocked] = useState(false)
  // Kết quả /api/me gắn với user id để biết khi nào còn đang tải.
  const [profileState, setProfileState] = useState({ userId: null, profile: null, error: null })

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'SIGNED_IN') setBlocked(false)
      setSession(next)
      setInitializing(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id ?? null

  useEffect(() => {
    if (!userId) return
    const controller = new AbortController()
    // me.get đọc token mới nhất từ Supabase thay vì giữ bản sao.
    me.get({ signal: controller.signal })
      .then((profile) => setProfileState({ userId, profile, error: null }))
      .catch((error) => {
        if (controller.signal.aborted) return
        if (error.status === 403) {
          setBlocked(true)
          supabase?.auth.signOut().catch(() => {})
          return
        }
        setProfileState({ userId, profile: null, error: error.status === 409 ? 'missing' : 'failed' })
      })
    return () => controller.abort()
  }, [userId])

  const signIn = useCallback(async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(async ({ email, password, displayName }) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: displayName }, emailRedirectTo: window.location.origin },
    })
    if (error) throw error
    // Không có session: cần xác nhận email (hoặc email đã tồn tại, Supabase không báo lỗi). Luôn hiện thông báo trung tính.
    return { needsEmailConfirmation: !data.session }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  // Không tự lưu token: luôn đọc từ Supabase (đã tự làm mới khi hết hạn).
  const getAccessToken = useCallback(async () => {
    if (!supabase) return null
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }, [])

  const value = useMemo(() => {
    const profileReady = profileState.userId === userId
    const profile = session && profileReady ? profileState.profile : null
    const profileError = session && profileReady ? profileState.error : null
    let status = 'guest'
    if (initializing) status = 'loading'
    else if (blocked) status = 'blocked'
    else if (session) status = profileReady ? 'member' : 'loading'
    return {
      configured: Boolean(supabase),
      status,
      initializing,
      session,
      user: session?.user ?? null,
      profile,
      profileError,
      isAuthenticated: Boolean(session) && !blocked,
      signIn, signUp, signOut, getAccessToken,
    }
  }, [initializing, blocked, session, userId, profileState, signIn, signUp, signOut, getAccessToken])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
