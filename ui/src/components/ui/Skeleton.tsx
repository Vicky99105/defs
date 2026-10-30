export type SkeletonProps = {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

export type ChartSkeletonProps = {
  /** Tailwind height class matching the chart it stands in for. */
  heightClass: string
}

/** Stands in for a chart body while data or the chart code loads. */
export function ChartSkeleton({ heightClass }: ChartSkeletonProps) {
  return (
    <div className={`flex ${heightClass} flex-col justify-end gap-2 pt-2`} aria-hidden="true">
      <Skeleton className="flex-1 rounded-lg" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}

export type CardSkeletonProps = {
  heightClass: string
  className?: string
}

export function CardSkeleton({ heightClass, className = '' }: CardSkeletonProps) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5 ${className}`}
      aria-busy="true"
      aria-label="Loading"
    >
      <Skeleton className="mb-4 h-3.5 w-32" />
      <ChartSkeleton heightClass={heightClass} />
      <Skeleton className="mt-4 h-3 w-1/2" />
    </div>
  )
}
