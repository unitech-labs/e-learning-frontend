<script setup lang="ts">
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { PdfImportPayload, QuizImportProgress } from '~/composables/api/useQuizImportApi'
import { message } from 'ant-design-vue'
import { parseExerciseError } from '~/composables/api/useAIExerciseApi'
import { QUIZ_IMPORT_MAX_PAGES, useQuizImportApi } from '~/composables/api/useQuizImportApi'
import { useQuizMediaUpload } from '~/composables/useQuizMediaUpload'
import { canvasToJpeg, extractPdfPageText, openPdf, renderPdfPage } from '~/utils/pdfPages'

/**
 * Nhập đề nghe từ PDF: giáo viên chọn file, chọn trang phần nghe (kèm trang đáp
 * án nếu có), dán đáp án (nếu có). Trang được chuyển thành ảnh ngay trên trình
 * duyệt và tải lên để AI đọc ra câu hỏi tương tác. Học viên làm bài trên các câu
 * hỏi đó, không xem file PDF.
 */
const props = defineProps<{
  open: boolean
  existingQuestionCount: number
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'imported': [payload: PdfImportPayload]
}>()

/** Ảnh trang gửi AI: đủ nét để đọc chữ nhỏ trong đề. */
const PAGE_IMAGE_WIDTH = 1500
const THUMB_WIDTH = 220

const { createImport, followImport } = useQuizImportApi()
const { uploadImage } = useQuizMediaUpload()

type Stage = 'pick' | 'pages' | 'working'

const stage = ref<Stage>('pick')
const fileName = ref('')
const loadingPdf = ref(false)
const thumbs = ref<string[]>([])
const pageTexts = ref<string[]>([])
const selected = ref<number[]>([])
const answerKey = ref('')
const mode = ref<'replace' | 'append'>('replace')

const elapsed = ref(0)
const errorText = ref('')

// ─── Tiến độ trực tiếp ─────────────────────────────────────────
// upload: trình duyệt chuyển trang thành ảnh + tải lên; ai: job ở server (progress từ API).
const phase = ref<'upload' | 'ai'>('upload')
const sentPages = ref<number[]>([])
const uploadDone = ref(0)
const live = ref<QuizImportProgress | null>(null)
const feedEl = ref<HTMLElement | null>(null)

const liveQuestions = computed(() => live.value?.preview?.questions ?? [])
const answeredCount = computed(() => liveQuestions.value.filter(question => question.has_answer).length)
// Trang AI đang viết câu hỏi (câu cuối cùng) — sáng lên trong dãy trang.
const activePage = computed(() => liveQuestions.value.at(-1)?.page ?? null)
const countsByPage = computed(() => {
  const counts = new Map<number, number>()
  for (const question of liveQuestions.value) {
    if (question.page)
      counts.set(question.page, (counts.get(question.page) ?? 0) + 1)
  }
  return counts
})
// Số câu trong phần (đề CILS đánh số lại từ 1 ở mỗi Prova) để khớp với đề.
const feedItems = computed(() => {
  let counter = 0
  return liveQuestions.value.map((question, index) => {
    const startsSection = index === 0 || question.section !== liveQuestions.value[index - 1]!.section
    counter = startsSection ? 1 : counter + 1
    return { ...question, n: counter, startsSection, key: `${index}` }
  })
})

const steps = computed(() => {
  const stage = live.value?.stage
  const current = phase.value === 'upload' ? 0 : stage === 'queued' ? 1 : stage === 'writing' ? 3 : 2
  const total = sentPages.value.length
  const details = [
    current === 0 ? `${uploadDone.value}/${total} trang` : `${total} trang`,
    stage === 'queued' ? 'Đang chờ tới lượt…' : '',
    stage === 'preparing'
      ? `Mở trang ${Math.min((live.value?.pages_done ?? 0) + 1, total)}/${total}`
      : stage === 'reading' ? (live.value?.text_only ? 'Đọc lại từ chữ trong PDF…' : 'Đang xem các trang đề…') : '',
    current === 3 ? `${liveQuestions.value.length} câu` : '',
  ]
  return ['Chuẩn bị trang', 'Gửi cho AI', 'AI đọc đề', 'AI viết câu hỏi'].map((label, index) => ({
    label,
    detail: details[index],
    state: index < current ? 'done' : index === current ? 'active' : 'todo',
  }))
})

