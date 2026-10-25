import type { ExerciseReviewStatus, ExerciseType } from '~/types/ai-exercise.type'

export const EXERCISE_TYPE_META: Record<ExerciseType, { label: string, icon: string, description: string }> = {
  fill_blank: {
    label: 'Điền từ',
    icon: 'tabler:forms',
    description: 'Điền từ còn thiếu vào câu',
  },
  verb_conjugation: {
    label: 'Chia động từ',
    icon: 'tabler:replace',
    description: 'Chọn dạng chia đúng của động từ',
  },
  reading: {
    label: 'Đọc hiểu',
    icon: 'tabler:book',
    description: 'Đọc đoạn văn rồi trả lời câu hỏi',
  },
  translation: {
    label: 'Dịch',
    icon: 'tabler:language',
    description: 'Chọn câu tiếng Ý dịch đúng',
  },
  listening: {
    label: 'Nghe hiểu',
    icon: 'tabler:headphones',
    description: 'Nghe audio, xem đề và chọn đáp án',
  },
}

export const REVIEW_STATUS_META: Record<ExerciseReviewStatus, { label: string, color: string }> = {
  pending: { label: 'Chờ duyệt', color: 'orange' },
  approved: { label: 'Đã duyệt', color: 'green' },
  rejected: { label: 'Đã từ chối', color: 'red' },
}

/** Màu nhãn lựa chọn; E-H dùng cho câu chọn/nối kiểu IELTS Listening. */
export const OPTION_LABEL_COLORS: Record<string, string> = {
  A: 'bg-blue-200',
  B: 'bg-orange-200',
  C: 'bg-red-200',
  D: 'bg-yellow-200',
  E: 'bg-green-200',
  F: 'bg-purple-200',
  G: 'bg-pink-200',
  H: 'bg-cyan-200',
}

/** Đáp án điền từ: đáp án chính + các đáp án khác cũng được chấm đúng, vd "macchina / auto / automobile". */
export function formatTextAnswers(answer?: { text: string, accepted_answers?: string[] } | null): string {
  if (!answer)
    return ''
  return [answer.text, ...(answer.accepted_answers || [])].join(' / ')
}

export function exerciseTypeLabel(type?: string | null): string {
  return (type && EXERCISE_TYPE_META[type as ExerciseType]?.label) || ''
}

/**
 * Bài theo dạng bài tập (AI sinh hoặc admin soạn theo dạng): học viên được đổi
 * đáp án thoải mái và chỉ xem đúng/sai sau khi tự bấm nộp bài.
 * Quiz kiểu cũ (exercise_type rỗng) giữ nguyên cơ chế chấm ngay từng câu.
 */
export function revealsAnswersAfterSubmit(quiz?: { exercise_type?: string | null } | null): boolean {
  return !!quiz?.exercise_type
}
