<script setup lang="ts">
import type { DraftQuestion } from '~/types/listening-editor.type'
import { hasAnswer, OPTION_LABELS } from '~/utils/listeningDraft'

/**
 * Một câu hỏi bài nghe dạng gọn: nội dung + lựa chọn sửa ngay tại chỗ, bấm chữ
 * cái để chọn đáp án đúng. Giải thích / điểm / thêm bớt lựa chọn nằm trong phần mở rộng.
 */
const props = defineProps<{
  question: DraftQuestion
  number: number
  /** Câu đang có vấn đề (sau khi bấm lưu) — viền vàng kèm lý do. */
  problem?: string | null
  flash?: boolean
  /** Nguồn đáp án AI điền, vd "đáp án trang 45 trong PDF" — để giáo viên biết mà đối chiếu. */
  aiAnswerLabel?: string
}>()

const emit = defineEmits<{
  update: [patch: Partial<DraftQuestion>]
  delete: []
}>()

const expanded = ref(false)

const isChoice = computed(() => props.question.type === 'multiple_choice')
// Vero/Falso, Presente/Non presente...: hai nút trên cùng dòng với câu hỏi.
const isBinary = computed(() => isChoice.value && props.question.options.length === 2)
const missing = computed(() => !hasAnswer(props.question))
const missingHint = computed(() => {
  if (props.question.type === 'text_input')
    return 'nhập đáp án đúng'
  if (isBinary.value)
    return `chọn ${props.question.options.map(option => option.text || option.label).join(' hoặc ')}`
  return 'bấm chữ cái của lựa chọn đúng'
})
// Thiếu đáp án đã có nhãn riêng; chỉ báo thêm các lỗi khác (thiếu nội dung, lựa chọn trống).
const otherProblem = computed(() => (props.problem && props.problem !== 'chưa có đáp án' ? props.problem : null))

function setOptionText(index: number, text: string) {
  emit('update', { options: props.question.options.map((option, i) => (i === index ? { ...option, text } : option)) })
}

function addOption() {
  const options = props.question.options
  if (options.length >= OPTION_LABELS.length)
    return
  emit('update', { options: [...options, { label: OPTION_LABELS[options.length]!, text: '' }] })
}

function removeOption(index: number) {
  const options = props.question.options
  if (options.length <= 2)
    return
  const removed = options[index]!.label
  const correctIndex = options.findIndex(option => option.label === props.question.correct)
  // Đánh lại nhãn A, B, C... và giữ đáp án đúng trỏ vào cùng lựa chọn.
  const next = options.filter((_, i) => i !== index).map((option, i) => ({ ...option, label: OPTION_LABELS[i]! }))
  let correct = ''
  if (props.question.correct && props.question.correct !== removed)
    correct = OPTION_LABELS[correctIndex > index ? correctIndex - 1 : correctIndex]!
  emit('update', { options: next, correct })
}
</script>

