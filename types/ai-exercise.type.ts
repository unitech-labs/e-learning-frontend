// Bài tập AI (backend: src/new_quiz, docs/AI_EXERCISE_API.md).
// Bài AI sinh ra là một NewQuiz bình thường nên làm bài / kết quả dùng lại
// type của new-quiz; file này chỉ chứa phần riêng của bài tập AI.

export type ExerciseType = 'fill_blank' | 'verb_conjugation' | 'reading' | 'translation' | 'listening'
export type ExerciseLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
export type ExerciseAnswerMode = 'choice' | 'typed'
export type ExerciseReviewStatus = 'pending' | 'approved' | 'rejected'
export type ExerciseAccessReason = 'moderator' | 'course' | 'no_access'

export type ExerciseErrorCode
  = | 'EXERCISE_ACCESS_DENIED'
    | 'EXERCISE_AI_UNAVAILABLE'
    | 'EXERCISE_LISTENING_NOT_AVAILABLE'
    | 'EXERCISE_DAILY_LIMIT_REACHED'
    | 'EXERCISE_JOB_IN_PROGRESS'
    | 'EXERCISE_QUEUE_TIMEOUT'
    | 'EXERCISE_GENERATION_TIMEOUT'
    | 'VALIDATION_ERROR'

export interface ExerciseTopic {
  id: string
  name: string
  description: string
  order: number
}

/** Bản admin có thêm ai_hint (ngữ cảnh đưa vào prompt) và cờ bật/tắt. */
export interface ExerciseTopicAdmin extends ExerciseTopic {
  ai_hint: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ExerciseTypeOption {
  value: ExerciseType
  label: string
  /** false = bài nghe do admin soạn, không gọi AI. */
  ai_generated: boolean
  /** Kiểu trả lời theo trình độ; null với bài nghe. */
  answer_mode: Record<ExerciseLevel, ExerciseAnswerMode> | null
}

export interface ExerciseDailyLimit {
  /** Toàn null = không giới hạn (admin/moderator). */
  limit: number | null
  used: number | null
  remaining: number | null
}

export interface ExerciseOptions {
  access: { can_use: boolean, reason: ExerciseAccessReason }
  topics: ExerciseTopic[]
  levels: ExerciseLevel[]
  exercise_types: ExerciseTypeOption[]
  question_counts: number[]
  daily_limit: ExerciseDailyLimit
}

export interface GenerateExerciseRequest {
  topic_id: string
  level: ExerciseLevel
  exercise_type: ExerciseType
  question_count: number
}

/** Bản xem trước đang viết dở trong lúc AI stream — chưa có đáp án. */
export interface ExercisePreview {
  instructions: string
  passage: string
  questions: Array<{ prompt: string, options: string[] }>
}

export type ExerciseJobStatus = 'queued' | 'running' | 'succeeded' | 'failed'

/**
 * Một lượt soạn bài. AI chạy ở Celery worker; FE poll GET jobs/{id}/.
 * - queued:    queue_position (1 = sắp tới lượt)
 * - running:   progress.stage thinking | writing, progress.preview = bản xem trước
 * - succeeded: quiz = id bài để mở /quizz/{id}
 * - failed:    error.message tiếng Việt, hiển thị thẳng
 */
export interface ExerciseJob {
  id: string
  status: ExerciseJobStatus
  exercise_type: ExerciseType
  level_code: string
  topic: string | null
  topic_name: string | null
  question_count: number
  queue_position: number | null
  progress: { stage: 'thinking' | 'writing', preview: ExercisePreview | null } | null
  quiz: string | null
  error: { error_code: ExerciseErrorCode | string, message: string } | null
  created_at: string
  started_at: string | null
  finished_at: string | null
}

export interface ExerciseApiErrorBody {
  code?: number
  error_code?: ExerciseErrorCode
  message?: string
  /** Lỗi validate: field -> messages. EXERCISE_JOB_IN_PROGRESS: { job } đang chạy để FE theo dõi tiếp. */
  details?: { job?: ExerciseJob, [field: string]: unknown }
}

export interface AdminAIExerciseListItem {
  id: string
  title: string
  level: string
  level_code: string
  topic: string | null
  topic_name: string | null
  exercise_type: ExerciseType
  review_status: ExerciseReviewStatus
  review_note: string
  reviewed_at: string | null
  reviewed_by_name: string | null
  is_published: boolean
  requested_by: number | null
  requested_by_name: string | null
  requested_by_email: string | null
  question_count: number
  attempts_count: number
  ai_model: string
  created_at: string
}

export interface AdminAIExerciseListParams {
  review_status?: ExerciseReviewStatus | ''
  exercise_type?: ExerciseType | ''
  level?: string
  topic?: string
  search?: string
  limit?: number
  offset?: number
}
