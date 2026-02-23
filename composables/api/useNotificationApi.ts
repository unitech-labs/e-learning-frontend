import { useApiClient } from '~/api/apiClient'

export interface NotificationSender {
  id: number
  full_name: string
  avatar: string | null
}

export interface NotificationComment {
  id: string
  content: string
  lesson_id: string
  lesson_title: string
  course_id: string
  course_title: string
}

export interface NotificationOrder {
  id: string
  invoice_code: string
  course_id: string
  course_title: string
  classroom_id: string | null
  classroom_title: string | null
  price_amount: string
  price_currency: string
  status: 'pending' | 'complete' | 'cancel'
}

export interface Notification {
  id: string
  notification_type: 'comment' | 'reply' | 'order'
  sender: NotificationSender | null
  comment: NotificationComment | null
  order: NotificationOrder | null
  is_read: boolean
  created_at: string
}

export interface NotificationListResponse {
  count: number
  next: string | null
  previous: string | null
  results: Notification[]
}

export function useNotificationApi() {
  const apiClient = useApiClient()

  return {
    getNotifications: (params?: { limit?: number, offset?: number }) => {
      const query = new URLSearchParams()
      if (params?.limit) query.set('limit', String(params.limit))
      if (params?.offset) query.set('offset', String(params.offset))
      const qs = query.toString()
      return apiClient.get<NotificationListResponse>(`/notifications/${qs ? `?${qs}` : ''}`)
    },

    getUnreadCount: () =>
      apiClient.get<{ unread_count: number }>('/notifications/unread-count/'),

    markAsRead: (id: string) =>
      apiClient.patch<Notification>(`/notifications/${id}/read/`, {}),

    markAllAsRead: () =>
      apiClient.post<{ marked_read: number }>('/notifications/read-all/', {}),
  }
}
