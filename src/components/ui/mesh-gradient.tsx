'use client'

import { cn } from '@/lib/utils'

interface MeshGradientProps {
  variant?: 'pink-blue' | 'purple-pink' | 'blue-purple' | 'warm' | 'cool' | 'vibrant-pink' | 'vibrant-blue' | 'vibrant-purple'
  className?: string
  children?: React.ReactNode
  intensity?: 'soft' | 'vibrant'
}

const GRADIENT_VARIANTS = {
  // Soft variants (original)
  'pink-blue': 'bg-gradient-to-br from-pink-200 via-[#E8D5C4] to-blue-300',
  'purple-pink': 'bg-gradient-to-br from-[#E8D5C4] via-pink-200 to-rose-200',
  'blue-purple': 'bg-[#C2703E]',
  'warm': 'bg-gradient-to-br from-amber-100 via-rose-200 to-pink-200',
  'cool': 'bg-gradient-to-br from-cyan-100 via-blue-200 to-[#E8D5C4]',
  // Vibrant variants (new)
  'vibrant-pink': 'bg-gradient-to-br from-pink-400 via-rose-400 to-fuchsia-500',
  'vibrant-blue': 'bg-[#C2703E]',
  'vibrant-purple': 'bg-[#C2703E]',
}

export function MeshGradient({ variant = 'pink-blue', className, children, intensity = 'soft' }: MeshGradientProps) {
  const isVibrant = intensity === 'vibrant' || variant.startsWith('vibrant-')

  return (
    <div className={cn('relative overflow-hidden rounded-2xl', GRADIENT_VARIANTS[variant], className)}>
      {/* Noise overlay for texture - stronger for vibrant gradients */}
      <div
        className={cn(
          'absolute inset-0',
          isVibrant ? 'opacity-40 mix-blend-overlay' : 'opacity-30'
        )}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      {children}
    </div>
  )
}

// Alternative: CSS-only animated mesh gradient with vibrant colors
export function AnimatedMeshGradient({
  className,
  children,
  vibrant = false,
}: {
  className?: string
  children?: React.ReactNode
  vibrant?: boolean
}) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl', className)}>
      <div
        className="absolute inset-0 animate-gradient-shift"
        style={{
          background: vibrant
            ? `
              radial-gradient(at 40% 20%, hsla(24, 52%, 50%, 0.9) 0px, transparent 50%),
              radial-gradient(at 80% 0%, hsla(30, 40%, 55%, 0.8) 0px, transparent 50%),
              radial-gradient(at 0% 50%, hsla(18, 55%, 55%, 0.85) 0px, transparent 50%),
              radial-gradient(at 80% 50%, hsla(35, 45%, 50%, 0.7) 0px, transparent 50%),
              radial-gradient(at 0% 100%, hsla(20, 50%, 50%, 0.8) 0px, transparent 50%),
              radial-gradient(at 80% 100%, hsla(15, 55%, 50%, 0.7) 0px, transparent 50%),
              linear-gradient(to bottom right, hsl(24, 52%, 60%), hsl(30, 40%, 55%))
            `
            : `
              radial-gradient(at 40% 20%, hsla(24, 45%, 70%, 0.8) 0px, transparent 50%),
              radial-gradient(at 80% 0%, hsla(35, 40%, 65%, 0.6) 0px, transparent 50%),
              radial-gradient(at 0% 50%, hsla(18, 50%, 70%, 0.7) 0px, transparent 50%),
              radial-gradient(at 80% 50%, hsla(40, 40%, 65%, 0.5) 0px, transparent 50%),
              radial-gradient(at 0% 100%, hsla(20, 45%, 70%, 0.6) 0px, transparent 50%),
              radial-gradient(at 80% 100%, hsla(15, 50%, 65%, 0.5) 0px, transparent 50%),
              linear-gradient(to bottom right, hsl(24, 40%, 85%), hsl(35, 35%, 85%))
            `,
        }}
      />
      {/* Noise texture for grainy effect */}
      <div
        className={cn('absolute inset-0', vibrant ? 'opacity-40 mix-blend-overlay' : 'opacity-30')}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// Card with gradient header - matches the design reference
export function GradientHeaderCard({
  gradient,
  headerHeight = 'h-24',
  className,
  children,
}: {
  gradient: string
  headerHeight?: string
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100/50', className)}>
      {/* Gradient header */}
      <div className={cn('relative overflow-hidden', headerHeight)}>
        <div className={cn('absolute inset-0', gradient)} />
        {/* Grainy noise texture */}
        <div
          className="absolute inset-0 opacity-40 mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>
      {/* White content area */}
      {children}
    </div>
  )
}
