<script setup lang="ts">
import type { AudioTrack, QuizSourcePage } from '~/composables/api/useNewQuizApi'
import type { PdfImportPayload } from '~/composables/api/useQuizImportApi'
import type { ExerciseTopic } from '~/types/ai-exercise.type'
import type { DraftQuestion } from '~/types/listening-editor.type'
import { useElementSize } from '@vueuse/core'
import { message } from 'ant-design-vue'
import LevelSelector from '~/components/admin/new-quiz/LevelSelector.vue'
import PdfExamImport from '~/components/admin/new-quiz/PdfExamImport.vue'
import { useAIExerciseApi } from '~/composables/api/useAIExerciseApi'
import { useNewQuizApi } from '~/composables/api/useNewQuizApi'
import { QUIZ_AUDIO_TYPES, QUIZ_IMAGE_TYPES, useQuizMediaUpload } from '~/composables/useQuizMediaUpload'
import { audioTrackLabel, quizAudioTracks } from '~/utils/exercise'
import { draftFromApi, draftFromImport, draftProblem, draftToApi, hasAnswer, newDraft, sectionNumbers, shortSection } from '~/utils/listeningDraft'
import AnswerSheet from './AnswerSheet.vue'
import CompactQuestion from './CompactQuestion.vue'

/**
 * Trình soạn bài nghe: thông tin bài + audio + đề PDF gọn trên một khung, phiếu
 * đáp án tổng quan dính ở trên, câu hỏi dạng dòng gọn đặt cạnh trang PDF chứa nó.
 */
const props = withDefaults(defineProps<{
  mode: 'create' | 'edit'
  quizId?: string
  saving?: boolean
}>(), {
  quizId: undefined,
  saving: false,
})

const emit = defineEmits<{
  back: []
  submit: [payload: Record<string, unknown>]
}>()

const { getQuiz, getLevels } = useNewQuizApi()
const { getTopics } = useAIExerciseApi()
const { uploadAudio, uploadImage, progress: uploadProgress } = useQuizMediaUpload()

const form = reactive({
  title: '',
  description: '',
  level_id: '',
  topic: undefined as string | undefined,
  /** Thời gian làm bài (phút); trống = không giới hạn. */
  minutes: 30 as number | null,
  retake_limit: 1,
  is_published: false,
  image_urls: [] as string[],
  // Trang đề PDF: chỉ để người soạn đối chiếu, học viên không thấy.
  source_pages: [] as QuizSourcePage[],
})
const questions = ref<DraftQuestion[]>([])
const topics = ref<ExerciseTopic[]>([])
const loading = ref(false)
const showMore = ref(false)
const pdfImportOpen = ref(false)
const importWarnings = ref<string[]>([])
// Chỉ tô vàng câu lỗi sau khi giáo viên bấm lưu, tránh cả trang vàng khi đang soạn dở.
const showProblems = ref(false)
const flashKey = ref('')
const uploadingImages = ref(0)

// ─── Audio: một hoặc nhiều file, mỗi file gắn với một phần (Prova) hoặc cả bài ──
interface TrackDraft extends AudioTrack {
  key: string
  uploading: boolean
}
const tracks = ref<TrackDraft[]>([])
const uploadingAudio = computed(() => tracks.value.some(track => track.uploading))

// Các phần của đề theo thứ tự xuất hiện — để gắn audio cho từng phần.
const sectionNames = computed(() => [...new Set(questions.value.map(question => question.section).filter(Boolean))])
const sectionOptions = computed(() => [
  { label: 'Cả bài', value: '' },
  ...sectionNames.value.map(section => ({ label: shortSection(section), title: section, value: section })),
])
const hasSectionAudio = computed(() => tracks.value.some(track => track.section))
const hasWholeAudio = computed(() => tracks.value.some(track => !track.section))

function trackIndexFor(section: string) {
  return section ? tracks.value.findIndex(track => track.section === section) : -1
}

