import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-skeleton rounded-md',
        className
      )}
    />
  )
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-6 space-y-4', className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  )
}

export function SkeletonSection({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white overflow-hidden', className)}>
      <div className="flex items-center gap-3 p-4">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-3 w-2/5" />
        </div>
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
    </div>
  )
}

export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-4', className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  )
}
