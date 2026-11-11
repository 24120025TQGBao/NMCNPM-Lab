import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import { AuthContext } from './AuthContext'

// Bản tối thiểu của FE01 để giữ chức năng đăng nhập hiện có.
// FE02/FE03 sẽ bổ sung trạng thái blocked, RequireAuth, RequireRole và ánh xạ lỗi.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [initializing, setInitializing] = useState(Boolean(supabase))
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      setProfile(null)
      setSession(next)
      setInitializing(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    const controller = new AbortController()
    api('/me', session.access_token, controller.signal).then(setProfile).catch(() => {})
    return () => controller.abort()
  }, [session])

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
    return { needsEmailConfirmation: !data.session }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const value = useMemo(() => ({
    configured: Boolean(supabase),
    initializing,
    session,
    user: session?.user ?? null,
    profile,
    isAuthenticated: Boolean(session),
    signIn, signUp, signOut,
  }), [initializing, session, profile, signIn, signUp, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