const topicOptions = computed(() => topics.value.map(topic => ({ label: topic.name, value: topic.id })))
const numbers = computed(() => sectionNumbers(questions.value))
const problems = computed(() => new Map(questions.value.map(question => [question.key, draftProblem(question)])))
const problemKeys = computed(() => new Set(
  showProblems.value ? [...problems.value].filter(([, problem]) => problem).map(([key]) => key) : [],
))

// ─── Nhóm câu theo trang đề ────────────────────────────────────
function pageOf(question: DraftQuestion): number | null {
  const page = question.sourcePage
  return page && page >= 1 && page <= form.source_pages.length ? page : null
}

const groups = computed(() => {
  const result: { key: string, page: number | null, items: { question: DraftQuestion, index: number }[] }[] = []
  questions.value.forEach((question, index) => {
    const page = pageOf(question)
    const last = result.at(-1)
    if (last && last.page === page)
      last.items.push({ question, index })
    else
      result.push({ key: `${page ?? 'none'}-${question.key}`, page, items: [{ question, index }] })
  })
  return result
})

// Trang không có câu nào (trang đáp án, hướng dẫn...) — vẫn cho xem để đối chiếu.
const otherPages = computed(() =>
  form.source_pages.filter((_, index) => !questions.value.some(question => pageOf(question) === index + 1)),
)

function startsSection(index: number) {
  const question = questions.value[index]!
  return index === 0 || question.section !== questions.value[index - 1]!.section
}

// Ảnh trang dính ngay dưới phiếu đáp án khi cuộn.
const sheetRef = ref<HTMLElement | null>(null)
const { height: sheetHeight } = useElementSize(sheetRef)
const pageStickyTop = computed(() => `${Math.round(sheetHeight.value) + 24}px`)

// Trên điện thoại ảnh trang mặc định ẩn để đỡ phải cuộn.
const openPages = ref(new Set<number>())
function togglePage(page: number) {
  const next = new Set(openPages.value)
  if (next.has(page))
    next.delete(page)
  else
    next.add(page)
  openPages.value = next
}

// ─── Sửa câu hỏi ───────────────────────────────────────────────
function updateQuestion(key: string, patch: Partial<DraftQuestion>) {
  const question = questions.value.find(item => item.key === key)
  if (!question)
    return
  // Giáo viên tự đổi đáp án -> không còn là đáp án AI điền.
  if ('correct' in patch || 'answer' in patch)
    question.aiAnswer = null
  Object.assign(question, patch)
}

const missingAnswerCount = computed(() => questions.value.filter(question => !hasAnswer(question)).length)

function aiAnswerLabel(question: DraftQuestion) {
  if (!question.aiAnswer || !hasAnswer(question))
    return ''
  if (question.aiAnswer.source === 'pasted_key')
    return 'theo đáp án bạn dán'
  const page = question.aiAnswer.page ? form.source_pages[question.aiAnswer.page - 1]?.page : null
  return page ? `đáp án trang ${page} trong PDF` : 'từ trang đáp án'
}

function removeQuestion(key: string) {
  questions.value = questions.value.filter(item => item.key !== key)
}

/** Đổi tên phần cho cả nhóm câu liền nhau cùng phần, bắt đầu từ `start`. */
function renameSection(start: number, value: string) {
  const old = questions.value[start]?.section
  for (let index = start; index < questions.value.length && questions.value[index]!.section === old; index++)
    questions.value[index]!.section = value
  // Audio gắn với phần này đi theo tên mới (nếu không còn câu nào mang tên cũ).
  if (old && !questions.value.some(question => question.section === old)) {
    for (const track of tracks.value) {
      if (track.section === old)
        track.section = value
    }
  }
}

