import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import UserMenu from './UserMenu'
import { vi } from '../i18n/vi'

const links = [
  { to: '/dishes', label: vi.nav.suggest },
  { to: '/by-ingredient', label: vi.nav.byIngredient },
  { to: '/restaurants', label: vi.nav.restaurants },
  { to: '/', label: vi.nav.community, end: true },
]

function navClass({ isActive }) {
  return `inline-flex min-h-11 items-center border-b-[3px] px-1 font-medium no-underline ${
    isActive ? 'border-lemon-gold' : 'border-transparent hover:border-border'
  }`
}

export default function AppLayout() {
  const [menuState, setMenuState] = useState({ open: false, path: '' })
  const location = useLocation()
  // Menu tự đóng khi đổi trang.
  const menuOpen = menuState.open && menuState.path === location.pathname
  const closeMenu = () => setMenuState({ open: false, path: '' })

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-white focus:px-4 focus:py-2">
        {vi.nav.skip}
      </a>
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-5 py-3 md:px-10">
          <Link to="/" className="font-serif text-xl font-semibold text-jungle-green no-underline">
            {vi.brand}<span className="text-lemon-gold">?</span>
          </Link>
          <nav aria-label={vi.nav.main} className="hidden items-center gap-8 md:flex">
            {links.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={navClass}>{l.label}</NavLink>)}
          </nav>
          <div className="flex items-center gap-2">
            <UserMenu />
            <button
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-control border border-border md:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? vi.nav.closeMenu : vi.nav.openMenu}
              onClick={() => setMenuState(menuOpen ? { open: false, path: '' } : { open: true, path: location.pathname })}
            >
              {menuOpen ? <X aria-hidden="true" strokeWidth={1.5} /> : <Menu aria-hidden="true" strokeWidth={1.5} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div id="mobile-menu" className="border-t border-border px-5 pb-3 md:hidden">
            <nav aria-label={vi.nav.main} className="flex flex-col py-2">
              {links.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={navClass} onClick={closeMenu}>{l.label}</NavLink>)}
            </nav>
          </div>
        )}
      </header>
      <main id="main" className="mx-auto w-full max-w-[1240px] flex-1 px-5 py-10 md:px-10">
        <Outlet />
      </main>
      <footer className="bg-jungle-green text-white">
        <div className="mx-auto max-w-[1240px] px-5 py-8 text-sm md:px-10">{vi.footer}</div>
      </footer>
    </div>
  )
}
