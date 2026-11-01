import type { NewQuizQuestionCreate, QuizSourcePage } from '~/composables/api/useNewQuizApi'
import type { ExerciseLevel } from '~/types/ai-exercise.type'
import { useApiClient } from '~/api/apiClient'

/** Số trang tối đa mỗi lần AI đọc đề (khớp backend quiz_import.MAX_PAGES). */
export const QUIZ_IMPORT_MAX_PAGES = 12
// Hỏi dày để giáo viên thấy câu hỏi hiện ra gần như trực tiếp (endpoint chỉ đọc Redis).
const POLL_INTERVAL = 1000
const MAX_POLL_FAILURES = 5

/** Câu hỏi nháp AI đọc được — cùng định dạng API tạo quiz, chưa có `order`/`score`. */
export type ImportedQuestion = Omit<NewQuizQuestionCreate, 'order' | 'score'> & {
  section: string
  /** Nguồn đáp án AI điền; 'none' = chưa có đáp án (AI không nghe được audio nên không tự đoán). */
  answer_source?: 'none' | 'pasted_key' | 'answer_page'
  /** Ảnh thứ mấy (trong các trang đã gửi) chứa đáp án, khi `answer_source = 'answer_page'`. */
  answer_page?: number | null
}

export interface QuizImportResult {
  title: string
  level: ExerciseLevel | ''
  questions: ImportedQuestion[]
  /** Số câu chưa có đáp án (AI không nghe được audio nên không tự đoán). */
  missing_answers: number
  warnings: string[]
}

/** Kết quả hộp thoại nhập đề PDF gửi cho trình soạn. */
export interface PdfImportPayload {
  /** Các trang đã gửi AI, theo thứ tự — `source_page` của câu hỏi trỏ vào đây (từ 1). */
  pages: QuizSourcePage[]
  result: QuizImportResult
  mode: 'replace' | 'append'
}

/** Câu AI đã viết (câu cuối có thể đang viết dở). `page`: ảnh thứ mấy trong các trang đã gửi. */
export interface QuizImportPreviewQuestion {
  section: string
  page: number | null
  kind: 'choice' | 'fill' | ''
  prompt: string
  has_answer: boolean
}

/** Tiến độ trực tiếp khi job chưa xong. */
export interface QuizImportProgress {
  stage: 'queued' | 'preparing' | 'reading' | 'writing'
  pages_done?: number
  pages_total?: number
  /** Model không nhận ảnh — AI đọc lại chỉ từ chữ trong PDF. */
  text_only?: boolean
  preview?: { title: string, questions: QuizImportPreviewQuestion[] }
}

export interface QuizImportJob {
  id: string
  status: 'queued' | 'running' | 'succeeded' | 'failed'
  image_urls: string[]
  progress: QuizImportProgress | null
  result: QuizImportResult | null
  error: { code: string, message: string } | null
  created_at: string
  started_at: string | null
  finished_at: string | null
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

export function useQuizImportApi() {
  const apiClient = useApiClient()

  return {
    createImport: (body: { image_urls: string[], page_texts: string[], answer_key: string }) =>
      apiClient.post<QuizImportJob>('/new_quiz/quiz-imports/', body),

    /** Poll tới khi AI đọc xong (succeeded/failed); `onUpdate` nhận mỗi trạng thái mới. Lỗi mạng tạm thời thì thử lại. */
    async followImport(
      jobId: string,
      { signal, onUpdate }: { signal?: AbortSignal, onUpdate?: (job: QuizImportJob) => void } = {},
    ): Promise<QuizImportJob> {
      let failures = 0
      while (true) {
        if (signal?.aborted)
          throw new DOMException('Aborted', 'AbortError')
        try {
          const job = await apiClient.get<QuizImportJob>(`/new_quiz/quiz-imports/${jobId}/`)
          failures = 0
          onUpdate?.(job)
          if (job.status === 'succeeded' || job.status === 'failed')
            return job
        }
        catch (error) {
          if (++failures >= MAX_POLL_FAILURES)
            throw error
        }
        await sleep(POLL_INTERVAL, signal)
      }
    },
  }
}