function addQuestion(kind: 'choice' | 'true_false' | 'fill') {
  const last = questions.value.at(-1)
  const draft = newDraft(kind === 'fill' ? 'text_input' : 'multiple_choice', last?.section ?? '', last?.sourcePage ?? null)
  if (kind === 'true_false')
    draft.options = [{ label: 'A', text: 'Vero' }, { label: 'B', text: 'Falso' }]
  questions.value.push(draft)
  nextTick(() => jumpTo(draft.key))
}

function jumpTo(key: string) {
  document.getElementById(`lq-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  flashKey.value = key
  setTimeout(() => {
    if (flashKey.value === key)
      flashKey.value = ''
  }, 1600)
}

// ─── Đề PDF ────────────────────────────────────────────────────
async function applyPdfImport({ pages, result, mode }: PdfImportPayload) {
  if (mode === 'replace') {
    form.source_pages = pages
    questions.value = result.questions.map(question => draftFromImport(question))
  }
  else {
    // Thêm vào sau: trang mới nối tiếp trang cũ nên số trang của câu mới phải dời theo.
    const offset = form.source_pages.length
    form.source_pages.push(...pages)
    questions.value.push(...result.questions.map(question => draftFromImport(question, offset)))
  }
  importWarnings.value = result.warnings
  showProblems.value = false
  // Đề mới có thể đổi tên phần: bỏ gắn audio với phần không còn, rồi thử gán lại theo thứ tự.
  for (const track of tracks.value) {
    if (track.section && !sectionNames.value.includes(track.section))
      track.section = ''
  }
  autoAssignTracks()
  if (!form.title.trim() && result.title)
    form.title = result.title
  if (!form.level_id && result.level) {
    try {
      const levels = await getLevels({ is_active: true })
      form.level_id = levels.results.find(level => level.code.toUpperCase() === result.level)?.id ?? ''
    }
    catch (err) {
      console.error('Error loading levels:', err)
    }
  }
  if (result.missing_answers)
    message.warning(`Đã tạo ${result.questions.length} câu hỏi — ${result.missing_answers} câu chưa có đáp án, cần bạn chọn.`, 6)
  else
    message.success(`Đã tạo ${result.questions.length} câu hỏi, đủ đáp án — hãy đối chiếu lại.`)
}

// ─── Audio + ảnh kèm ───────────────────────────────────────────
function titleFromFile(name: string) {
  return name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 100)
}

// Chọn nhiều file một lần: giữ đúng thứ tự chọn (chỗ trống được giữ trước, điền URL khi tải xong).
function handleAudioSelect(file: File) {
  if (!QUIZ_AUDIO_TYPES.includes(file.type)) {
    message.error(`${file.name}: chỉ hỗ trợ file audio MP3 hoặc WAV`)
    return false
  }
  const key = `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  tracks.value.push({ key, url: '', title: titleFromFile(file.name), section: '', uploading: true })
  uploadAudio(file)
    .then((url) => {
      const track = tracks.value.find(item => item.key === key)
      if (track) {
        track.url = url
        track.uploading = false
      }
      if (!uploadingAudio.value)
        autoAssignTracks()
    })
    .catch(() => {
      message.error(`Tải ${file.name} lên thất bại`)
      tracks.value = tracks.value.filter(item => item.key !== key)
    })
  return false
}

/** Số file bằng số phần và chưa file nào gắn phần -> gán lần lượt file 1 cho phần 1... */
function autoAssignTracks() {
  const sections = sectionNames.value
  if (sections.length < 2 || tracks.value.length !== sections.length || hasSectionAudio.value)
    return
  assignInOrder()
  message.info('Đã gắn từng file audio cho từng phần theo thứ tự — kiểm tra lại nếu cần.')
}

function assignInOrder() {
  tracks.value.forEach((track, index) => {
    track.section = sectionNames.value[index] ?? ''
  })
}

function moveTrack(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= tracks.value.length)
    return
  const list = [...tracks.value]
  ;[list[index], list[target]] = [list[target]!, list[index]!]
  tracks.value = list
}