<template>
  <div
    class="group rounded-lg border px-3 py-2 transition"
    :class="[
      problem ? 'border-amber-400 bg-amber-50/50' : 'border-gray-200 bg-white hover:border-gray-300',
      missing ? 'border-l-4 !border-l-amber-400' : '',
      flash ? 'ring-2 ring-green-400 ring-offset-1' : '',
    ]"
  >
    <div class="flex items-start gap-2">
      <span
        class="mt-1 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1 text-xs font-semibold"
        :class="missing ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'"
      >
        {{ number }}
      </span>
      <a-textarea
        :value="question.prompt"
        :auto-size="{ minRows: 1, maxRows: 5 }"
        :bordered="false"
        placeholder="Nội dung câu hỏi"
        class="!flex-1 !rounded !px-1 !py-0.5 font-medium text-gray-900 hover:!bg-gray-50 focus:!bg-white"
        @update:value="(value: string) => emit('update', { prompt: value })"
      />

      <!-- Hai lựa chọn: chọn đáp án ngay trên dòng -->
      <div v-if="isBinary" class="mt-0.5 flex shrink-0 overflow-hidden rounded-md border border-gray-200 text-xs">
        <button
          v-for="option in question.options"
          :key="option.label"
          type="button"
          class="max-w-[9rem] cursor-pointer truncate px-2.5 py-1 font-medium transition"
          :class="question.correct === option.label ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'"
          :title="`Đáp án đúng: ${option.text}`"
          @click="emit('update', { correct: option.label })"
        >
          {{ option.text || option.label }}
        </button>
      </div>

      <div class="mt-0.5 flex shrink-0 items-center gap-0.5 text-gray-400">
        <a-tooltip title="Giải thích, điểm, sửa lựa chọn">
          <button
            type="button"
            class="cursor-pointer rounded p-1 hover:bg-gray-100 hover:text-gray-700"
            :class="expanded ? 'bg-gray-100 text-gray-700' : ''"
            @click="expanded = !expanded"
          >
            <Icon name="tabler:adjustments-horizontal" />
          </button>
        </a-tooltip>
        <a-popconfirm title="Xoá câu này?" ok-text="Xoá" cancel-text="Huỷ" :ok-button-props="{ danger: true }" @confirm="emit('delete')">
          <button type="button" class="cursor-pointer rounded p-1 hover:bg-red-50 hover:text-red-600" title="Xoá câu">
            <Icon name="tabler:trash" />
          </button>
        </a-popconfirm>
      </div>
    </div>

    <!-- Trắc nghiệm nhiều lựa chọn: bấm chữ cái để chọn đáp án đúng -->
    <div v-if="isChoice && !isBinary" class="mt-1 grid gap-x-4 gap-y-0.5 pl-8 md:grid-cols-2">
      <div v-for="(option, index) in question.options" :key="option.label" class="flex items-start gap-1.5">
        <button
          type="button"
          class="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border text-xs font-semibold transition"
          :class="question.correct === option.label
            ? 'border-green-600 bg-green-600 text-white'
            : 'border-gray-300 text-gray-600 hover:border-green-500 hover:text-green-700'"
          :title="`Chọn ${option.label} là đáp án đúng`"
          @click="emit('update', { correct: option.label })"
        >
          {{ option.label }}
        </button>
        <!-- Textarea tự giãn để lựa chọn dài xuống dòng thay vì bị cắt -->
        <a-textarea
          :value="option.text"
          :bordered="false"
          :auto-size="{ minRows: 1, maxRows: 4 }"
          placeholder="Nội dung lựa chọn"
          class="!rounded !px-1 !py-0.5 text-sm hover:!bg-gray-50 focus:!bg-white"
          :class="question.correct === option.label ? '!font-medium !text-green-800' : '!text-gray-700'"
          @update:value="(value: string) => setOptionText(index, value)"
        />
      </div>
    </div>

    <!-- Điền từ -->
    <div v-else-if="question.type === 'text_input'" class="mt-1 flex flex-col gap-1.5 pl-8 sm:flex-row sm:items-center">
      <a-input
        :value="question.answer"
        size="small"
        placeholder="Đáp án"
        class="sm:!w-52"
        :status="missing ? 'warning' : ''"
        @update:value="(value: string) => emit('update', { answer: value })"
      />
      <a-select
        :value="question.acceptedAnswers"
        mode="tags"
        size="small"
        :open="false"
        placeholder="Đáp án khác cũng đúng (gõ rồi Enter)"
        class="min-w-0 flex-1"
        @update:value="(value: string[]) => emit('update', { acceptedAnswers: value })"
      />
    </div>

    <!-- Trạng thái đáp án: luôn hiện, không đợi tới lúc bấm lưu -->
    <div v-if="missing || aiAnswerLabel || otherProblem" class="mt-1 flex flex-wrap items-center gap-1.5 pl-8 text-xs">
      <span v-if="missing" class="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">
        <Icon name="tabler:alert-triangle" />
        Chưa có đáp án — {{ missingHint }}
      </span>
      <span
        v-else-if="aiAnswerLabel"
        class="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-blue-700"
        title="AI điền đáp án này khi đọc đề — hãy đối chiếu. Bạn đổi đáp án thì nhãn này mất."
      >
        <Icon name="tabler:sparkles" />
        AI · {{ aiAnswerLabel }}
      </span>
      <span v-if="otherProblem" class="text-amber-700">Câu này {{ otherProblem }}.</span>
    </div>

    <!-- Mở rộng: giải thích, điểm, sửa lựa chọn của câu hai lựa chọn, thêm/bớt lựa chọn -->
    <div v-if="expanded" class="mt-2 space-y-2 border-t border-gray-100 pl-8 pt-2">
      <div v-if="isChoice" class="space-y-1">
        <div v-if="isBinary" class="grid gap-1 sm:grid-cols-2">
          <a-input
            v-for="(option, index) in question.options"
            :key="option.label"
            :value="option.text"
            size="small"
            :addon-before="option.label"
            @update:value="(value: string) => setOptionText(index, value)"
          />
        </div>
        <div class="flex flex-wrap gap-1">
          <a-button size="small" :disabled="question.options.length >= OPTION_LABELS.length" @click="addOption">
            + Thêm lựa chọn
          </a-button>
          <a-button
            v-for="(option, index) in question.options"
            v-show="question.options.length > 2"
            :key="option.label"
            size="small"
            danger
            type="text"
            @click="removeOption(index)"
          >
            Bỏ {{ option.label }}
          </a-button>
        </div>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row">
        <a-textarea
          :value="question.explanation"
          :auto-size="{ minRows: 1, maxRows: 4 }"
          size="small"
          placeholder="Giải thích đáp án (học viên xem sau khi nộp bài)"
          class="flex-1"
          @update:value="(value: string) => emit('update', { explanation: value })"
        />
        <a-input-number
          :value="question.score"
          size="small"
          :min="0.1"
          :step="0.5"
          addon-before="Điểm"
          class="sm:!w-32"
          @update:value="(value: number | null) => emit('update', { score: value || 1 })"
        />
      </div>
    </div>
  </div>
</template>