// Câu mới hiện ra thì cuộn xuống cuối danh sách.
watch(() => liveQuestions.value.length, () => nextTick(() => {
  if (feedEl.value)
    feedEl.value.scrollTop = feedEl.value.scrollHeight
}))

let pdfDoc: PDFDocumentProxy | null = null
let abort: AbortController | null = null
let timer: ReturnType<typeof setInterval> | null = null
// Ảnh đã tải lên của lần thử trước — bấm "Thử lại" không phải tải lại.
let uploaded: { key: string, urls: string[] } | null = null

const thumbsReady = computed(() => thumbs.value.every(Boolean))
// Chỉ kết luận "PDF scan" khi đã đọc xong chữ của mọi trang.
const hasText = computed(() => !thumbsReady.value || pageTexts.value.some(text => text.length > 30))
const tooManyPages = computed(() => selected.value.length > QUIZ_IMPORT_MAX_PAGES)
const canStart = computed(() => stage.value === 'pages' && selected.value.length > 0 && !tooManyPages.value && thumbsReady.value)

function reset() {
  abort?.abort()
  stopTimer()
  pdfDoc?.destroy()
  pdfDoc = null
  uploaded = null
  stage.value = 'pick'
  fileName.value = ''
  thumbs.value = []
  pageTexts.value = []
  selected.value = []
  answerKey.value = ''
  mode.value = 'replace'
  errorText.value = ''
}

function close() {
  if (stage.value === 'working' && !errorText.value)
    abort?.abort()
  emit('update:open', false)
}

watch(() => props.open, (open) => {
  if (!open)
    reset()
})

onBeforeUnmount(reset)

async function handleFile(file: File) {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    message.error('Chỉ hỗ trợ file PDF')
    return false
  }
  reset()
  loadingPdf.value = true
  fileName.value = file.name
  let doc: PDFDocumentProxy | null = null
  try {
    doc = await openPdf(file)
    pdfDoc = doc
    const pageCount = doc.numPages
    thumbs.value = Array.from({ length: pageCount }, () => '')
    pageTexts.value = Array.from({ length: pageCount }, () => '')
    // Đề ngắn: chọn hết. Đề dài (sách luyện thi, đề đủ các phần): giáo viên tự chọn trang phần nghe.
    selected.value = pageCount <= QUIZ_IMPORT_MAX_PAGES ? Array.from({ length: pageCount }, (_, i) => i + 1) : []
    stage.value = 'pages'
    loadingPdf.value = false

    // Ảnh thu nhỏ hiện dần — PDF dài không phải chờ vẽ xong mọi trang mới chọn được.
    for (let page = 1; page <= pageCount; page++) {
      if (pdfDoc !== doc)
        return false
      pageTexts.value[page - 1] = await extractPdfPageText(doc, page)
      thumbs.value[page - 1] = (await renderPdfPage(doc, page, THUMB_WIDTH)).toDataURL('image/jpeg', 0.7)
    }
  }
  catch (error) {
    // Giáo viên đã đổi file / đóng hộp thoại giữa chừng — không phải lỗi.
    if (doc && pdfDoc !== doc)
      return false
    console.error('Không đọc được PDF:', error)
    message.error('Không đọc được file PDF này. File có thể bị hỏng hoặc có mật khẩu.')
    reset()
  }
  finally {
    loadingPdf.value = false
  }
  return false
}