function removeTrack(key: string) {
  tracks.value = tracks.value.filter(track => track.key !== key)
}

function handleImageSelect(file: File) {
  if (!QUIZ_IMAGE_TYPES.includes(file.type)) {
    message.error('Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF')
    return false
  }
  uploadingImages.value++
  uploadImage(file)
    .then(url => form.image_urls.push(url))
    .catch(() => message.error(`Tải ảnh ${file.name} lên thất bại`))
    .finally(() => {
      uploadingImages.value--
    })
  return false
}

// ─── Lưu ───────────────────────────────────────────────────────
function submit() {
  const missingInfo = !form.title.trim()
    ? 'Nhập tên bài nghe'
    : !form.level_id
        ? 'Chọn trình độ'
        : !tracks.value.length ? 'Tải file audio lên' : ''
  if (missingInfo) {
    message.warning(missingInfo)
    document.getElementById('listening-info')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }
  if (uploadingAudio.value || uploadingImages.value > 0) {
    message.warning('Đang tải file lên, vui lòng đợi xong rồi lưu.')
    return
  }
  if (!questions.value.length) {
    message.warning('Bài nghe chưa có câu hỏi nào')
    return
  }
  const invalid = questions.value.filter(question => problems.value.get(question.key))
  if (invalid.length) {
    showProblems.value = true
    message.warning(`Còn ${invalid.length} câu chưa hoàn chỉnh (viền vàng)`)
    jumpTo(invalid[0]!.key)
    return
  }

  const pageCount = form.source_pages.length
  const audioTracks = tracks.value.map(track => ({
    url: track.url,
    title: track.title.trim(),
    section: sectionNames.value.includes(track.section) ? track.section : '',
  }))
  emit('submit', {
    title: form.title.trim(),
    description: form.description.trim(),
    level_id: form.level_id,
    exercise_type: 'listening',
    topic: form.topic || null,
    passage: '',
    audio_url: audioTracks[0]!.url,
    audio_tracks: audioTracks,
    image_urls: form.image_urls,
    source_pages: form.source_pages,
    time_type: form.minutes ? 'limit' : 'none',
    time_value: form.minutes || null,
    time_unit: 'minute',
    retake_limit: form.retake_limit || 1,
    is_published: form.is_published,
    questions: questions.value.map((question, index) => draftToApi(question, index + 1, pageCount)),
  })
}

// ─── Tải dữ liệu ───────────────────────────────────────────────
async function loadQuiz(id: string) {
  loading.value = true
  try {
    const quiz = await getQuiz(id)
    form.title = quiz.title
    form.description = quiz.description || ''
    form.level_id = quiz.level
    form.topic = quiz.topic || undefined
    form.minutes = quiz.time_type === 'limit' && quiz.time_value
      ? (quiz.time_unit === 'second' ? Math.ceil(quiz.time_value / 60) : quiz.time_value)
      : null
    form.retake_limit = quiz.retake_limit
    form.is_published = quiz.is_published
    tracks.value = quizAudioTracks(quiz).map((track, index) => ({ ...track, key: `t-${index}`, uploading: false }))
    form.image_urls = [...(quiz.image_urls || [])]
    form.source_pages = [...(quiz.source_pages || [])]
    questions.value = [...(quiz.questions || [])].sort((a, b) => a.order - b.order).map(draftFromApi)
  }
  catch (err: any) {
    message.error(err?.message || 'Không tải được bài nghe')
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  getTopics({ limit: 100 })
    .then((res) => {
      topics.value = res.results
    })
    .catch(err => console.error('Error loading exercise topics:', err))
  if (props.mode === 'edit' && props.quizId)
    loadQuiz(props.quizId)
})
</script>

