import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <span className="material-symbols-outlined mb-4 text-6xl text-[#bfc8cc]">search_off</span>
      <h1 className="mb-2 text-2xl font-black text-[#181c20]">Page Not Found</h1>
      <p className="mb-6 text-sm text-[#3f484c]">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link
        to="/dashboard"
        className="rounded-xl bg-gradient-to-br from-[#004251] to-[#005b6f] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
      >
        Back to Dashboard
      </Link>
    </div>
  )
}
