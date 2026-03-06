import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)

const VIETNAM_TZ = 'Asia/Ho_Chi_Minh'

/**
 * Parse due_date from API. Due dates are stored in Vietnam timezone.
 * - If due_date has explicit timezone (Z, +07:00, etc), parse as-is
 * - If no timezone, treat as Vietnam time (Asia/Ho_Chi_Minh)
 */
function parseDueDate(dueDate: string): dayjs.Dayjs {
  if (!dueDate) return dayjs().add(1, 'year') // far future if missing
  const s = String(dueDate).trim()
  // Has explicit timezone: Z, +HH:mm, -HH:mm
  if (/Z$|[-+]\d{2}:?\d{2}$/.test(s)) {
    return dayjs(s)
  }
  // No timezone: treat as Vietnam time
  return dayjs.tz(s, VIETNAM_TZ)
}

/**
 * Check if homework is overdue (client-side).
 * Converts due_date (Vietnam time) to correct instant, compares with local "now".
 */
export function isHomeworkOverdue(dueDate: string): boolean {
  const due = parseDueDate(dueDate)
  return dayjs().isAfter(due)
}

/**
 * Format due_date for display in user's local timezone.
 */
export function formatHomeworkDueDate(dueDate: string, format = 'DD/MM/YYYY HH:mm'): string {
  const due = parseDueDate(dueDate)
  return due.local().format(format)
}

/**
 * Get human-readable time remaining until deadline, or null if overdue.
 */
export function getHomeworkTimeRemaining(dueDate: string): string | null {
  const due = parseDueDate(dueDate).local()
  const now = dayjs()
  if (due.isBefore(now)) return null
  return due.from(now, true)
}
