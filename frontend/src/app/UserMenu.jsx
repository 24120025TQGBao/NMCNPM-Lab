import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bookmark, FilePen, LogIn, LogOut, Shield, User, UserPlus } from 'lucide-react'
import { useAuth } from '../features/auth/useAuth'
import { ROLE_ADMIN } from '../lib/config'
import { vi } from '../i18n/vi'

const itemClass =
  'flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-left font-medium no-underline hover:bg-surface'

function Avatar({ name, imageUrl, isAdmin, guest }) {
  return (
    <span className="relative inline-flex">
      <span className="inline-flex size-11 items-center justify-center overflow-hidden rounded-full border border-border bg-lime-zest font-semibold text-ink">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="size-full object-cover" />
        ) : guest ? (
          <User aria-hidden="true" size={22} strokeWidth={1.5} />
        ) : (
          <span aria-hidden="true">{(name || '?').trim().charAt(0).toUpperCase()}</span>
        )}
      </span>
      {isAdmin && (
        <span aria-hidden="true" className="absolute -right-1 -bottom-1 inline-flex size-5 items-center justify-center rounded-full border-2 border-white bg-lemon-gold text-ink">
          <Shield size={10} strokeWidth={2.5} />
        </span>
      )}
    </span>
  )
}

export default function UserMenu() {
  const { initializing, isAuthenticated, profile, user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const rootRef = useRef(null)
  const menuId = useId()
  const location = useLocation()
  const [openedAt, setOpenedAt] = useState('')
  // Menu tự đóng khi đổi trang.
  const isOpen = open && openedAt === location.pathname

  useEffect(() => {
    if (!isOpen) return
    const onPointer = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        rootRef.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen])

  if (initializing) return <span role="status" className="sr-only">{vi.account.restoring}</span>

  const name = profile?.ten_hien_thi || user?.user_metadata?.display_name || vi.account.memberFallback
  const isAdmin = isAuthenticated && profile?.vai_tro === ROLE_ADMIN

  async function logout() {
    setBusy(true)
    try { await signOut() } finally { setBusy(false); setOpen(false) }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="rounded-full"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={isAuthenticated ? `${vi.account.menu}: ${name}${isAdmin ? `, ${vi.account.adminBadge}` : ''}` : vi.account.guestMenu}
        onClick={() => { setOpen(!isOpen); setOpenedAt(location.pathname) }}
      >
        <Avatar name={name} imageUrl={profile?.anh_dai_dien} isAdmin={isAdmin} guest={!isAuthenticated} />
      </button>
      {isOpen && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 rounded-card border border-border bg-white p-2 shadow-card"
        >
          {isAuthenticated ? (
            <>
              <div className="px-3 py-2">
                <p className="truncate font-semibold">{name}</p>
                {isAdmin && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-lemon-gold px-2 py-0.5 text-sm font-semibold text-ink">
                    <Shield aria-hidden="true" size={14} strokeWidth={2} />
                    {vi.account.adminBadge}
                  </span>
                )}
              </div>
              <hr className="my-1 border-border" />
              <Link role="menuitem" to="/saved" className={itemClass}><Bookmark aria-hidden="true" size={18} strokeWidth={1.5} />{vi.account.saved}</Link>
              <Link role="menuitem" to="/me/drafts" className={itemClass}><FilePen aria-hidden="true" size={18} strokeWidth={1.5} />{vi.account.drafts}</Link>
              {isAdmin && (
                <Link role="menuitem" to="/admin/reports" className={itemClass}><Shield aria-hidden="true" size={18} strokeWidth={1.5} />{vi.account.admin}</Link>
              )}
              <hr className="my-1 border-border" />
              <button role="menuitem" type="button" className={itemClass} onClick={logout} disabled={busy}>
                <LogOut aria-hidden="true" size={18} strokeWidth={1.5} />
                {busy ? vi.account.loggingOut : vi.account.logout}
              </button>
            </>
          ) : (
            <>
              <Link role="menuitem" to="/login" className={itemClass}><LogIn aria-hidden="true" size={18} strokeWidth={1.5} />{vi.account.login}</Link>
              <Link role="menuitem" to="/register" className={itemClass}><UserPlus aria-hidden="true" size={18} strokeWidth={1.5} />{vi.account.register}</Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}
