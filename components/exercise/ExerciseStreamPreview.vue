<script setup lang="ts">
import type { ExercisePreview } from '~/types/ai-exercise.type'

/**
 * Màn chờ trong lúc AI soạn bài (chạy ở worker phía server): xếp hàng -> AI
 * phân tích -> câu hỏi hiện dần -> hoàn tất. Bản xem trước chỉ để xem — chưa có
 * đáp án, thứ tự lựa chọn ở bản cuối sẽ được xáo lại.
 *
 * Model có thể "nghĩ" tới cả phút trước khi viết câu đầu tiên (bài 20 câu), nên
 * giai đoạn chờ phải luôn có chuyển động + thông điệp thay đổi để học viên không
 * tưởng trang bị treo.
 */
interface Props {
  preview: ExercisePreview | null
  questionCount: number
  label: string
  /** Bài nghe: không gọi AI, chỉ tìm bài có sẵn. */
  listening?: boolean
  /** Job đang xếp hàng chờ worker. */
  queued?: boolean
  /** Vị trí trong hàng đợi chung (1 = sắp tới lượt). */
  queuePosition?: number | null
  /** Thời điểm tạo job (ISO) — đếm giây đúng cả khi tải lại trang giữa chừng. */
  startedAt?: string | null
}

const props = defineProps<Props>()

const questions = computed(() => props.preview?.questions.filter(q => q.prompt) ?? [])

type Phase = 'queued' | 'thinking' | 'writing' | 'finishing'
const phase = computed<Phase>(() => {
  if (props.queued)
    return 'queued'
  if (questions.value.length >= props.questionCount)
    return 'finishing'
  if (questions.value.length || props.preview?.passage)
    return 'writing'
  return 'thinking'
})

const progress = computed(() => Math.min(100, Math.round((questions.value.length / Math.max(1, props.questionCount)) * 100)))

const STEPS: Array<{ key: Phase, label: string }> = [
  { key: 'queued', label: 'Xếp hàng' },
  { key: 'thinking', label: 'Phân tích yêu cầu' },
  { key: 'writing', label: 'Soạn câu hỏi' },
  { key: 'finishing', label: 'Hoàn tất' },
]
const phaseIndex = computed(() => STEPS.findIndex(step => step.key === phase.value))

// Thông điệp xoay vòng lúc AI còn đang "nghĩ"
const THINKING_MESSAGES = [
  'Đang đọc yêu cầu của bạn…',
  'Đang chọn từ vựng và ngữ pháp đúng trình độ…',
  'Đang lên ý tưởng câu hỏi theo chủ đề…',
  'Đang soạn các phương án nhiễu hợp lý…',
  'Đang kiểm tra để mỗi câu chỉ có một đáp án đúng…',
]
const messageIndex = ref(0)
// Đếm từ lúc tạo job (không phải lúc component mount) để tải lại trang giữa chừng vẫn đúng
const startMs = props.startedAt ? Date.parse(props.startedAt) : Date.now()
const secondsSinceStart = () => Math.max(0, Math.floor((Date.now() - startMs) / 1000))
const elapsed = ref(secondsSinceStart())

const statusText = computed(() => {
  if (props.listening)
    return 'Đang tìm bài nghe phù hợp…'
  if (phase.value === 'queued') {
    const ahead = Math.max(0, (props.queuePosition ?? 1) - 1)
    return ahead ? `Đang xếp hàng — còn ${ahead} bài trước bạn…` : 'Sắp tới lượt bạn…'
  }
  if (phase.value === 'finishing')
    return 'Đang lưu bài và chuẩn bị màn làm bài…'
  if (phase.value === 'writing')
    return questions.value.length ? `Đang viết câu ${Math.min(questions.value.length, props.questionCount)}/${props.questionCount}…` : 'Đang viết đoạn văn…'
  // Hết một vòng thì lặp lại từ thông điệp thứ hai — quay về "Đang đọc yêu cầu" trông như bị chạy lại từ đầu
  const i = messageIndex.value
  const n = THINKING_MESSAGES.length
  return THINKING_MESSAGES[i < n ? i : 1 + ((i - 1) % (n - 1))]
})

// Chừa tối đa 3 ô chờ cho các câu chưa tới — bài 20 câu không cần 20 ô xám
const placeholderCount = computed(() => Math.min(3, Math.max(0, props.questionCount - questions.value.length)))