function togglePage(page: number) {
  const index = selected.value.indexOf(page)
  if (index >= 0)
    selected.value.splice(index, 1)
  else
    selected.value.push(page)
}

function startTimer() {
  elapsed.value = 0
  stopTimer()
  timer = setInterval(() => elapsed.value++, 1000)
}

function stopTimer() {
  if (timer)
    clearInterval(timer)
  timer = null
}

async function uploadPages(pages: number[]): Promise<string[]> {
  const key = `${fileName.value}:${pages.join(',')}`
  if (uploaded?.key === key)
    return uploaded.urls

  const urls: string[] = []
  for (const [index, page] of pages.entries()) {
    uploadDone.value = index
    const canvas = await renderPdfPage(pdfDoc!, page, PAGE_IMAGE_WIDTH)
    const blob = await canvasToJpeg(canvas)
    const base = fileName.value.replace(/\.pdf$/i, '').replace(/[^\w-]+/g, '_').slice(0, 40) || 'de'
    urls.push(await uploadImage(new File([blob], `${base}-trang-${page}.jpg`, { type: 'image/jpeg' })))
  }
  uploadDone.value = pages.length
  uploaded = { key, urls }
  return urls
}

async function start() {
  if (!canStart.value && !errorText.value)
    return
  const pages = [...selected.value].sort((a, b) => a - b)
  stage.value = 'working'
  errorText.value = ''
  sentPages.value = pages
  phase.value = 'upload'
  uploadDone.value = 0
  live.value = null
  abort = new AbortController()
  startTimer()
  try {
    const imageUrls = await uploadPages(pages)

    phase.value = 'ai'
    live.value = { stage: 'queued' }
    const job = await createImport({
      image_urls: imageUrls,
      page_texts: pages.map(page => pageTexts.value[page - 1] ?? ''),
      answer_key: answerKey.value.trim(),
    })
    const finished = await followImport(job.id, {
      signal: abort.signal,
      onUpdate: (update) => {
        if (update.progress)
          live.value = update.progress
      },
    })
    if (finished.status === 'failed' || !finished.result) {
      errorText.value = finished.error?.message || 'AI chưa đọc được đề. Vui lòng thử lại.'
      return
    }
    emit('imported', {
      pages: imageUrls.map((url, index) => ({ url, page: pages[index]! })),
      result: finished.result,
      mode: mode.value,
    })
    emit('update:open', false)
  }
  catch (error) {
    if ((error as Error)?.name === 'AbortError')
      return
    console.error('Nhập đề thất bại:', error)
    errorText.value = parseExerciseError(error).message
  }
  finally {
    stopTimer()
  }
}

function backToPages() {
  errorText.value = ''
  stage.value = 'pages'
}
</script>

