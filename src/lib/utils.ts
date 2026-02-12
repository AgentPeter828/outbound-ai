import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

export function formatPercentage(num: number): string {
  return `${(num * 100).toFixed(1)}%`
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(d)
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function getDomainFromEmail(email: string): string {
  return email.split('@')[1] || ''
}

export function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export const DEAL_STAGES = [
  'prospect',
  'contacted',
  'meeting_booked',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
] as const

export const DEAL_STAGE_LABELS: Record<typeof DEAL_STAGES[number], string> = {
  prospect: 'Prospect',
  contacted: 'Contacted',
  meeting_booked: 'Meeting Booked',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
}

export const DEAL_STAGE_COLORS: Record<typeof DEAL_STAGES[number], string> = {
  prospect: 'bg-gray-100 text-gray-800',
  contacted: 'bg-blue-100 text-blue-800',
  meeting_booked: 'bg-purple-100 text-purple-800',
  proposal: 'bg-yellow-100 text-yellow-800',
  negotiation: 'bg-orange-100 text-orange-800',
  closed_won: 'bg-green-100 text-green-800',
  closed_lost: 'bg-red-100 text-red-800',
}

export const ROLE_TYPES = [
  'champion',
  'decision_maker',
  'influencer',
  'end_user',
] as const

export const ROLE_TYPE_LABELS: Record<typeof ROLE_TYPES[number], string> = {
  champion: 'Champion',
  decision_maker: 'Decision Maker',
  influencer: 'Influencer',
  end_user: 'End User',
}

export const SEQUENCE_STATUSES = [
  'draft',
  'active',
  'paused',
  'completed',
] as const

export const ENROLLMENT_STATUSES = [
  'active',
  'paused',
  'completed',
  'replied',
  'bounced',
  'unsubscribed',
] as const

export const INTERACTION_TYPES = [
  'email_sent',
  'email_received',
  'email_opened',
  'email_clicked',
  'call',
  'meeting',
  'note',
  'stage_change',
] as const

export const REPLY_CLASSIFICATIONS = [
  'interested',
  'not_interested',
  'objection',
  'out_of_office',
  'wrong_person',
  'unsubscribe',
] as const
