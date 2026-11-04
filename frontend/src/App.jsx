import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { api } from './lib/api'
import './App.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [initializing, setInitializing] = useState(Boolean(supabase))
  const [mode, setMode] = useState('login')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [authError, setAuthError] = useState('')
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState('')
  const [dishes, setDishes] = useState([])
  const [dishError, setDishError] = useState('')
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(0)
  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      setProfile(null)
      setProfileError('')
      setSession(next)
      setInitializing(false)
    })
    return () => subscription.unsubscribe()
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    api('/dishes', null, controller.signal).then(setDishes).catch(error => {
      if (!controller.signal.aborted) setDishError(error.message)
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [reload])
  useEffect(() => {
    if (!session) return
    const controller = new AbortController()
    api('/me', session.access_token, controller.signal).then(setProfile).catch(error => {
      if (!controller.signal.aborted) setProfileError(error.message)
    })
    return () => controller.abort()
  }, [session])
  async function authenticate(event) {
    event.preventDefault()
    setBusy(true)
    setNotice('')
    setAuthError('')
    const fields = new FormData(event.currentTarget)
    try {
      const credentials = { email: fields.get('email').trim(), password: fields.get('password') }
      const { data, error } = mode === 'signup'
        ? await supabase.auth.signUp({ ...credentials, options: {
          data: { display_name: fields.get('name').trim() }, emailRedirectTo: window.location.origin,
        } }) : await supabase.auth.signInWithPassword(credentials)
      if (error) throw error
      if (mode === 'signup' && !data.session) setNotice('Check your email to confirm your account, then sign in.')
    } catch (error) { setAuthError(error.message) }
    finally { setBusy(false) }
  }
  async function logout() {
    setBusy(true)
    setAuthError('')
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setNotice('You have signed out.')
    } catch (error) { setAuthError(error.message) }
    finally { setBusy(false) }
  }
  return <main>
    <header><a className="brand" href="/">Hôm nay ăn gì<span>?</span></a><span className="tag">A little inspiration for your next meal</span></header>
    <section className="intro"><p className="eyebrow">GOOD FOOD. LESS INDECISION.</p><h1>Your next meal<br />starts here.</h1><p>Discover Vietnamese favourites and find something you’re in the mood for.</p></section>
    <div className="layout">
      <section aria-labelledby="dishes-title">
        <div className="section-title"><h2 id="dishes-title">On the menu</h2><button className="text-button" onClick={() => { setLoading(true); setDishError(''); setReload(n => n + 1) }} disabled={loading}>Refresh</button></div>
        {loading ? <p role="status">Loading dishes…</p> : dishError ? <p className="error" role="alert">{dishError}</p> : dishes.length ? <div className="dish-grid">{dishes.map(dish => <article className="dish" key={dish.ma_mon}><div className="dish-mark" aria-hidden="true">✦</div><h3>{dish.ten_mon}</h3><p>{dish.mo_ta_ngan || 'Something delicious to try.'}</p></article>)}</div> : <p className="empty">No dishes yet. Add the sample data in supabase/seed.sql to get started.</p>}
      </section>
      <aside className="account" aria-labelledby="account-title">
        {!supabase ? <><h2 id="account-title">One quick setup</h2><p>Copy frontend/.env.example to frontend/.env.local, add your Supabase URL and publishable key, then restart Vite.</p></> : initializing ? <p role="status">Restoring your session…</p> : session ? <><p className="eyebrow">YOU’RE SIGNED IN</p><h2 id="account-title">{profile?.ten_hien_thi || 'Welcome back'}</h2><p className="email">{session.user.email}</p>{profile && <p>{profile.vai_tro} · {profile.trang_thai}</p>}{profileError && <p role="alert" className="error">{profileError}</p>}<button disabled={busy} onClick={logout}>Sign out</button></> : <><h2 id="account-title">{mode === 'login' ? 'Welcome back.' : 'Pull up a chair.'}</h2><p>{mode === 'login' ? 'Sign in to your food discovery account.' : 'Create your account and join the table.'}</p><form onSubmit={authenticate}>
        {mode === 'signup' && <label>Display name<input name="name" autoComplete="nickname" required maxLength={80} /></label>}
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        <label>Password<input name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={6} required /></label>
        <button disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
        </form><button className="text-button switch" disabled={busy} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setAuthError(''); setNotice('') }}>{mode === 'login' ? 'New here? Create an account' : 'Already registered? Sign in'}</button></>}
        {notice && <p role="status" className="notice">{notice}</p>}{authError && <p role="alert" className="error">{authError}</p>}
      </aside>
    </div><footer>Hôm nay ăn gì? · Made for everyday appetites.</footer>
  </main>
}
