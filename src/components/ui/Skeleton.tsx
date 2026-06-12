interface SkeletonProps {
  className?: string
  /** Phase offset in ms — negative delays shift the shimmer sweep so
   *  stacked skeletons read as a cascade instead of a lockstep blink. */
  phase?: number
}

export function Skeleton({ className = '', phase }: SkeletonProps) {
  return (
    <div
      className={`animate-shimmer rounded-[6px] ${className}`}
      style={phase ? { animationDelay: `${-phase}ms` } : undefined}
    />
  )
}

export function SkeletonRow({ phase }: { phase?: number }) {
  return (
    <div className="flex items-center gap-4 py-2.5">
      <Skeleton className="h-3.5 w-1/4" phase={phase} />
      <Skeleton className="h-3.5 w-1/3" phase={phase} />
      <Skeleton className="ml-auto h-3.5 w-16" phase={phase} />
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
        <SkeletonRow key={i} phase={i * 140} />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`space-y-3 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] p-5 ${className}`}
    >
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-2/3" />
    </div>
  )
}