let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  timer = setInterval(() => {
    elapsed.value = secondsSinceStart()
    if (elapsed.value % 3 === 0)
      messageIndex.value++
  }, 1000)
})
onUnmounted(() => {
  if (timer)
    clearInterval(timer)
})
</script>

<template>
  <section
    class="relative overflow-hidden rounded-3xl border border-green-100 bg-white p-6 shadow-sm sm:p-8"
    role="status"
    aria-live="polite"
  >
    <!-- Nền chuyển động nhẹ -->
    <div class="blob blob-green pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-green-200/50 blur-3xl" aria-hidden="true" />
    <div class="blob blob-red pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-red-100/60 blur-3xl" aria-hidden="true" />

    <div class="relative flex flex-col items-center text-center">
      <!-- AI orb -->
      <div class="relative h-24 w-24" aria-hidden="true">
        <span class="orb-glow absolute inset-0 rounded-full bg-green-300/40" />
        <span class="orb-ring absolute inset-0 rounded-full" />
        <span class="absolute inset-[6px] flex items-center justify-center rounded-full bg-white shadow-inner">
          <Icon :name="listening ? 'tabler:headphones' : 'tabler:sparkles'" class="orb-icon text-3xl text-[#1B8A3C]" />
        </span>
      </div>

      <h2 class="mt-5 text-lg font-semibold text-gray-900 sm:text-xl">
        {{ listening ? 'Đang chuẩn bị bài nghe' : 'AI đang soạn bài tập cho bạn' }}
      </h2>
      <p class="mt-1 text-sm text-gray-500">
        {{ label }}
      </p>
      <Transition name="status" mode="out-in">
        <p :key="statusText" class="mt-3 min-h-5 text-sm font-medium text-[#1B8A3C]">
          {{ statusText }}
        </p>
      </Transition>
    </div>

    <template v-if="!listening">
      <!-- Các bước -->
      <ol class="relative mx-auto mt-6 flex max-w-lg items-center justify-between">
        <li
          v-for="(step, index) in STEPS"
          :key="step.key"
          class="relative z-10 flex flex-1 flex-col items-center gap-1.5"
        >
          <span
            class="flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors duration-500"
            :class="index < phaseIndex
              ? 'border-[#1B8A3C] bg-[#1B8A3C] text-white'
              : index === phaseIndex
                ? 'step-active border-[#1B8A3C] bg-white text-[#1B8A3C]'
                : 'border-gray-200 bg-white text-gray-400'"
          >
            <Icon v-if="index < phaseIndex" name="tabler:check" />
            <template v-else>{{ index + 1 }}</template>
          </span>
          <span class="text-[11px] font-medium sm:text-xs" :class="index <= phaseIndex ? 'text-gray-800' : 'text-gray-400'">
            {{ step.label }}
          </span>
        </li>
        <!-- Đường nối giữa các bước -->
        <span class="absolute left-[12.5%] right-[12.5%] top-4 h-0.5 -translate-y-1/2 bg-gray-200" aria-hidden="true">
          <span class="block h-full bg-[#1B8A3C] transition-all duration-700" :style="{ width: `${(phaseIndex / (STEPS.length - 1)) * 100}%` }" />
        </span>
      </ol>

      <!-- Tiến độ -->
      <div class="relative mt-6">
        <div class="relative h-2.5 overflow-hidden rounded-full bg-green-100">
          <span v-if="phase === 'queued' || phase === 'thinking'" class="bar-indeterminate absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-green-500 to-transparent" />
          <span
            v-else
            class="bar-stripes block h-full rounded-full transition-[width] duration-700 ease-out"
            :style="{ width: `${Math.max(progress, 4)}%` }"
          />
        </div>
        <div class="mt-2 flex justify-between text-xs text-gray-500">
          <span>{{ Math.min(questions.length, questionCount) }}/{{ questionCount }} câu</span>
          <span>{{ elapsed }} giây · thường mất 20–90 giây</span>
        </div>
        <p class="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-gray-400">
          <Icon name="tabler:info-circle" class="shrink-0" />
          Bạn có thể rời trang — bài vẫn được soạn tiếp, quay lại đây để xem.
        </p>
      </div>

      <p v-if="preview?.instructions" class="relative mt-5 text-sm text-gray-600">
        {{ preview.instructions }}
      </p>

      <div
        v-if="preview?.passage"
        lang="it"
        class="relative mt-4 max-h-60 overflow-y-auto whitespace-pre-line rounded-2xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-800"
      >
        {{ preview.passage }}
      </div>

      <!-- Câu hỏi hiện dần -->
      <TransitionGroup name="question" tag="ol" class="relative mt-5 space-y-3">
        <li
          v-for="(question, index) in questions"
          :key="index"
          class="rounded-2xl border border-gray-100 bg-gray-50/80 p-4"
        >
          <p class="text-sm font-medium text-green-800" lang="it">
            {{ index + 1 }}. {{ question.prompt }}<span v-if="phase === 'writing' && index === questions.length - 1" class="caret" aria-hidden="true" />
          </p>
          <TransitionGroup v-if="question.options.length" name="chip" tag="div" class="mt-2 flex flex-wrap gap-2">
            <!-- Key theo vị trí: chữ của lựa chọn lớn dần theo stream, key theo nội dung sẽ làm chip nháy lại liên tục -->
            <span
              v-for="(option, optionIndex) in question.options"
              :key="optionIndex"
              class="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600"
              lang="it"
            >
              {{ option }}
            </span>
          </TransitionGroup>
        </li>
      </TransitionGroup>

      <!-- Ô chờ cho các câu chưa tới -->
      <div v-if="phase !== 'finishing'" class="relative mt-3 space-y-3" aria-hidden="true">
        <div v-for="n in placeholderCount" :key="n" class="shimmer h-16 rounded-2xl" :style="{ opacity: 1 - (n - 1) * 0.25 }" />
      </div>
    </template>
  </section>
