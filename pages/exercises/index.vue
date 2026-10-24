<script setup lang="ts">
import type {
  ExerciseJob,
  ExerciseLevel,
  ExerciseOptions,
  ExercisePreview,
  ExerciseType,
  ExerciseTypeOption,
} from '~/types/ai-exercise.type'
import ExerciseAccessGate from '~/components/exercise/ExerciseAccessGate.vue'
import ExerciseHistory from '~/components/exercise/ExerciseHistory.vue'
import ExerciseStreamPreview from '~/components/exercise/ExerciseStreamPreview.vue'
import { parseExerciseError, useAIExerciseApi } from '~/composables/api/useAIExerciseApi'
import { EXERCISE_TYPE_META } from '~/utils/exercise'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'onboarding'],
})

useHead({
  title: 'Bài tập AI — Luyện tiếng Ý theo chủ đề',
  meta: [
    {
      name: 'description',
      content: 'Chọn chủ đề, trình độ và dạng bài, AI soạn bài tập tiếng Ý cho bạn ngay.',
    },
  ],
})

const api = useAIExerciseApi()
const route = useRoute()
const router = useRouter()

const options = ref<ExerciseOptions | null>(null)
const optionsLoading = ref(true)
const optionsError = ref('')

// Lựa chọn của học viên — có thể điền sẵn qua query (nút "Tạo bài mới" ở trang kết quả)
const topicId = ref<string>(String(route.query.topic ?? ''))
const level = ref<ExerciseLevel | ''>((String(route.query.level ?? '').toUpperCase() as ExerciseLevel) || '')
const exerciseType = ref<ExerciseType | ''>((String(route.query.type ?? '') as ExerciseType) || '')
const questionCount = ref(10)

const generating = ref(false)
// Lượt soạn bài đang theo dõi (AI chạy ở worker phía server, trang chỉ poll trạng thái)
const job = ref<ExerciseJob | null>(null)
let pollAbort: AbortController | null = null
// Nút tạo nằm cuối form: khi chuyển sang màn chờ phải cuộn lên để thấy phần đầu (orb + trạng thái)
const headerRef = ref<HTMLElement | null>(null)
const errorRef = ref<HTMLElement | null>(null)
const preview = ref<ExercisePreview | null>(null)
const errorMessage = ref('')

const selectedType = computed<ExerciseTypeOption | undefined>(() =>
  options.value?.exercise_types.find(item => item.value === exerciseType.value),
)
const isListening = computed(() => exerciseType.value === 'listening')
const selectedTopicName = computed(() => options.value?.topics.find(t => t.id === topicId.value)?.name ?? '')

/** Kiểu trả lời của dạng bài ở trình độ đang chọn (điền từ B2+ là tự gõ). */
function answerModeLabel(item: ExerciseTypeOption): string {
  if (!item.ai_generated)
    return 'Bài nghe do giáo viên soạn'
  if (!level.value || !item.answer_mode)
    return 'Trắc nghiệm'
  return item.answer_mode[level.value] === 'typed' ? 'Tự gõ đáp án' : 'Trắc nghiệm 1 đáp án'
}

const remainingGenerations = computed(() => options.value?.daily_limit.remaining ?? null)
const limitReached = computed(() => !isListening.value && remainingGenerations.value !== null && remainingGenerations.value <= 0)

const canGenerate = computed(() =>
  !!topicId.value && !!level.value && !!exerciseType.value && !generating.value && !limitReached.value,
)

// Nhãn + số câu lấy theo job (khi tiếp tục một job cũ, form có thể đang chọn thứ khác)
const previewLabel = computed(() => {
  if (job.value)
    return [EXERCISE_TYPE_META[job.value.exercise_type]?.label, job.value.topic_name, job.value.level_code].filter(Boolean).join(' · ')
  return [EXERCISE_TYPE_META[exerciseType.value as ExerciseType]?.label, selectedTopicName.value, level.value]
    .filter(Boolean)
    .join(' · ')
})
const previewQuestionCount = computed(() => job.value?.question_count ?? questionCount.value)

async function loadOptions() {
  optionsLoading.value = true
  optionsError.value = ''
  try {
    options.value = await api.getOptions()
    // Bỏ giá trị điền sẵn không còn hợp lệ (chủ đề đã tắt, dạng bài lạ...)
    if (topicId.value && !options.value.topics.some(t => t.id === topicId.value))
      topicId.value = ''
    if (level.value && !options.value.levels.includes(level.value))
      level.value = ''
    if (exerciseType.value && !options.value.exercise_types.some(t => t.value === exerciseType.value))
      exerciseType.value = ''
  }
  catch (error) {
    optionsError.value = parseExerciseError(error).message
  }
  finally {
    optionsLoading.value = false
  }
}

