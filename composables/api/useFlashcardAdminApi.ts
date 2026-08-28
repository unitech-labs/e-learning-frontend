import type { ListApiResponse } from '~/api/apiClient'
import type {
  AIProviderConfig,
  FlashcardAccessRequest,
  FlashcardAdminDetail,
  FlashcardFeedbackItem,
  FlashcardListItem,
} from '~/types/flashcard.type'
import { useApiClient } from '~/api/apiClient'

function query(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params)
    return ''
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '')
      qs.set(key, String(value))
  })
  const s = qs.toString()
  return s ? `?${s}` : ''
}

/** API quản trị Flashcard — chỉ tài khoản is_admin / is_moderator gọi được. */
export function useFlashcardAdminApi() {
  const apiClient = useApiClient()

  return {
    // ─── Kiểm duyệt thẻ ────────────────────────────────────────
    listCards: (params?: { status?: string, search?: string, has_feedback?: boolean, limit?: number, offset?: number }) =>
      apiClient.get<ListApiResponse<FlashcardListItem>>(`/flashcards/admin/${query(params)}`),

    getCard: (id: string) =>
      apiClient.get<FlashcardAdminDetail>(`/flashcards/admin/${id}/`),

    /** Sửa nội dung thẻ (field nào gửi field đó). Backend tự đánh dấu edited_by_admin. */
    updateCard: (id: string, payload: Record<string, unknown>) =>
      apiClient.patch<FlashcardAdminDetail>(`/flashcards/admin/${id}/`, payload),

    approveCard: (id: string) =>
      apiClient.post<FlashcardAdminDetail>(`/flashcards/admin/${id}/approve/`),

    /** Từ chối = XOÁ thẻ. Lần tra sau AI sinh lại từ đầu. */
    rejectCard: (id: string, reason: string) =>
      apiClient.post<{ deleted: boolean, word: string }>(`/flashcards/admin/${id}/reject/`, { reason }),

    // ─── Yêu cầu cấp quyền ─────────────────────────────────────
    listAccessRequests: (params?: { status?: string, search?: string, limit?: number, offset?: number }) =>
      apiClient.get<ListApiResponse<FlashcardAccessRequest>>(`/flashcards/admin/access-requests/${query(params)}`),

    approveAccessRequest: (id: string, adminNote = '') =>
      apiClient.post<FlashcardAccessRequest>(`/flashcards/admin/access-requests/${id}/approve/`, { admin_note: adminNote }),

    rejectAccessRequest: (id: string, adminNote = '') =>
      apiClient.post<FlashcardAccessRequest>(`/flashcards/admin/access-requests/${id}/reject/`, { admin_note: adminNote }),

    /** Thu hồi quyền đã cấp — chỉ gọi được trên yêu cầu đang approved. */
    revokeAccessRequest: (id: string, adminNote = '') =>
      apiClient.post<FlashcardAccessRequest>(`/flashcards/admin/access-requests/${id}/revoke/`, { admin_note: adminNote }),

    // ─── Feedback nội dung sai ─────────────────────────────────
    listFeedback: (params?: { status?: string, limit?: number, offset?: number }) =>
      apiClient.get<ListApiResponse<FlashcardFeedbackItem>>(`/flashcards/admin/feedback/${query(params)}`),

    resolveFeedback: (id: string, status: 'resolved' | 'dismissed', adminNote = '') =>
      apiClient.post<FlashcardFeedbackItem>(`/flashcards/admin/feedback/${id}/resolve/`, { status, admin_note: adminNote }),

    // ─── Cấu hình AI (mã hoá key phía backend) ─────────────────
    getAIConfig: () => apiClient.get<AIProviderConfig>('/ai/config/'),

    /** Bỏ trống `api_key` = giữ key cũ. Truyền chuỗi rỗng có chủ đích = xoá key. */
    updateAIConfig: (payload: Partial<AIProviderConfig> & { api_key?: string }) =>
      apiClient.patch<AIProviderConfig>('/ai/config/', payload),

    testAIConfig: () => apiClient.post<{ ok: boolean, message: string }>('/ai/config/test/'),
  }
}
