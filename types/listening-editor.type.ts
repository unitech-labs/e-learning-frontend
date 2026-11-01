/** Câu hỏi đang soạn trong trình soạn bài nghe (dạng phẳng, dễ sửa trực tiếp). */
export interface DraftQuestion {
  /** Khoá ổn định trên giao diện (câu mới chưa có id). */
  key: string
  /** id câu hỏi đã lưu — gửi lại để backend cập nhật thay vì tạo mới. */
  id?: string
  type: 'multiple_choice' | 'text_input' | 'essay'
  /** Phần của đề, vd "Prova n. 2 — Scegli la risposta corretta". */
  section: string
  /** Trang đề chứa câu (từ 1, trong source_pages của bài). */
  sourcePage: number | null
  prompt: string
  explanation: string
  score: number
  options: { label: string, text: string }[]
  /** Nhãn lựa chọn đúng (trắc nghiệm), '' = chưa chọn. */
  correct: string
  /** Đáp án chính (điền từ). */
  answer: string
  acceptedAnswers: string[]
  caseSensitive?: boolean
  /** Đáp án do AI điền khi nhập đề (kèm nguồn) — mất khi giáo viên tự đổi đáp án. */
  aiAnswer?: { source: 'pasted_key' | 'answer_page', page: number | null } | null
}