<template>
  <a-modal
    :open="open"
    title="Tạo câu hỏi từ đề PDF"
    width="880px"
    :mask-closable="stage !== 'working'"
    :footer="null"
    destroy-on-close
    @cancel="close"
  >
    <!-- Bước 1: chọn file -->
    <div v-if="stage === 'pick'" class="space-y-4">
      <p class="text-sm text-gray-600">
        Tải lên file PDF đề nghe (CILS, CELI, PLIDA hoặc đề tự soạn). AI đọc đề và tạo câu hỏi tương tác; học viên
        nghe audio và làm bài trên các câu hỏi này, không xem file PDF. Bạn chỉ cần kiểm tra lại và chọn đáp án.
      </p>
      <a-upload-dragger
        accept=".pdf,application/pdf"
        :show-upload-list="false"
        :before-upload="handleFile"
        :disabled="loadingPdf"
      >
        <div class="py-6">
          <a-spin v-if="loadingPdf" />
          <Icon v-else name="tabler:file-type-pdf" class="text-5xl text-red-500" />
          <p class="mt-3 font-medium text-gray-800">
            {{ loadingPdf ? `Đang mở ${fileName}…` : 'Kéo thả hoặc bấm để chọn file PDF' }}
          </p>
          <p class="text-xs text-gray-500">
            Đề nhiều phần thi thì ở bước sau chọn các trang của phần nghe (tối đa {{ QUIZ_IMPORT_MAX_PAGES }} trang).
          </p>
        </div>
      </a-upload-dragger>
    </div>

    <!-- Bước 2: chọn trang + đáp án -->
    <div v-else-if="stage === 'pages'" class="space-y-4">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-gray-700">
          <Icon name="tabler:file-type-pdf" class="align-[-2px] text-red-500" />
          <span class="font-medium">{{ fileName }}</span> · {{ thumbs.length }} trang ·
          <span :class="tooManyPages ? 'font-semibold text-red-600' : ''">đã chọn {{ selected.length }}/{{ QUIZ_IMPORT_MAX_PAGES }}</span>
        </p>
        <div class="flex gap-2">
          <a-button size="small" @click="selected = thumbs.map((_, i) => i + 1).slice(0, QUIZ_IMPORT_MAX_PAGES)">
            Chọn {{ thumbs.length > QUIZ_IMPORT_MAX_PAGES ? `${QUIZ_IMPORT_MAX_PAGES} trang đầu` : 'tất cả' }}
          </a-button>
          <a-button size="small" @click="selected = []">
            Bỏ chọn
          </a-button>
          <a-button size="small" @click="reset">
            Đổi file
          </a-button>
        </div>
      </div>

      <a-alert v-if="tooManyPages" type="error" show-icon :message="`Mỗi lần chỉ đọc được tối đa ${QUIZ_IMPORT_MAX_PAGES} trang.`" />
      <a-alert
        v-else
        type="info"
        show-icon
        message="Chọn các trang đề của phần nghe, và cả trang đáp án (Chiavi, Soluzioni) nếu có để AI điền sẵn đáp án. Bỏ trang bìa, trascrizione và các phần thi khác."
      />

      <div class="grid max-h-[46vh] grid-cols-3 gap-3 overflow-y-auto rounded-lg bg-gray-50 p-3 sm:grid-cols-4 md:grid-cols-5">
        <button
          v-for="(src, index) in thumbs"
          :key="index"
          type="button"
          class="relative cursor-pointer overflow-hidden rounded-md border-2 bg-white text-left transition"
          :class="selected.includes(index + 1) ? 'border-green-500 ring-2 ring-green-200' : 'border-transparent opacity-60 hover:opacity-100'"
          @click="togglePage(index + 1)"
        >
          <img v-if="src" :src="src" :alt="`Trang ${index + 1}`" class="block w-full">
          <div v-else class="flex aspect-[1/1.414] w-full items-center justify-center bg-gray-100">
            <a-spin size="small" />
          </div>
          <span
            class="absolute left-1 top-1 rounded px-1.5 text-xs font-semibold"
            :class="selected.includes(index + 1) ? 'bg-green-600 text-white' : 'bg-gray-700/70 text-white'"
          >
            {{ index + 1 }}
          </span>
          <Icon v-if="selected.includes(index + 1)" name="tabler:circle-check-filled" class="absolute right-1 top-1 text-xl text-green-600" />
        </button>
      </div>

      <a-alert
        v-if="!hasText"
        type="warning"
        show-icon
        message="PDF này có vẻ là bản scan (không có chữ). AI vẫn đọc từ ảnh, nhưng hãy kiểm tra kỹ chính tả sau khi tạo."
      />

      <div>
        <label class="mb-1 block text-sm font-medium text-gray-800">Đáp án (không bắt buộc)</label>
        <a-textarea
          v-model:value="answerKey"
          :rows="4"
          :maxlength="6000"
          placeholder="Dán đáp án nếu file PDF không có trang đáp án, ví dụ:&#10;Prova n. 1: 1. B  2. D  3. A …&#10;Prova n. 2: FVFVVF&#10;Prova n. 3: 1. oggi  2. parlare …"
        />
        <p class="mt-1 text-xs text-gray-500">
          AI không nghe được audio nên sẽ không tự đoán đáp án. Không có đáp án thì bạn chọn đáp án cho từng câu sau khi tạo.
        </p>
      </div>

      <a-radio-group v-if="existingQuestionCount" v-model:value="mode" class="!flex !flex-col !gap-1">
        <a-radio value="replace">
          Thay thế {{ existingQuestionCount }} câu hỏi hiện có
        </a-radio>
        <a-radio value="append">
          Giữ câu hỏi hiện có, thêm câu mới vào sau
        </a-radio>
      </a-radio-group>

      <div class="flex justify-end gap-2 border-t border-gray-100 pt-3">
        <a-button @click="close">
          Huỷ
        </a-button>
        <a-button type="primary" :disabled="!canStart" class="!flex !items-center !gap-1" @click="start">
          <Icon name="tabler:sparkles" />
          {{ thumbsReady ? `Tạo câu hỏi từ ${selected.length} trang` : 'Đang đọc các trang…' }}
        </a-button>
      </div>
    </div>

    <!-- Bước 3: AI đang đọc — tiến độ trực tiếp -->
    <div v-else class="space-y-4">
      <template v-if="!errorText">
        <!-- Các bước -->
        <ol class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <li
            v-for="(step, index) in steps"
            :key="step.label"
            class="flex items-start gap-2 rounded-lg border px-2.5 py-2 transition"
            :class="{
              'border-green-200 bg-green-50': step.state === 'done',
              'border-green-500 bg-white shadow-sm': step.state === 'active',
              'border-gray-200 bg-gray-50 opacity-60': step.state === 'todo',
            }"
          >
            <span
              class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
              :class="step.state === 'done' ? 'bg-green-600 text-white' : step.state === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'"
            >
              <Icon v-if="step.state === 'done'" name="tabler:check" />
              <span v-else-if="step.state === 'active'" class="h-2 w-2 animate-ping rounded-full bg-green-500" />
              <template v-else>{{ index + 1 }}</template>
            </span>
            <span class="min-w-0">
              <span class="block text-sm font-medium text-gray-900">{{ step.label }}</span>
              <span v-if="step.detail" class="block truncate text-xs text-gray-500">{{ step.detail }}</span>
            </span>
          </li>
        </ol>

        <div class="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,5fr)]">
          <!-- Các trang đã gửi: quét khi AI đang đọc, sáng trang AI đang viết -->
          <div class="grid max-h-[44vh] grid-cols-4 content-start gap-2 overflow-y-auto md:grid-cols-2">
            <div
              v-for="(page, index) in sentPages"
              :key="page"
              class="relative overflow-hidden rounded-md border-2 bg-white transition"
              :class="[
                activePage === index + 1 ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200',
                (live?.stage === 'reading' || live?.stage === 'preparing' || activePage === index + 1) ? 'scan' : '',
                phase === 'upload' && index >= uploadDone ? 'opacity-40' : '',
              ]"
            >
              <img :src="thumbs[page - 1]" :alt="`Trang ${page}`" class="block w-full">
              <span class="absolute left-1 top-1 rounded bg-gray-800/70 px-1 text-[11px] font-semibold text-white">{{ page }}</span>
              <span
                v-if="countsByPage.get(index + 1)"
                class="absolute bottom-1 right-1 rounded-full bg-green-600 px-1.5 text-[11px] font-semibold text-white"
              >
                {{ countsByPage.get(index + 1) }} câu
              </span>
            </div>
          </div>

          <!-- Câu hỏi AI đang viết -->
          <div class="flex min-h-[200px] flex-col rounded-lg border border-gray-200 bg-gray-50">
            <div class="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-2">
              <p class="min-w-0 truncate text-sm font-semibold text-gray-900">
                <template v-if="live?.preview?.title">
                  {{ live.preview.title }}
                </template>
                <template v-else>
                  Câu hỏi AI đang tạo
                </template>
              </p>
              <span v-if="liveQuestions.length" class="shrink-0 text-xs text-gray-500">
                {{ liveQuestions.length }} câu · {{ answeredCount }} có đáp án
              </span>
            </div>
            <div ref="feedEl" class="max-h-[44vh] flex-1 overflow-y-auto px-3 py-2">
              <div v-if="!liveQuestions.length" class="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 text-center text-sm text-gray-500">
                <a-spin />
                <span v-if="phase === 'upload'">Đang chuẩn bị các trang đề…</span>
                <span v-else-if="live?.stage === 'queued'">Đang chờ tới lượt AI…</span>
                <span v-else>AI đang đọc đề — câu hỏi sẽ hiện ra ở đây ngay khi AI viết.</span>
              </div>
              <TransitionGroup v-else name="feed" tag="ul" class="space-y-1">
                <li v-for="(item, index) in feedItems" :key="item.key">
                  <p v-if="item.startsSection && item.section" class="truncate pb-0.5 pt-2 text-xs font-semibold text-gray-500">
                    {{ item.section }}
                  </p>
                  <div class="flex items-start gap-2 rounded-md bg-white px-2 py-1.5 text-sm shadow-sm">
                    <span class="mt-0.5 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 px-1 text-[11px] font-semibold text-gray-600">
                      {{ item.n }}
                    </span>
                    <span class="min-w-0 flex-1 text-gray-800">
                      {{ item.prompt }}<span v-if="index === feedItems.length - 1" class="caret">▍</span>
                    </span>
                    <span class="shrink-0 rounded px-1.5 py-0.5 text-[11px]" :class="item.kind === 'fill' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'">
                      {{ item.kind === 'fill' ? 'Điền từ' : 'Trắc nghiệm' }}
                    </span>
                    <Icon
                      :name="item.has_answer ? 'tabler:circle-check-filled' : 'tabler:circle-dashed'"
                      class="mt-0.5 shrink-0"
                      :class="item.has_answer ? 'text-green-600' : 'text-gray-300'"
                      :title="item.has_answer ? 'Đã có đáp án' : 'Chưa có đáp án'"
                    />
                  </div>
                </li>
              </TransitionGroup>
            </div>
          </div>
        </div>

        <p class="text-xs text-gray-500">
          {{ elapsed }} giây · thường mất 30–120 giây tuỳ số trang. Đừng đóng hộp thoại trong lúc này.
        </p>
      </template>
      <template v-else>
        <a-alert type="error" show-icon :message="errorText" />
        <div class="flex justify-end gap-2">
          <a-button @click="backToPages">
            Chọn lại trang
          </a-button>
          <a-button type="primary" @click="start">
            Thử lại
          </a-button>
        </div>
      </template>
    </div>
  </a-modal>
</template>

<style scoped>
/* Vệt quét trên trang đề khi AI đang đọc */
.scan::after {
  content: '';
  position: absolute;
  inset-inline: 0;
  top: -35%;
  height: 35%;
  background: linear-gradient(to bottom, transparent, rgb(34 197 94 / 0.28), transparent);
  animation: scan 1.8s linear infinite;
  pointer-events: none;
}

@keyframes scan {
  to {
    top: 100%;
  }
}

/* Câu mới hiện ra nhẹ nhàng */
.feed-enter-active {
  transition: all 0.35s ease;
}

.feed-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.caret {
  margin-left: 1px;
  color: rgb(22 163 74);
  animation: blink 1s steps(2, start) infinite;
}

@keyframes blink {
  to {
    visibility: hidden;
  }
}

@media (prefers-reduced-motion: reduce) {
  .scan::after,
  .caret {
    animation: none;
  }
}
</style>
