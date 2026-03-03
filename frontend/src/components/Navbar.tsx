import { NavLink } from 'react-router-dom'

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-md px-3 py-2 text-sm font-medium transition',
    isActive
      ? 'bg-slate-900 text-white'
      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ')

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-sm font-semibold text-white">
            CC
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-900">
              Cloud Compass
            </div>
            <div className="hidden text-xs text-slate-600 sm:block">
              Your AI-powered cloud consultant
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          <NavLink to="/" className={navLinkClassName} end>
            Home
          </NavLink>
          <NavLink
            to="/demo"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Try Us!
          </NavLink>
        </nav>
      </div>
    </header>
  )
}

