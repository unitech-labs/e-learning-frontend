export type FlashcardStatus = 'pending' | 'approved' | 'rejected'

export interface FlashcardFace {
  language: string
  word: string
  pronunciation: string
  part_of_speech: string
  definition: string
  examples: string[]
  synonyms: string[]
}

/** Cặp thuật ngữ song ngữ. Chuỗi rỗng = không áp dụng cho từ loại này, FE ẩn cả dòng. */
export interface GrammarTerm {
  it: string
  vi: string
}

/** Mạo từ tách riêng khỏi từ để tô màu chữ `la` / `le` như design. */
export interface GrammarArticle {
  article: string
  word: string
  phrase: string
}

export interface GrammarPlural {
  article: string
  form: string
  phrase: string
}

export interface FlashcardGrammar {
  part_of_speech: GrammarTerm
  gender: GrammarTerm
  number: GrammarTerm
  article: GrammarArticle
  plural: GrammarPlural
}

export interface FlashcardSuggestion {
  word: string
  relation: 'similar' | 'topic'
  meaning_vi: string
  /** Khác null nghĩa là từ đã có sẵn trong hệ thống, mở tức thì thay vì chờ AI ~15s. */
  flashcard_id?: string | null
}

export interface FlashcardSuggestions {
  similar: FlashcardSuggestion[]
  same_topic: FlashcardSuggestion[]
}

export interface Flashcard {
  id: string
  word: string
  status: FlashcardStatus
  front: FlashcardFace
  back: FlashcardFace
  grammar: FlashcardGrammar
  mnemonic: string
  topics: string[]
  suggestions: FlashcardSuggestions
  is_owner: boolean
  is_saved: boolean
  /** Các bộ từ của chính user đang đăng nhập đang chứa thẻ này. */
  word_set_ids: string[]
  created_at: string
  updated_at: string
  /** true = vừa gọi AI (chậm), false = lấy từ cache. */
  generated_now: boolean
}

/** Bản rút gọn dùng trong danh sách. */
export interface FlashcardListItem {
  id: string
  word: string
  meaning: string
  pronunciation: string
  status: FlashcardStatus
  topics: string[]
  is_saved: boolean
  created_at: string
}

export interface FlashcardSuggestionsResponse {
  word: string
  topics: string[]
  similar: FlashcardSuggestion[]
  same_topic: FlashcardSuggestion[]
}

export interface FlashcardFeedback {
  id: string
  flashcard_word: string
  content: string
  status: 'open' | 'resolved' | 'dismissed'
  created_at: string
}

export interface SaveWordResponse {
  is_saved: boolean
  created?: boolean
  removed?: boolean
}

export interface SavedWordItem {
  id: string
  flashcard: FlashcardListItem
  created_at: string
}

export interface WordSetItem {
  id: string
  flashcard: FlashcardListItem
  created_at: string
}

export interface WordSet {
  id: string
  name: string
  description: string
  item_count: number
  items?: WordSetItem[]
  created_at: string
  updated_at: string
}

/** Vì sao user có (hoặc không có) quyền dùng Flashcard AI. */
export type FlashcardAccessReason
  = | 'moderator'
    | 'course'
    | 'approved_request'
    | 'open'
    | 'no_access'

export type FlashcardAccessRequestStatus = 'pending' | 'approved' | 'rejected'

export interface FlashcardAccessRequest {
  id: string
  user_email: string | null
  user_name: string | null
  status: FlashcardAccessRequestStatus
  reason: string
  admin_note: string
  reviewed_by_email: string | null
  reviewed_at: string | null
  created_at: string
}

export interface FlashcardAccess {
  can_use: boolean
  reason: FlashcardAccessReason
  /** false khi đã có quyền, hoặc khi đang có yêu cầu chờ duyệt. */
  can_request: boolean
  request: FlashcardAccessRequest | null
}

/** Dữ liệu thẻ đang được AI viết dở — cùng hình dạng Flashcard nhưng thiếu metadata. */
export type FlashcardCardData = Pick<
  Flashcard,
  'word' | 'front' | 'back' | 'grammar' | 'mnemonic' | 'topics' | 'suggestions'
>

export type FlashcardStreamStage = 'dictionary' | 'generating'

export interface FlashcardStreamHandlers {
  onStatus?: (stage: FlashcardStreamStage) => void
  onPartial?: (card: FlashcardCardData) => void
}

/** Flashcard bản admin: payload học sinh + thông tin kiểm duyệt. */
export interface FlashcardAdminDetail extends Flashcard {
  created_by_email: string | null
  approved_by_email: string | null
  approved_at: string | null
  rejected_reason: string
  edited_by_admin: boolean
  ai_provider: string
  ai_model: string
  dictionary_source: string
  open_feedback_count: number
}

export type FlashcardFeedbackStatus = 'open' | 'resolved' | 'dismissed'

export interface FlashcardFeedbackItem {
  id: string
  flashcard: string
  flashcard_word: string
  user_email: string | null
  content: string
  status: FlashcardFeedbackStatus
  admin_note: string
  resolved_by_email: string | null
  resolved_at: string | null
  created_at: string
}

/** Cấu hình nhà cung cấp AI — API key chỉ trả bản che. */
export interface AIProviderConfig {
  provider: string
  api_key_masked: string
  has_api_key: boolean
  base_url: string
  model: string
  timeout: number
  is_enabled: boolean
  updated_at: string
  updated_by_email: string | null
}

export type FlashcardErrorCode
  = | 'FLASHCARD_INVALID_WORD'
    | 'FLASHCARD_ACCESS_DENIED'
    | 'FLASHCARD_ACCESS_REQUEST_PENDING'
    | 'FLASHCARD_ACCESS_ALREADY_GRANTED'
    | 'FLASHCARD_WORD_NOT_FOUND'
    | 'FLASHCARD_UNDER_REVIEW'
    | 'FLASHCARD_ALREADY_APPROVED'
    | 'FLASHCARD_DICTIONARY_UNAVAILABLE'
    | 'FLASHCARD_AI_UNAVAILABLE'

export interface FlashcardApiErrorBody {
  code: number
  error_code?: FlashcardErrorCode
  message: string
  details?: Record<string, string[]>
}
