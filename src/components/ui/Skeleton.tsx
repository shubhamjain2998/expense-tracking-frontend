interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-shimmer ${className}`} style={{ borderRadius: 6 }} />
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-2.5">
      <Skeleton className="h-3.5 w-1/4" />
      <Skeleton className="h-3.5 w-1/3" />
      <Skeleton className="ml-auto h-3.5 w-16" />
    </div>
  )
}

interface SkeletonTableProps {
  rows?: number
}

export function SkeletonTable({ rows = 5 }: SkeletonTableProps) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`space-y-3 ${className}`}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-lg)',
        padding: 20,
      }}
    >
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-2/3" />
    </div>
  )
}
