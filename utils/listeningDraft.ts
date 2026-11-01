import type { NewQuizQuestion, NewQuizQuestionCreate } from '~/composables/api/useNewQuizApi'
import type { ImportedQuestion } from '~/composables/api/useQuizImportApi'
import type { DraftQuestion } from '~/types/listening-editor.type'

/** Chuyển giữa câu hỏi API và câu hỏi đang soạn của trình soạn bài nghe. */

export const OPTION_LABELS = 'ABCDEFGH'

function newKey() {
  return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function newDraft(type: DraftQuestion['type'], section = '', sourcePage: number | null = null): DraftQuestion {
  return {
    key: newKey(),
    type,
    section,
    sourcePage,
    prompt: '',
    explanation: '',
    score: 1,
    options: type === 'multiple_choice' ? ['A', 'B', 'C', 'D'].map(label => ({ label, text: '' })) : [],
    correct: '',
    answer: '',
    acceptedAnswers: [],
    // Bài nghe chấm không phân biệt hoa/thường.
    caseSensitive: type === 'text_input' ? false : undefined,
  }
}

export function draftFromApi(question: NewQuizQuestion): DraftQuestion {
  const options = [...(question.options ?? [])].sort((a, b) => a.label.localeCompare(b.label))
  return {
    key: question.id,
    id: question.id,
    type: question.question_type,
    section: question.section ?? '',
    sourcePage: question.source_page ?? null,
    prompt: question.prompt,
    explanation: question.explanation ?? '',
    score: Number(question.score) || 1,
    options: options.map(option => ({ label: option.label, text: option.text })),
    correct: options.find(option => option.is_correct)?.label ?? '',
    answer: question.sample_answer?.text ?? '',
    acceptedAnswers: question.sample_answer?.accepted_answers ?? [],
    caseSensitive: question.sample_answer?.case_sensitive,
  }
}

/** `pageOffset`: số trang đã có trước đó (khi thêm đề mới vào sau đề cũ). */
export function draftFromImport(question: ImportedQuestion, pageOffset = 0): DraftQuestion {
  const options = question.options ?? []
  return {
    key: newKey(),
    type: question.question_type,
    section: question.section ?? '',
    sourcePage: question.source_page ? question.source_page + pageOffset : null,
    prompt: question.prompt,
    explanation: question.explanation ?? '',
    score: 1,
    options: options.map(option => ({ label: option.label, text: option.text })),
    correct: options.find(option => option.is_correct)?.label ?? '',
    answer: question.sample_answer?.text ?? '',
    acceptedAnswers: question.sample_answer?.accepted_answers ?? [],
    caseSensitive: question.sample_answer?.case_sensitive ?? false,
    aiAnswer: question.answer_source === 'pasted_key' || question.answer_source === 'answer_page'
      ? { source: question.answer_source, page: question.answer_page ? question.answer_page + pageOffset : null }
      : null,
  }
}

export function draftToApi(draft: DraftQuestion, order: number, pageCount: number): NewQuizQuestionCreate & { id?: string } {
  const question: NewQuizQuestionCreate & { id?: string } = {
    question_type: draft.type,
    section: draft.section.trim(),
    source_page: draft.sourcePage && draft.sourcePage <= pageCount ? draft.sourcePage : null,
    prompt: draft.prompt.trim(),
    explanation: draft.explanation.trim(),
    order,
    score: draft.score || 1,
  }
  if (draft.id)
    question.id = draft.id
  if (draft.type === 'multiple_choice') {
    question.options = draft.options.map(option => ({
      label: option.label,
      text: option.text.trim(),
      is_correct: option.label === draft.correct,
    }))
  }
  if (draft.type === 'text_input') {
    question.sample_answer = {
      text: draft.answer.trim(),
      accepted_answers: draft.acceptedAnswers,
      case_sensitive: draft.caseSensitive,
    }
  }
  return question
}

export function hasAnswer(draft: DraftQuestion): boolean {
  if (draft.type === 'multiple_choice')
    return !!draft.correct
  if (draft.type === 'text_input')
    return !!draft.answer.trim()
  return true
}

/** Lý do câu chưa lưu được, hoặc null nếu câu đã đủ. */
export function draftProblem(draft: DraftQuestion): string | null {
  if (!draft.prompt.trim())
    return 'thiếu nội dung câu hỏi'
  if (draft.type === 'multiple_choice') {
    if (draft.options.length < 2)
      return 'cần ít nhất 2 lựa chọn'
    if (draft.options.some(option => !option.text.trim()))
      return 'có lựa chọn còn trống'
  }
  if (!hasAnswer(draft))
    return 'chưa có đáp án'
  return null
}

/** Ký hiệu đáp án ngắn trên phiếu đáp án: chữ cái (trắc nghiệm), chữ đầu (Vero/Falso...), ✓ (điền từ). */
export function answerMark(draft: DraftQuestion): string {
  if (!hasAnswer(draft))
    return '?'
  if (draft.type === 'text_input')
    return '✓'
  if (draft.type === 'multiple_choice' && draft.options.length === 2) {
    const text = draft.options.find(option => option.label === draft.correct)?.text.trim()
    return text ? text[0]!.toUpperCase() : draft.correct
  }
  return draft.type === 'multiple_choice' ? draft.correct : '·'
}

/** Số thứ tự câu trong phần của nó (đề CILS đánh số lại từ 1 ở mỗi Prova). */
export function sectionNumbers(drafts: DraftQuestion[]): number[] {
  const hasSections = drafts.some(draft => draft.section)
  let counter = 0
  return drafts.map((draft, index) => {
    if (hasSections && index > 0 && draft.section !== drafts[index - 1]!.section)
      counter = 0
    return ++counter
  })
}

/** Tên phần rút gọn cho phiếu đáp án: "Prova n. 2 — Scegli..." -> "Prova n. 2". */
export function shortSection(section: string): string {
  // Chỉ cắt ở gạch dài: tên phần có thể chứa gạch ngắn ("ASCOLTO - PROVA N.2 — Ascolta...").
  const head = section.split(/\s+[—–]\s+/)[0]?.trim() ?? ''
  return head || section
}