async function showError(message: string) {
  errorMessage.value = message
  generating.value = false
  job.value = null
  preview.value = null
  await nextTick()
  errorRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

/** Theo dõi job tới khi xong: thành công thì mở bài, thất bại thì báo lỗi. */
async function followJob(current: ExerciseJob) {
  pollAbort?.abort()
  pollAbort = new AbortController()
  job.value = current
  preview.value = current.progress?.preview ?? null
  generating.value = true
  await nextTick()
  headerRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  try {
    const final = await api.followJob(current.id, {
      signal: pollAbort.signal,
      onUpdate: (update) => {
        job.value = update
        // Giữ bản xem trước cũ nếu lần poll này chưa có bản mới
        preview.value = update.progress?.preview ?? preview.value
      },
    })
    if (final.status === 'succeeded' && final.quiz) {
      await router.push(`/quizz/${final.quiz}`)
      return
    }
    await showError(final.error?.message || 'Không tạo được bài tập lúc này. Vui lòng thử lại sau.')
    // Lượt thất bại không tính vào hạn mức — cập nhật lại số lượt còn lại
    loadOptions()
  }
  catch (error) {
    if ((error as DOMException)?.name === 'AbortError')
      return
    await showError('Mất kết nối khi theo dõi bài đang soạn. Tải lại trang để xem tiếp — bài vẫn được soạn ở máy chủ.')
  }
}

async function handleGenerate() {
  if (!canGenerate.value || !level.value || !exerciseType.value)
    return

  generating.value = true
  preview.value = null
  errorMessage.value = ''
  try {
    const created = await api.createJob({
      topic_id: topicId.value,
      level: level.value,
      exercise_type: exerciseType.value,
      question_count: questionCount.value,
    })
    // Nghe hiểu: không qua hàng đợi, có bài ngay
    if (created.status === 'succeeded' && created.quiz) {
      await router.push(`/quizz/${created.quiz}`)
      return
    }
    await followJob(created)
  }
  catch (error) {
    const { errorCode, message } = parseExerciseError(error)
    // Đang có một bài soạn dở (vd mở ở tab khác): theo dõi tiếp bài đó
    const runningJob = (error as { data?: { details?: { job?: ExerciseJob } } })?.data?.details?.job
    if (errorCode === 'EXERCISE_JOB_IN_PROGRESS' && runningJob) {
      await followJob(runningJob)
      return
    }
    await showError(message)
    // Quyền / hạn mức có thể đã đổi — đọc lại để màn hình phản ánh đúng.
    if (errorCode === 'EXERCISE_ACCESS_DENIED' || errorCode === 'EXERCISE_DAILY_LIMIT_REACHED')
      await loadOptions()
  }
}

/** Mở lại trang khi đang có bài soạn dở (reload, quay lại từ trang khác) -> hiện tiếp tiến độ. */
async function resumeActiveJob() {
  try {
    const { job: active } = await api.getActiveJob()
    if (active)
      await followJob(active)
  }
  catch {
    // Không lấy được thì thôi — học viên vẫn tạo bài mới bình thường
  }
}

onMounted(async () => {
  await loadOptions()
  if (options.value?.access.can_use)
    await resumeActiveJob()
})

// Rời trang: chỉ dừng hỏi trạng thái, job vẫn chạy tiếp ở server
onUnmounted(() => pollAbort?.abort())
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="mx-auto max-w-5xl space-y-6 px-4">
      <!-- Khung xương trong lúc tải chủ đề / quyền -->
      <div v-if="optionsLoading" class="space-y-6" aria-busy="true" aria-label="Đang tải">
        <div class="flex flex-col items-center gap-2">
          <div class="h-8 w-40 animate-pulse rounded-lg bg-gray-200" />
          <div class="h-4 w-72 max-w-full animate-pulse rounded bg-gray-200" />
        </div>
        <div class="space-y-6 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
          <div v-for="row in 2" :key="`chips-${row}`" class="space-y-3">
            <div class="h-3 w-24 animate-pulse rounded bg-gray-200" />
            <div class="flex flex-wrap gap-2">
              <div v-for="chip in 6" :key="chip" class="h-9 w-20 animate-pulse rounded-full bg-gray-100" />
            </div>
          </div>
          <div class="space-y-3">
            <div class="h-3 w-24 animate-pulse rounded bg-gray-200" />
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div v-for="card in 5" :key="card" class="h-24 animate-pulse rounded-2xl bg-gray-100" />
            </div>
          </div>
          <div class="mx-auto h-12 w-44 animate-pulse rounded-full bg-gray-200" />
        </div>
      </div>

      <div v-else-if="optionsError" class="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-red-700">
        <p>{{ optionsError }}</p>
        <button type="button" class="mt-3 cursor-pointer text-sm underline" @click="loadOptions">
          Thử lại
        </button>
      </div>

      <ExerciseAccessGate v-else-if="options && !options.access.can_use" />

      <template v-else-if="options">
        <header ref="headerRef" class="scroll-mt-20 text-center">
          <h1 class="text-2xl font-bold text-gray-900 sm:text-3xl">
            Bài tập AI
          </h1>
          <p class="mt-1.5 text-sm text-gray-500">
            Chọn chủ đề, trình độ và dạng bài — AI soạn bài tập tiếng Ý cho bạn ngay.
          </p>
        </header>

        <Transition name="swap" mode="out-in">
          <ExerciseStreamPreview
            v-if="generating"
            :key="job?.id ?? 'pending'"
            :preview="preview"
            :question-count="previewQuestionCount"
            :label="previewLabel"
            :listening="!job && isListening"
            :queued="job?.status === 'queued'"
            :queue-position="job?.queue_position"
            :started-at="job?.created_at"
          />

          <section v-else class="space-y-6 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
            <!-- Chủ đề -->
            <div>
              <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                1. Chủ đề
              </h2>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="topic in options.topics"
                  :key="topic.id"
                  type="button"
                  class="cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors"
                  :class="topicId === topic.id
                    ? 'border-[#1B8A3C] bg-[#1B8A3C] text-white'
                    : 'border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50'"
                  :title="topic.description || undefined"
                  @click="topicId = topic.id"
                >
                  {{ topic.name }}
                </button>
              </div>
            </div>

            <!-- Trình độ -->
            <div>
              <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                2. Trình độ
              </h2>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="code in options.levels"
                  :key="code"
                  type="button"
                  class="w-16 cursor-pointer rounded-xl border py-2 text-sm font-bold transition-colors"
                  :class="level === code
                    ? 'border-[#1B8A3C] bg-[#1B8A3C] text-white'
                    : 'border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50'"
                  @click="level = code"
                >
                  {{ code }}
                </button>
              </div>
            </div>

            <!-- Dạng bài -->
            <div>
              <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                3. Dạng bài
              </h2>
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <button
                  v-for="item in options.exercise_types"
                  :key="item.value"
                  type="button"
                  class="flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-left transition-colors"
                  :class="exerciseType === item.value
                    ? 'border-[#1B8A3C] bg-[#F1F9F3] ring-2 ring-green-200'
                    : 'border-gray-200 hover:border-green-300 hover:bg-green-50'"
                  @click="exerciseType = item.value"
                >
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                    <Icon :name="EXERCISE_TYPE_META[item.value]?.icon || 'tabler:list-check'" class="text-xl text-[#1B8A3C]" />
                  </div>
                  <div>
                    <p class="font-semibold text-gray-900">
                      {{ item.label }}
                    </p>
                    <p class="text-xs text-gray-500">
                      {{ EXERCISE_TYPE_META[item.value]?.description }}
                    </p>
                    <p class="mt-1 text-xs font-medium text-[#1B8A3C]">
                      {{ answerModeLabel(item) }}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <!-- Số câu -->
            <div>
              <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                4. Số lượng câu hỏi
              </h2>
              <p v-if="isListening" class="text-sm text-gray-500">
                Bài nghe có số câu cố định theo đề của giáo viên.
              </p>
              <div v-else class="flex flex-wrap gap-2">
                <button
                  v-for="count in options.question_counts"
                  :key="count"
                  type="button"
                  class="w-16 cursor-pointer rounded-xl border py-2 text-sm font-bold transition-colors"
                  :class="questionCount === count
                    ? 'border-[#1B8A3C] bg-[#1B8A3C] text-white'
                    : 'border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50'"
                  @click="questionCount = count"
                >
                  {{ count }}
                </button>
              </div>
            </div>

            <div v-if="errorMessage" ref="errorRef" class="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
              <Icon name="tabler:alert-circle" class="mt-0.5 shrink-0 text-lg" />
              <span>{{ errorMessage }}</span>
            </div>

            <div class="flex flex-col items-center gap-2 border-t border-gray-100 pt-6">
              <button
                type="button"
                :disabled="!canGenerate"
                class="flex items-center gap-2 rounded-full px-8 py-3 text-base font-semibold text-white shadow-sm transition-all"
                :class="canGenerate
                  ? 'cursor-pointer bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 hover:shadow-md'
                  : 'cursor-not-allowed bg-gray-300'"
                @click="handleGenerate"
              >
                <Icon :name="isListening ? 'tabler:headphones' : 'tabler:sparkles'" />
                {{ isListening ? 'Lấy bài nghe' : 'Tạo bài tập' }}
              </button>
              <p v-if="!topicId || !level || !exerciseType" class="text-xs text-gray-400">
                Chọn đủ chủ đề, trình độ và dạng bài để bắt đầu.
              </p>
              <p v-else-if="limitReached" class="text-xs text-red-500">
                Bạn đã dùng hết {{ options.daily_limit.limit }} lượt tạo trong 24 giờ qua. Hãy quay lại sau nhé.
              </p>
              <p v-else-if="remainingGenerations !== null && !isListening" class="text-xs text-gray-400">
                Còn {{ remainingGenerations }}/{{ options.daily_limit.limit }} lượt tạo trong 24 giờ.
              </p>
              <p v-else-if="selectedType && !isListening" class="text-xs text-gray-400">
                Soạn {{ questionCount }} câu có thể mất 20–60 giây.
              </p>
            </div>
          </section>
        </Transition>

        <ExerciseHistory />
      </template>
    </div>
  </div>
</template>

<style scoped>
.swap-enter-active,
.swap-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.swap-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.swap-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
