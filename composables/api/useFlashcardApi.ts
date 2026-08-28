import type { ApiError, ListApiResponse } from '~/api/apiClient'
import type {
  Flashcard,
  FlashcardAccess,
  FlashcardApiErrorBody,
  FlashcardErrorCode,
  FlashcardFeedback,
  FlashcardListItem,
  FlashcardStreamHandlers,
  FlashcardSuggestionsResponse,
  SavedWordItem,
  SaveWordResponse,
  WordSet,
} from '~/types/flashcard.type'
import { useApiClient } from '~/api/apiClient'

/** Lần tra đầu của một từ mới phải gọi AI, backend đo ~15s. Đừng hạ xuống dưới 60s. */
export const FLASHCARD_LOOKUP_TIMEOUT = 90_000

/** Đúng 1 từ, chỉ chữ cái tiếng Ý (kể cả dấu), cho phép `'` và `-`. */
const WORD_PATTERN = /^[\p{Script=Latin}'-]+$/u

export function isValidItalianWord(word: string): boolean {
  const trimmed = word.trim()
  return trimmed.length > 0 && WORD_PATTERN.test(trimmed)
}

/** Bóc `error_code` / `message` tiếng Việt mà backend trả sẵn từ lỗi của apiClient. */
export function parseFlashcardError(error: unknown): {
  errorCode: FlashcardErrorCode | null
  message: string
  statusCode: number | null
} {
  const apiError = error as ApiError | undefined
  const body = apiError?.data as FlashcardApiErrorBody | undefined

  const detailMessage = body?.details
    ? Object.values(body.details).flat()[0]
    : undefined

  return {
    errorCode: body?.error_code ?? null,
    // `message` từ backend đã là tiếng Việt sẵn sàng hiển thị, không map lại.
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

/** Lỗi stream mang cùng hình dạng ApiError (`data`, `statusCode`) để parseFlashcardError dùng lại. */
class FlashcardStreamError extends Error {
  data: unknown
  statusCode: number

  constructor(data: unknown, statusCode: number) {
    super((data as { message?: string })?.message ?? 'Stream error')
    this.data = data
    this.statusCode = statusCode
  }
}

/**
 * Bản streaming của lookup: backend trả NDJSON, AI sinh tới đâu `onPartial`
 * nhận thẻ viết dở tới đó (giá trị chuỗi lớn dần — hiệu ứng typewriter).
 * Promise resolve với payload đầy đủ (y hệt POST /lookup/) ở event "complete".
 *
 * Không dùng ofetch vì cần đọc ReadableStream từng chunk.
 */
export async function lookupFlashcardStream(
  word: string,
  handlers: FlashcardStreamHandlers = {},
): Promise<Flashcard> {
  const config = useRuntimeConfig()
  const { token } = useAuth()

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FLASHCARD_LOOKUP_TIMEOUT)

  try {
    const response = await fetch(`${config.public.apiBase}/flashcards/lookup/stream/`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
      },
      body: JSON.stringify({ word: word.trim().toLowerCase() }),
    })

    if (!response.ok || !response.body) {
      const body = await response.json().catch(() => ({}))
      throw new FlashcardStreamError(body, response.status)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let complete: Flashcard | null = null

    const handleLine = (line: string) => {
      if (!line.trim())
        return
      const event = JSON.parse(line)
      if (event.type === 'status')
        handlers.onStatus?.(event.stage)
      else if (event.type === 'partial')
        handlers.onPartial?.(event.card)
      else if (event.type === 'complete')
        complete = event.data
      else if (event.type === 'error')
        throw new FlashcardStreamError(event, event.code ?? 503)
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done)
        break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines)
        handleLine(line)
    }
    handleLine(buffer)

    if (!complete)
      throw new FlashcardStreamError({ message: 'Stream kết thúc mà không có dữ liệu.' }, 502)
    return complete
  }
  finally {
    clearTimeout(timer)
  }
}

export function useFlashcardApi() {
  const apiClient = useApiClient()

  return {
    /**
     * Trạng thái quyền dùng Flashcard AI của user hiện tại.
     * KHÔNG bị chặn bởi quyền — đây chính là cửa cho người chưa có quyền.
     */
    getAccess: () => apiClient.get<FlashcardAccess>('/flashcards/access/'),

    /** Gửi yêu cầu cấp quyền. Trả về trạng thái quyền mới nhất. */
    requestAccess: (reason: string) =>
      apiClient.post<FlashcardAccess>('/flashcards/access/request/', { reason }),

    /** Grid "Từ đã tra": lịch sử tra từ của chính user, mới nhất trước. */
    getHistory: (params?: { limit?: number, offset?: number }) =>
      apiClient.get<ListApiResponse<FlashcardListItem>>(`/flashcards/history/${buildQuery(params)}`),

    /** 201 = vừa sinh mới bằng AI, 200 = lấy từ bản đã lưu. */
    lookup: (word: string) =>
      apiClient.post<Flashcard>(
        '/flashcards/lookup/',
        { word: word.trim().toLowerCase() },
        { timeout: FLASHCARD_LOOKUP_TIMEOUT },
      ),

    getFlashcards: (params?: {
      search?: string
      topic?: string
      limit?: number
      offset?: number
    }) =>
      apiClient.get<ListApiResponse<FlashcardListItem>>(
        `/flashcards/${buildQuery(params)}`,
      ),

    getFlashcard: (id: string) =>
      apiClient.get<Flashcard>(`/flashcards/${id}/`),

    getSuggestions: (id: string) =>
      apiClient.get<FlashcardSuggestionsResponse>(`/flashcards/${id}/suggestions/`),

    sendFeedback: (id: string, content: string) =>
      apiClient.post<FlashcardFeedback>(`/flashcards/${id}/feedback/`, { content }),

    /** Idempotent: bấm hai lần không lỗi, lần hai trả `created: false`. */
    saveWord: (id: string) =>
      apiClient.post<SaveWordResponse>(`/flashcards/${id}/save/`),

    unsaveWord: (id: string) =>
      apiClient.delete<SaveWordResponse>(`/flashcards/${id}/save/`),

    getSavedWords: (params?: { limit?: number, offset?: number }) =>
      apiClient.get<ListApiResponse<SavedWordItem>>(
        `/flashcards/saved/${buildQuery(params)}`,
      ),

    getWordSets: () =>
      apiClient.get<ListApiResponse<WordSet> | WordSet[]>('/flashcards/sets/'),

    createWordSet: (data: { name: string, description?: string }) =>
      apiClient.post<WordSet>('/flashcards/sets/', data),

    getWordSet: (setId: string) =>
      apiClient.get<WordSet>(`/flashcards/sets/${setId}/`),

    updateWordSet: (setId: string, data: { name?: string, description?: string }) =>
      apiClient.patch<WordSet>(`/flashcards/sets/${setId}/`, data),

    deleteWordSet: (setId: string) =>
      apiClient.delete<void>(`/flashcards/sets/${setId}/`),

    /** Trả về nguyên bộ từ đã cập nhật (có `item_count` và `items`), khỏi gọi lại GET. */
    addToWordSet: (setId: string, flashcardId: string) =>
      apiClient.post<WordSet>(`/flashcards/sets/${setId}/items/`, { flashcard_id: flashcardId }),

    removeFromWordSet: (setId: string, flashcardId: string) =>
      apiClient.delete<void>(`/flashcards/sets/${setId}/items/${flashcardId}/`),
  }
}
