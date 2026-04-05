import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <span className="material-symbols-outlined text-outline-variant mb-4 text-6xl">
        search_off
      </span>
      <h1 className="text-on-surface mb-2 text-2xl font-black">Page Not Found</h1>
      <p className="text-on-surface-variant mb-6 text-sm">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        to="/dashboard"
        className="from-primary to-primary-container text-on-primary rounded-xl bg-gradient-to-br px-6 py-2.5 text-sm font-semibold hover:opacity-90"
      >
        Back to Dashboard
      </Link>
    </div>
  )
}