</template>

<style scoped>
/* Vòng gradient xoay quanh orb */
.orb-ring {
  background: conic-gradient(from 0deg, #1b8a3c, #6ee7b7, #ffffff, #ce2b37, #1b8a3c);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px));
  animation: spin 2.4s linear infinite;
}
.orb-glow {
  animation: glow 2.4s ease-in-out infinite;
}
.orb-icon {
  animation: float 2.4s ease-in-out infinite;
}

.blob-green {
  animation: drift 9s ease-in-out infinite;
}
.blob-red {
  animation: drift 11s ease-in-out infinite reverse;
}

.step-active {
  animation: step-pulse 1.6s ease-in-out infinite;
}

.bar-indeterminate {
  animation: indeterminate 1.4s ease-in-out infinite;
}
.bar-stripes {
  background-image:
    linear-gradient(45deg, rgb(255 255 255 / 0.22) 25%, transparent 25%, transparent 50%, rgb(255 255 255 / 0.22) 50%, rgb(255 255 255 / 0.22) 75%, transparent 75%),
    linear-gradient(to right, #22c55e, #059669);
  background-size: 16px 16px, 100% 100%;
  animation: stripes 0.8s linear infinite;
}

.shimmer {
  background: linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 40%, #f3f4f6 80%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

.caret {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 2px;
  vertical-align: -2px;
  background: #1b8a3c;
  animation: blink 0.9s steps(1) infinite;
}

/* Transitions */
.status-enter-active,
.status-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.status-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.status-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.question-enter-active {
  transition: opacity 0.45s ease, transform 0.45s ease;
}
.question-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

.chip-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.chip-enter-from {
  opacity: 0;
  transform: scale(0.85);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes glow {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.25);
    opacity: 0;
  }
}
@keyframes float {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-3px) rotate(-8deg);
  }
}
@keyframes drift {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(-24px, 16px) scale(1.1);
  }
}
@keyframes step-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgb(27 138 60 / 0.35);
  }
  50% {
    box-shadow: 0 0 0 6px rgb(27 138 60 / 0);
  }
}
@keyframes indeterminate {
  0% {
    left: -35%;
  }
  100% {
    left: 100%;
  }
}
@keyframes stripes {
  to {
    background-position: 16px 0, 0 0;
  }
}
@keyframes shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .orb-ring,
  .orb-glow,
  .orb-icon,
  .blob-green,
  .blob-red,
  .step-active,
  .bar-indeterminate,
  .bar-stripes,
  .shimmer,
  .caret {
    animation: none;
  }
  .bar-indeterminate {
    left: 0;
    width: 100%;
    opacity: 0.4;
  }
}
</style>
