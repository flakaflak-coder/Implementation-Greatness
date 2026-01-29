import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export function getPhaseLabel(phase: number): string {
  const labels: Record<number, string> = {
    1: 'Kickoff',
    2: 'Process Design',
    3: 'Technical Deep-dive',
    4: 'Sign-off',
  }
  return labels[phase] || `Phase ${phase}`
}

export function getDesignWeekProgress(currentPhase: number): number {
  return ((currentPhase - 1) / 3) * 100
}

export function calculateCompleteness(items: { status: string }[]): number {
  if (items.length === 0) return 0
  const confirmed = items.filter(i => i.status === 'CONFIRMED').length
  return Math.round((confirmed / items.length) * 100)
}
