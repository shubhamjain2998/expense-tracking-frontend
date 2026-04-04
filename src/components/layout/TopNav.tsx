import { NavLink } from 'react-router-dom'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/upload', label: 'Upload' },
  { to: '/review', label: 'Review' },
  { to: '/budget', label: 'Budget' },
  { to: '/settings', label: 'Settings' },
]

export function TopNav() {
  return (
    <nav className="w-full bg-slate-50">
      <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center justify-between px-8">
        <div className="flex items-center gap-8">
          <span className="text-xl font-black tracking-tight text-[#004251]">Personal Finance</span>
          <div className="hidden items-center gap-6 md:flex">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  isActive
                    ? 'border-b-2 border-[#004251] pb-0.5 text-sm font-semibold text-[#004251]'
                    : 'text-sm text-slate-500 transition-colors hover:text-[#004251]'
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="rounded-full p-2 text-[#004251] transition-colors hover:bg-slate-200/50"
            aria-label="Calendar"
          >
            <span className="material-symbols-outlined">calendar_month</span>
          </button>
          <button
            className="rounded-full p-2 text-[#004251] transition-colors hover:bg-slate-200/50"
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#004251] text-xs font-bold text-white">
            U
          </div>
        </div>
      </div>
    </nav>
  )
}
