import type { ListApiResponse } from '~/api/apiClient'
import { useApiClient } from '~/api/apiClient'

export interface GeneralSessionListItem {
  id: string
  classroom: string
  topic: string
  description: string
  start_time: string
  end_time: string
  location: string
  limit: number
  status: string
  classroom_title: string
  course_title: string
  attendance_count: number
  present_count: number
  background_color?: string
  created_at: string
  updated_at: string
}

export interface GeneralSessionDetail {
  id: string
  classroom: {
    id: string
    title: string
    student_count: number
    price: string
    discount_price: string | null
  }
  course: {
    id: string
    title: string
    slug: string
  }
  topic: string
  description: string
  start_time: string
  end_time: string
  location: string
  meeting_link?: string
  meeting_id?: string
  meeting_pass?: string
  limit: number
  status: string
  attendance_count: number
  present_count: number
  background_color?: string
  created_at: string
  updated_at: string
}

export interface GeneralSessionsResponse extends ListApiResponse<GeneralSessionListItem> {}

export interface BulkGenerateSessionsResponse {
  created_count: number
  sessions: Array<{
    id: string
    classroom: string
    topic: string
    description: string
    start_time: string
    end_time: string
    location: string
    limit: number
    status: string
    created_at: string
    updated_at: string
  }>
}

export function useGeneralSessionsApi() {
  const apiClient = useApiClient()

  return {
    getSessions: (params?: {
      start_date?: string
      end_date?: string
      page?: number
      page_size?: number
    }) => apiClient.get<GeneralSessionsResponse>('/sessions/', { params }),

    getSessionDetail: (sessionId: string) =>
      apiClient.get<GeneralSessionDetail>(`/sessions/${sessionId}/`),

    updateSession: (sessionId: string, payload: Partial<GeneralSessionDetail>) =>
      apiClient.patch<GeneralSessionDetail>(`/sessions/${sessionId}/`, payload),

    rescheduleSession: (sessionId: string, payload: {
      start_date: string
      start_time: string
      end_date: string
      end_time: string
    }) => apiClient.post<GeneralSessionDetail>(`/sessions/${sessionId}/reschedule/`, payload),

    bulkGenerateSessions: (payload: { course_id: string, classroom_id: string, number_of_sessions: number }) =>
      apiClient.post<BulkGenerateSessionsResponse>('/sessions/bulk-generate/', payload),
  }
}
