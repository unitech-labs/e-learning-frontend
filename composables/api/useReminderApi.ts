import { useApiClient } from '~/api/apiClient'

export interface ReminderConfig {
  is_enabled: boolean
  reminder_minutes_before: number
  run_every_minutes: number
  updated_at: string
  updated_by_email: string | null
}

export interface SessionReminderSession {
  id: string
  topic: string
  start_time: string
}

export interface SessionReminderClassroom {
  id: string
  title: string
}

export interface SessionReminderUser {
  id: number
  username: string
  email: string
  email_linked: string
}

export interface SessionReminder {
  id: string
  session: SessionReminderSession
  classroom: SessionReminderClassroom
  user: SessionReminderUser
  email_sent_to: string
  sent_at: string
}

export interface SessionReminderListResponse {
  count: number
  next: string | null
  previous: string | null
  results: SessionReminder[]
}

export interface ReminderRunLogEmailEntry {
  email: string
  username: string
  session_topic: string
}

export interface ReminderRunLogSessionEntry {
  session_id: string
  topic: string
  classroom: string
  start_time: string
  emails_count?: number
}

export interface ReminderRunLog {
  id: string
  started_at: string
  finished_at: string
  status: 'success' | 'skipped' | 'error'
  sessions_scanned: ReminderRunLogSessionEntry[]
  sessions_matched: ReminderRunLogSessionEntry[]
  emails_queued: ReminderRunLogEmailEntry[]
  emails_queued_count: number
  error_message: string
}

export interface ReminderRunLogListResponse {
  count: number
  next: string | null
  previous: string | null
  results: ReminderRunLog[]
}

export function useReminderApi() {
  const apiClient = useApiClient()

  return {
    getConfig: () =>
      apiClient.get<ReminderConfig>('/notifications/reminder-config/'),

    updateConfig: (data: { is_enabled?: boolean, reminder_minutes_before?: number, run_every_minutes?: number }) =>
      apiClient.patch<ReminderConfig>('/notifications/reminder-config/', data),

    getReminders: (params?: {
      session_id?: string
      classroom_id?: string
      date_from?: string
      date_to?: string
      limit?: number
      offset?: number
    }) => {
      const query = new URLSearchParams()
      if (params?.session_id) query.set('session_id', params.session_id)
      if (params?.classroom_id) query.set('classroom_id', params.classroom_id)
      if (params?.date_from) query.set('date_from', params.date_from)
      if (params?.date_to) query.set('date_to', params.date_to)
      if (params?.limit) query.set('limit', String(params.limit))
      if (params?.offset) query.set('offset', String(params.offset))
      const qs = query.toString()
      return apiClient.get<SessionReminderListResponse>(`/notifications/session-reminders/${qs ? `?${qs}` : ''}`)
    },

    getRunLogs: (params?: {
      status?: string
      date_from?: string
      date_to?: string
      limit?: number
      offset?: number
    }) => {
      const query = new URLSearchParams()
      if (params?.status) query.set('status', params.status)
      if (params?.date_from) query.set('date_from', params.date_from)
      if (params?.date_to) query.set('date_to', params.date_to)
      if (params?.limit) query.set('limit', String(params.limit))
      if (params?.offset) query.set('offset', String(params.offset))
      const qs = query.toString()
      return apiClient.get<ReminderRunLogListResponse>(`/notifications/reminder-logs/${qs ? `?${qs}` : ''}`)
    },
  }
}
