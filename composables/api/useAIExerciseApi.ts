import type { ApiError, ListApiResponse } from '~/api/apiClient'
import type { NewQuiz, NewQuizDetail } from '~/composables/api/useNewQuizApi'
import type {
  AdminAIExerciseListItem,
  AdminAIExerciseListParams,
  ExerciseApiErrorBody,
  ExerciseErrorCode,
  ExerciseJob,
  ExerciseOptions,
  ExerciseTopic,
  ExerciseTopicAdmin,
  GenerateExerciseRequest,
} from '~/types/ai-exercise.type'
import { useApiClient } from '~/api/apiClient'

/** Bài AI cho trang admin: chi tiết quiz + thông tin người tạo / người duyệt. */
export type AdminAIExerciseDetail = NewQuizDetail & {
  requested_by_name: string | null
  requested_by_email: string | null
  reviewed_by: number | null
  reviewed_by_name: string | null
  reviewed_at: string | null
  review_note: string
  ai_model: string
}

/** Khoảng cách giữa hai lần hỏi trạng thái job (ms). Endpoint chỉ đọc Redis nên rất nhẹ. */
export const EXERCISE_JOB_POLL_INTERVAL = 1500
/** Lỗi mạng liên tiếp tối đa trước khi bỏ cuộc theo dõi job. */
const MAX_POLL_FAILURES = 5

/** Bóc `error_code` / `message` tiếng Việt mà backend trả sẵn. */
export function parseExerciseError(error: unknown): {
  errorCode: ExerciseErrorCode | null
  message: string
  statusCode: number | null
} {
  const apiError = error as ApiError | undefined
  const body = apiError?.data as ExerciseApiErrorBody | undefined
  // details có thể chứa object (vd `job` khi EXERCISE_JOB_IN_PROGRESS) — chỉ lấy chuỗi thông báo.
  const detailMessage = body?.details
    ? Object.values(body.details).flat().find((value): value is string => typeof value === 'string')
    : undefined

  return {
    errorCode: body?.error_code ?? null,
    message: detailMessage || body?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.',
    statusCode: apiError?.statusCode ?? null,
  }
}

function buildQuery(params?: Record<string, string | number | undefined>): string {
  if (!params)
    return ''
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '')
      query.set(key, String(value))
  })
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
}

export function isTerminalJob(job: ExerciseJob) {
  return job.status === 'succeeded' || job.status === 'failed'
}

export function useAIExerciseApi() {
  const apiClient = useApiClient()

  return {
    /** Dữ liệu màn chọn bài + quyền + hạn mức. Không bị chặn bởi quyền. */
    getOptions: () => apiClient.get<ExerciseOptions>('/new_quiz/ai-exercises/options/'),

    /**
     * Tạo lượt soạn bài. Bài AI: 202 + job `queued` (AI chạy ở worker, poll tiếp).
     * Nghe hiểu: 201 + job `succeeded` có sẵn `quiz`. Đang có job dở: lỗi 409
     * EXERCISE_JOB_IN_PROGRESS kèm `details.job` để theo dõi tiếp job đó.
     */
    createJob: (body: GenerateExerciseRequest) =>
      apiClient.post<ExerciseJob>('/new_quiz/ai-exercises/jobs/', body),

    getJob: (id: string) =>
      apiClient.get<ExerciseJob>(`/new_quiz/ai-exercises/jobs/${id}/`),

    /** Job đang chờ/đang chạy của user — gọi khi mở trang để tiếp tục hiển thị. */
    getActiveJob: () =>
      apiClient.get<{ job: ExerciseJob | null }>('/new_quiz/ai-exercises/jobs/active/'),

    /**
     * Poll tới khi job xong (succeeded/failed) và trả job cuối cùng. `onUpdate`
     * nhận mỗi lần có trạng thái mới. Lỗi mạng tạm thời thì thử lại; huỷ qua `signal`
     * (vd rời trang — job vẫn tiếp tục ở server).
     */
    async followJob(
      jobId: string,
      { onUpdate, signal }: { onUpdate?: (job: ExerciseJob) => void, signal?: AbortSignal } = {},
    ): Promise<ExerciseJob> {
      let failures = 0
      while (true) {
        if (signal?.aborted)
          throw new DOMException('Aborted', 'AbortError')
        try {
          const job = await apiClient.get<ExerciseJob>(`/new_quiz/ai-exercises/jobs/${jobId}/`)
          failures = 0
          onUpdate?.(job)
          if (isTerminalJob(job))
            return job
        }
        catch (error) {
          if (++failures >= MAX_POLL_FAILURES)
            throw error
        }
        await sleep(EXERCISE_JOB_POLL_INTERVAL, signal)
      }
    },

    getMine: (params?: { exercise_type?: string, level?: string, topic?: string, limit?: number, offset?: number }) =>
      apiClient.get<ListApiResponse<NewQuiz>>(`/new_quiz/ai-exercises/mine/${buildQuery(params)}`),

    // ─── Chủ đề ────────────────────────────────────────────────
    getTopics: (params?: { limit?: number, offset?: number }) =>
      apiClient.get<ListApiResponse<ExerciseTopicAdmin | ExerciseTopic>>(`/new_quiz/exercise-topics/${buildQuery(params)}`),

    createTopic: (data: Partial<ExerciseTopicAdmin>) =>
      apiClient.post<ExerciseTopicAdmin>('/new_quiz/exercise-topics/', data),

    updateTopic: (id: string, data: Partial<ExerciseTopicAdmin>) =>
      apiClient.patch<ExerciseTopicAdmin>(`/new_quiz/exercise-topics/${id}/`, data),

    deleteTopic: (id: string) =>
      apiClient.delete<void>(`/new_quiz/exercise-topics/${id}/`),

    // ─── Admin: hàng chờ duyệt ─────────────────────────────────
    adminList: (params?: AdminAIExerciseListParams) =>
      apiClient.get<ListApiResponse<AdminAIExerciseListItem>>(
        `/new_quiz/admin/ai-exercises/${buildQuery(params as Record<string, string | number | undefined>)}`,
      ),

    adminGet: (id: string) =>
      apiClient.get<AdminAIExerciseDetail>(`/new_quiz/admin/ai-exercises/${id}/`),

    /** Duyệt = publish vào kho bài chung. */
    approve: (id: string, note = '') =>
      apiClient.post<AdminAIExerciseDetail>(`/new_quiz/admin/ai-exercises/${id}/approve/`, { note }),

    /** Từ chối = ẩn khỏi kho, không xoá kết quả học viên đã làm. */
    reject: (id: string, note = '') =>
      apiClient.post<AdminAIExerciseDetail>(`/new_quiz/admin/ai-exercises/${id}/reject/`, { note }),
  }
}