<template>
  <div class="mx-auto w-full max-w-7xl space-y-4 p-1 sm:p-4">
    <!-- Tiêu đề trang -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <a-button class="!flex !items-center !justify-center" @click="emit('back')">
          <Icon name="tabler:arrow-left" />
        </a-button>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">
          {{ mode === 'edit' ? 'Sửa bài nghe' : 'Tạo bài nghe' }}
        </h1>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <a-spin size="large" />
    </div>

    <template v-else>
      <!-- Thông tin bài + audio + đề PDF -->
      <section id="listening-info" class="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        <div class="grid gap-3 md:grid-cols-12">
          <div class="block md:col-span-6">
            <span class="mb-1 block text-xs font-medium text-gray-600">Tên bài <span class="text-red-500">*</span></span>
            <a-input v-model:value="form.title" placeholder="Vd: CILS DUE-B2 · Ascolto 1" :maxlength="200" />
          </div>
          <div class="block md:col-span-2">
            <span class="mb-1 block text-xs font-medium text-gray-600">Trình độ <span class="text-red-500">*</span></span>
            <LevelSelector v-model="form.level_id" class="!h-8 w-full" />
          </div>
          <div class="block md:col-span-2">
            <span class="mb-1 block text-xs font-medium text-gray-600">Chủ đề</span>
            <a-select v-model:value="form.topic" allow-clear placeholder="Không chủ đề" :options="topicOptions" class="w-full" />
          </div>
          <div class="block md:col-span-2">
            <span class="mb-1 block text-xs font-medium text-gray-600">Thời gian (phút)</span>
            <a-input-number v-model:value="form.minutes" :min="1" placeholder="Không giới hạn" class="!w-full" />
          </div>
        </div>

        <div>
          <span class="mb-1 block text-xs font-medium text-gray-600">Đề PDF</span>
          <div class="flex items-center gap-2">
            <a-button type="primary" ghost class="!flex !items-center !gap-1" @click="pdfImportOpen = true">
              <Icon name="tabler:file-type-pdf" />
              {{ form.source_pages.length ? 'Tải đề khác' : 'Tải đề PDF' }}
            </a-button>
            <span class="truncate text-xs text-gray-500">
              {{ form.source_pages.length ? `${form.source_pages.length} trang PDF · AI tạo câu hỏi, học viên không xem PDF` : 'AI đọc đề ra câu hỏi, bạn chỉ cần kiểm tra' }}
            </span>
          </div>
        </div>

        <!-- Audio: một file cho cả bài, hoặc mỗi phần (Prova) một file -->
        <div>
          <span class="mb-1 block text-xs font-medium text-gray-600">Audio <span class="text-red-500">*</span></span>
          <div v-if="tracks.length" class="mb-2 space-y-1.5">
            <div
              v-for="(track, index) in tracks"
              :key="track.key"
              class="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 px-2 py-1.5 sm:flex-nowrap"
            >
              <span class="w-4 shrink-0 text-center text-xs font-semibold text-gray-400">{{ index + 1 }}</span>
              <a-input
                v-model:value="track.title"
                size="small"
                :maxlength="100"
                :placeholder="`Audio ${index + 1}`"
                class="!w-full sm:!w-44"
              />
              <a-select
                v-if="tracks.length > 1 || sectionNames.length > 1"
                v-model:value="track.section"
                size="small"
                :options="sectionOptions"
                class="!w-full sm:!w-44 sm:shrink-0"
                title="Phần dùng file này"
              />
              <audio v-if="!track.uploading" :src="track.url" controls preload="none" class="h-8 min-w-0 flex-1" />
              <span v-else class="flex flex-1 items-center gap-2 text-xs text-gray-500">
                <a-spin size="small" /> Đang tải lên… {{ uploadProgress }}%
              </span>
              <div class="flex shrink-0 items-center text-gray-400">
                <button type="button" class="cursor-pointer rounded p-1 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30" :disabled="index === 0" title="Lên" @click="moveTrack(index, -1)">
                  <Icon name="tabler:arrow-up" />
                </button>
                <button type="button" class="cursor-pointer rounded p-1 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30" :disabled="index === tracks.length - 1" title="Xuống" @click="moveTrack(index, 1)">
                  <Icon name="tabler:arrow-down" />
                </button>
                <button type="button" class="cursor-pointer rounded p-1 hover:bg-red-50 hover:text-red-600" title="Bỏ file này" @click="removeTrack(track.key)">
                  <Icon name="tabler:trash" />
                </button>
              </div>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <a-upload accept=".mp3,.wav,audio/mpeg,audio/wav" multiple :show-upload-list="false" :before-upload="handleAudioSelect">
              <a-button size="small" class="!flex !items-center !gap-1">
                <Icon name="tabler:headphones" />
                {{ tracks.length ? 'Thêm file audio' : 'Tải audio lên (MP3/WAV, chọn được nhiều file)' }}
              </a-button>
            </a-upload>
            <a-button v-if="tracks.length > 1 && sectionNames.length > 1" size="small" type="link" @click="assignInOrder">
              Gắn theo thứ tự phần
            </a-button>
            <span v-if="tracks.length > 1" class="text-xs text-gray-500">
              Học viên không chọn file: làm tới phần nào thì nghe file của phần đó, phần không có file riêng nghe file "Cả bài". Nhiều file cùng một chỗ phát nối tiếp theo thứ tự.
            </span>
          </div>
        </div>

        <button type="button" class="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-800" @click="showMore = !showMore">
          <Icon :name="showMore ? 'tabler:chevron-up' : 'tabler:chevron-down'" class="align-[-2px]" />
          Tuỳ chọn khác (mô tả, số lần làm lại, ảnh kèm)
        </button>
        <div v-if="showMore" class="grid gap-3 border-t border-gray-100 pt-3 md:grid-cols-12">
          <div class="block md:col-span-8">
            <span class="mb-1 block text-xs font-medium text-gray-600">Mô tả</span>
            <a-textarea v-model:value="form.description" :auto-size="{ minRows: 1, maxRows: 4 }" placeholder="Không bắt buộc" />
          </div>
          <div class="block md:col-span-4">
            <span class="mb-1 block text-xs font-medium text-gray-600">Số lần mỗi học viên được làm</span>
            <a-input-number v-model:value="form.retake_limit" :min="1" class="!w-full" />
          </div>
          <div class="md:col-span-12">
            <span class="mb-1 block text-xs font-medium text-gray-600">Ảnh kèm (học viên xem khi làm bài, vd tranh cho câu chọn hình)</span>
            <div class="flex flex-wrap items-center gap-2">
              <div v-for="(url, index) in form.image_urls" :key="url" class="relative h-16 w-16 overflow-hidden rounded border border-gray-200">
                <a-image :src="url" :width="64" :height="64" class="object-cover" />
                <button
                  type="button"
                  class="absolute right-0 top-0 cursor-pointer rounded-bl bg-white/90 px-1 text-red-500"
                  @click="form.image_urls.splice(index, 1)"
                >
                  <Icon name="tabler:x" />
                </button>
              </div>
              <a-upload accept="image/jpeg,image/png,image/webp,image/gif" multiple :show-upload-list="false" :before-upload="handleImageSelect">
                <a-button size="small" :loading="uploadingImages > 0">
                  + Thêm ảnh
                </a-button>
              </a-upload>
            </div>
          </div>
        </div>
      </section>

      <a-alert v-if="importWarnings.length" type="warning" show-icon closable @close="importWarnings = []">
        <template #message>
          AI ghi chú khi đọc đề:
        </template>
        <template #description>
          <ul class="mb-0 list-disc pl-5 text-sm">
            <li v-for="warning in importWarnings" :key="warning">
              {{ warning }}
            </li>
          </ul>
        </template>
      </a-alert>

      <!-- Chưa có câu hỏi -->
      <div v-if="!questions.length" class="rounded-xl border-2 border-dashed border-gray-200 bg-white px-6 py-12 text-center">
        <Icon name="tabler:file-type-pdf" class="text-5xl text-red-500" />
        <p class="mt-3 text-lg font-semibold text-gray-900">
          Tải đề PDF để AI tạo câu hỏi
        </p>
        <p class="mx-auto mt-1 max-w-lg text-sm text-gray-500">
          AI đọc đề (CILS, CELI…) ra câu hỏi tương tác và lấy đáp án từ trang đáp án nếu có. Bạn chỉ cần kiểm tra lại.
        </p>
        <a-button type="primary" size="large" class="!mt-4 !inline-flex !items-center !gap-1" @click="pdfImportOpen = true">
          <Icon name="tabler:sparkles" />
          Tải đề PDF
        </a-button>
        <p class="mt-4 text-xs text-gray-500">
          hoặc thêm câu thủ công:
          <button type="button" class="cursor-pointer font-medium text-green-700 hover:underline" @click="addQuestion('choice')">
            trắc nghiệm
          </button> ·
          <button type="button" class="cursor-pointer font-medium text-green-700 hover:underline" @click="addQuestion('true_false')">
            Vero/Falso
          </button> ·
          <button type="button" class="cursor-pointer font-medium text-green-700 hover:underline" @click="addQuestion('fill')">
            điền từ
          </button>
        </p>
      </div>

      <template v-else>
        <!-- Còn câu thiếu đáp án: báo rõ cho giáo viên, không đợi tới lúc bấm lưu -->
        <a-alert v-if="missingAnswerCount" type="warning" show-icon>
          <template #message>
            {{ missingAnswerCount }} câu chưa có đáp án — chọn đủ đáp án mới lưu được bài.
          </template>
          <template #description>
            AI chỉ điền đáp án khi đề có trang đáp án (Chiavi, Soluzioni) hoặc bạn dán đáp án, không tự đoán. Câu thiếu có viền vàng
            và nhãn "Chưa có đáp án"; bấm ô vàng trên phiếu đáp án để tới từng câu.
          </template>
        </a-alert>

        <!-- Phiếu đáp án: tổng quan, dính trên cùng khi cuộn -->
        <div ref="sheetRef" class="sticky top-0 z-20">
          <AnswerSheet :questions="questions" :problem-keys="problemKeys" @jump="jumpTo" />
        </div>

        <!-- Câu hỏi theo trang đề -->
        <div class="space-y-6">
          <div
            v-for="group in groups"
            :key="group.key"
            :class="group.page ? 'grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]' : ''"
          >
            <div
              v-if="group.page"
              class="rounded-xl border border-gray-200 bg-gray-50 p-2 lg:sticky"
              :style="{ top: pageStickyTop }"
            >
              <button
                type="button"
                class="flex w-full cursor-pointer items-center justify-between gap-2 px-1 text-left text-xs font-semibold text-gray-600 lg:cursor-default"
                @click="togglePage(group.page)"
              >
                <span class="flex items-center gap-1">
                  <Icon name="tabler:file-text" />
                  Trang {{ form.source_pages[group.page - 1]?.page }} trong PDF · {{ group.items.length }} câu
                </span>
                <Icon :name="openPages.has(group.page) ? 'tabler:chevron-up' : 'tabler:chevron-down'" class="lg:hidden" />
              </button>
              <div class="mt-2 lg:block" :class="openPages.has(group.page) ? 'block' : 'hidden'">
                <a-image
                  :src="form.source_pages[group.page - 1]?.url"
                  :alt="`Trang ${form.source_pages[group.page - 1]?.page} trong PDF`"
                  class="rounded-md"
                />
              </div>
            </div>

            <div class="min-w-0 space-y-1.5">
              <template v-for="{ question, index } in group.items" :key="question.key">
                <p
                  v-if="!startsSection(index) && index === group.items[0]!.index && question.section"
                  class="truncate pt-1 text-xs font-medium text-gray-400"
                >
                  {{ question.section }} (tiếp)
                </p>
                <div v-if="startsSection(index) && (question.section || index > 0)" class="flex items-center gap-2 pb-0.5 pt-2">
                  <span class="shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-400">Phần</span>
                  <a-input
                    :value="question.section"
                    size="small"
                    :bordered="false"
                    :maxlength="200"
                    placeholder="Tên phần + hướng dẫn, vd: Prova n. 1 — Scegli la risposta corretta"
                    class="!rounded !bg-gray-50 !px-2 !font-semibold !text-gray-800"
                    @update:value="(value: string) => renameSection(index, value)"
                  />
                  <span
                    v-if="trackIndexFor(question.section) >= 0"
                    class="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700"
                    title="File audio của phần này"
                  >
                    <Icon name="tabler:headphones" class="align-[-2px]" />
                    {{ audioTrackLabel(tracks[trackIndexFor(question.section)]!, trackIndexFor(question.section)) }}
                  </span>
                  <span v-else-if="hasSectionAudio" class="shrink-0 text-xs" :class="hasWholeAudio ? 'text-gray-400' : 'text-amber-600'">
                    {{ hasWholeAudio ? 'Dùng audio cả bài' : 'Chưa có audio riêng' }}
                  </span>
                </div>
                <CompactQuestion
                  :id="`lq-${question.key}`"
                  :question="question"
                  :number="numbers[index]!"
                  :problem="problemKeys.has(question.key) ? problems.get(question.key) : null"
                  :flash="flashKey === question.key"
                  :ai-answer-label="aiAnswerLabel(question)"
                  class="scroll-mt-48"
                  @update="(patch: Partial<DraftQuestion>) => updateQuestion(question.key, patch)"
                  @delete="removeQuestion(question.key)"
                />
              </template>
            </div>
          </div>
        </div>

        <a-collapse v-if="otherPages.length" ghost>
          <a-collapse-panel key="other" :header="`Trang khác của đề (đáp án, hướng dẫn…) — ${otherPages.length} trang`">
            <a-image-preview-group>
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                <div v-for="item in otherPages" :key="item.url" class="rounded-lg border border-gray-200 bg-gray-50 p-1">
                  <a-image :src="item.url" :alt="`Trang ${item.page} trong PDF`" />
                  <p class="mt-1 text-center text-xs text-gray-500">
                    Trang {{ item.page }} trong PDF
                  </p>
                </div>
              </div>
            </a-image-preview-group>
          </a-collapse-panel>
        </a-collapse>

        <div class="flex flex-wrap items-center gap-2 border-t border-gray-200 pt-4">
          <span class="text-sm text-gray-500">Thêm câu:</span>
          <a-button size="small" @click="addQuestion('choice')">
            + Trắc nghiệm
          </a-button>
          <a-button size="small" @click="addQuestion('true_false')">
            + Vero/Falso
          </a-button>
          <a-button size="small" @click="addQuestion('fill')">
            + Điền từ
          </a-button>
        </div>
      </template>

      <!-- Thanh lưu cố định dưới cùng -->
      <div class="sticky bottom-0 z-20 -mx-1 flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-4">
        <label class="mr-auto flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <a-switch v-model:checked="form.is_published" size="small" />
          {{ form.is_published ? 'Đã xuất bản — học viên nhận được bài này' : 'Bản nháp — học viên chưa thấy' }}
        </label>
        <a-button @click="emit('back')">
          Huỷ
        </a-button>
        <a-button type="primary" :loading="saving" class="!flex !items-center !gap-1" @click="submit">
          <Icon name="tabler:device-floppy" />
          Lưu bài nghe
        </a-button>
      </div>
    </template>

    <PdfExamImport
      v-model:open="pdfImportOpen"
      :existing-question-count="questions.length"
      @imported="applyPdfImport"
    />
  </div>
</template>
