// Avatar generation using DiceBear
// Creates consistent, fun avatars for Digital Employees

type AvatarStyle = 'bottts' | 'botttsNeutral' | 'shapes' | 'thumbs' | 'fun-emoji'

interface AvatarOptions {
  seed: string
  style?: AvatarStyle
  size?: number
  backgroundColor?: string
}

// Generate avatar URL using DiceBear API
export function getAvatarUrl({
  seed,
  style = 'bottts',
  size = 80,
  backgroundColor,
}: AvatarOptions): string {
  const params = new URLSearchParams()
  if (size) params.set('size', size.toString())
  if (backgroundColor) params.set('backgroundColor', backgroundColor)

  // Use DiceBear API for robot-style avatars
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&${params.toString()}`
}

// Get avatar for a Digital Employee (uses DE id as seed for consistency)
export function getDEAvatar(deId: string, deName: string): string {
  // Combine ID and name for unique but consistent avatars
  return getAvatarUrl({
    seed: `${deId}-${deName}`,
    style: 'bottts', // Robot style - perfect for Digital Employees!
    size: 80,
  })
}

// Predefined background colors for DE status
export const statusColors = {
  LIVE: '#10b981', // emerald-500
  DESIGN: '#6366f1', // indigo-500
  ONBOARDING: '#f59e0b', // amber-500
  UAT: '#8b5cf6', // violet-500
  PAUSED: '#6b7280', // gray-500
} as const

// Get a fun greeting for the DE based on their status
export function getDEGreeting(status: string, name: string): string {
  const greetings: Record<string, string[]> = {
    LIVE: [
      `${name} is crushing it!`,
      `${name} is hard at work`,
      `${name} is on fire!`,
    ],
    DESIGN: [
      `${name} is being designed`,
      `Building ${name}...`,
      `${name} is taking shape`,
    ],
    ONBOARDING: [
      `${name} is learning the ropes`,
      `Training ${name}...`,
      `${name} is almost ready`,
    ],
    UAT: [
      `${name} is being tested`,
      `${name} in final checks`,
      `Almost there, ${name}!`,
    ],
    PAUSED: [
      `${name} is taking a break`,
      `${name} is on standby`,
    ],
  }

  const options = greetings[status] || [`${name}`]
  return options[Math.floor(Math.random() * options.length)]
}

// Generate achievement messages
export function getAchievementMessage(type: string, data?: Record<string, unknown>): string {
  const messages: Record<string, string> = {
    'first-live': '🎉 First DE went live!',
    'all-healthy': '💚 All DEs are healthy!',
    'streak-5': '🔥 5-day healthy streak!',
    'streak-10': '🔥🔥 10-day healthy streak!',
    '100-transactions': `🎯 ${data?.name || 'DE'} processed 100 transactions!`,
    '1000-transactions': `🏆 ${data?.name || 'DE'} processed 1000 transactions!`,
    'design-complete': `✅ ${data?.name || 'DE'} completed Design Week!`,
    'uat-passed': `🎊 ${data?.name || 'DE'} passed UAT!`,
  }

  return messages[type] || '🌟 Achievement unlocked!'
}
