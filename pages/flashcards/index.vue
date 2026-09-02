<script setup lang="ts">
import type { Flashcard, FlashcardAccess, FlashcardCardData, FlashcardListItem, FlashcardSuggestion } from '~/types/flashcard.type'
import type { CardNode } from '~/utils/cardTypewriter'
import { message } from 'ant-design-vue'
import { isValidItalianWord, lookupFlashcardStream, parseFlashcardError, useFlashcardApi } from '~/composables/api/useFlashcardApi'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'onboarding'],
})

useHead({
  title: 'Flashcard AI — Tra từ tiếng Ý',
  meta: [
    {
      name: 'description',
      content: 'Tra từ tiếng Ý và học bằng flashcard hai mặt do AI soạn: ngữ pháp, ví dụ, mẹo ghi nhớ và phát âm.',
    },
  ],
})

const {
  getAccess,
  requestAccess,
  getFlashcard,
  saveWord,
  unsaveWord,
  getHistory,
  sendFeedback,
} = useFlashcardApi()

const { speak, speakingText, isSupported: speechSupported, stop: stopSpeaking } = useItalianSpeech()

const searchTerm = ref('')
const flashcard = ref<Flashcard | null>(null)
const loading = ref(false)
/** Từ đang được AI soạn, dùng để hiện đúng tên từ trong màn chờ ~15s. */
const loadingWord = ref('')
/**
 * Thẻ AI đang viết dở (đã đắp đủ hình dạng Flashcard để tái dùng FlashcardDetail).
 * Khác null = đang stream, layout thẻ hiện với skeleton và fill dần realtime.
 */
const streamCard = ref<Flashcard | null>(null)

// ─── Vòng gõ từng ký tự ──────────────────────────────────────────
// Snapshot backend là ĐÍCH; UI có nhịp gõ riêng đuổi theo đích từng ký tự
// (tự tăng tốc khi tụt lại) để chữ chạy mượt thay vì nhảy theo cụm.
const TW_TICK_MS = 24
let twTimer: ReturnType<typeof setInterval> | null = null
let twTargetCard: Flashcard | null = null
let twDraining = false
let twDrainResolve: (() => void) | null = null

function twStop() {
  if (twTimer) {
    clearInterval(twTimer)
    twTimer = null
  }
  twTargetCard = null
  twDraining = false
  twDrainResolve?.()
  twDrainResolve = null
}

function twTick() {
  const shown = streamCard.value
  const target = twTargetCard
  if (!shown || !target)
    return

  const lag = cardBacklog(shown as unknown as CardNode, target as unknown as CardNode)
  if (lag === 0) {
    // Đã gõ hết những gì stream gửi tới; nếu đang xả cuối thì kết thúc.
    if (twDraining)
      twStop()
    return
  }

  // Ngân sách ký tự mỗi nhịp: bám sát stream nhưng không vượt 8 ký tự/nhịp
  // để mắt vẫn thấy từng chữ chạy. Lúc xả cuối thì tháo trần cho nhanh gọn.
  const budget = {
    n: twDraining
      ? Math.max(6, Math.ceil(lag / 8))
      : Math.min(8, Math.max(1, Math.ceil(lag / 20))),
  }
  streamCard.value = advanceCard(
    shown as unknown as CardNode,
    target as unknown as CardNode,
    budget,
  ) as unknown as Flashcard
}

function twStart(word: string) {
  twStop()
  streamCard.value = toStreamCard(word)
  twTimer = setInterval(twTick, TW_TICK_MS)
}

function twSetTarget(word: string, partial?: FlashcardCardData) {
  twTargetCard = toStreamCard(word, partial)
}

/** Gõ nốt phần còn thiếu rồi mới trả quyền hiển thị cho thẻ hoàn chỉnh. */
function twDrain(word: string, finalCard: FlashcardCardData): Promise<void> {
  twSetTarget(word, finalCard)
  twDraining = true
  return new Promise((resolve) => {
    twDrainResolve = resolve
    // Chốt an toàn: không để user chờ animation quá 2.5s.
    setTimeout(resolve, 2500)
  })
}

/** Đắp metadata mặc định để dữ liệu dở dang dùng được với FlashcardDetail. */
function toStreamCard(word: string, partial?: FlashcardCardData): Flashcard {
  const emptyFace = (language: string) => ({
    language,
    word: '',
    pronunciation: '',
    part_of_speech: '',
    definition: '',
    examples: [],
    synonyms: [],
  })
  return {
    id: '',
    status: 'pending',
    word,
    front: { ...emptyFace('it'), word, ...(partial?.front ?? {}) },
    back: { ...emptyFace('vi'), ...(partial?.back ?? {}) },
    grammar: partial?.grammar ?? {
      part_of_speech: { it: '', vi: '' },
      gender: { it: '', vi: '' },
      number: { it: '', vi: '' },
      article: { article: '', word, phrase: '' },
      plural: { article: '', form: '', phrase: '' },
    },
    mnemonic: partial?.mnemonic ?? '',
    topics: partial?.topics ?? [],
    suggestions: partial?.suggestions ?? { similar: [], same_topic: [] },
    is_owner: true,
    is_saved: false,
    word_set_ids: [],
    created_at: '',
    updated_at: '',
  } as Flashcard
}
const errorCode = ref<string | null>(null)
const errorMessage = ref('')

const savePending = ref(false)
const showSetModal = ref(false)

const showFeedbackModal = ref(false)
const feedbackContent = ref('')
const feedbackSending = ref(false)

// ─── Quyền dùng tính năng ────────────────────────────────────────
// User chưa có khoá học thì phải được admin duyệt mới dùng được.
// Học viên đã có khoá học được backend tự bật quyền, không phải xin.
const access = ref<FlashcardAccess | null>(null)
const accessLoading = ref(true)
const accessSending = ref(false)
const canUseFlashcard = computed(() => access.value?.can_use === true)

async function loadAccess() {
  accessLoading.value = true
  try {
    access.value = await getAccess()
  }
  catch (error) {
    message.error(parseFlashcardError(error).message)
  }
  finally {
    accessLoading.value = false
  }
}

async function handleRequestAccess(reason: string) {
  accessSending.value = true
  try {
    access.value = await requestAccess(reason)
    message.success('Đã gửi yêu cầu. Bạn sẽ nhận thông báo khi được cấp quyền.')
  }
  catch (error) {
    const { message: text } = parseFlashcardError(error)
    message.error(text)
    // Trạng thái có thể đã đổi ở phía server (vd admin vừa duyệt) — đồng bộ lại.
    await loadAccess()
  }
  finally {
    accessSending.value = false
  }
}

/** Grid "Từ đã tra" — lịch sử tra từ của chính user, mới nhất trước. */
const historyWords = ref<FlashcardListItem[]>([])

const inputError = computed(() => {
  const value = searchTerm.value.trim()
  if (!value)
    return ''
  if (value.includes(' '))
    return 'Chỉ nhập 1 từ mỗi lần, không có khoảng trắng.'
  if (!isValidItalianWord(value))
    return 'Chỉ được nhập chữ cái tiếng Ý, dấu nháy đơn và gạch nối.'
  return ''
})

function resetResult() {
  flashcard.value = null
  streamCard.value = null
  errorCode.value = null
  errorMessage.value = ''
  stopSpeaking()
}

async function loadHistory() {
  try {
    const response = await getHistory({ limit: 24 })
    historyWords.value = response.results
  }
  catch {
    // Danh sách phụ, lỗi ở đây không nên chặn màn tra từ.
    historyWords.value = []
  }
}

async function handleLookup(word?: string) {
  const target = (word ?? searchTerm.value).trim().toLowerCase()
  if (!target || inputError.value || loading.value)
    return

  searchTerm.value = target
  resetResult()
  loading.value = true
  loadingWord.value = target

  // key cố định để toast "đang xử lý" bị thay thế bằng toast kết quả, không chồng nhau.
  const toastKey = `fc-stream-${target}`
  let generating = false

  try {
    const result = await lookupFlashcardStream(target, {
      // Từ điển xác nhận xong, AI bắt đầu sinh -> dựng layout thẻ + vòng gõ.
      onStatus: (stage) => {
        if (stage === 'generating') {
          generating = true
          twStart(target)
          message.loading({ content: `Đang xử lý flashcard "${target}"…`, key: toastKey, duration: 0 })
        }
      },
      // Snapshot chỉ cập nhật ĐÍCH; vòng gõ tự đuổi theo từng ký tự.
      onPartial: (card) => {
        twSetTarget(target, card)
      },
    })
    // Gõ nốt phần đuôi rồi mới hiện thẻ hoàn chỉnh, không cắt ngang animation.
    if (generating)
      await twDrain(target, result)
    flashcard.value = result
    // Chỉ báo thành công khi có sinh thật; từ lấy từ cache thì im lặng cho đỡ ồn.
    if (generating)
      message.success({ content: `Đã tạo xong flashcard "${target}"`, key: toastKey, duration: 2.5 })
    // Từ vừa tra nhảy lên đầu grid "Từ đã tra".
    loadHistory()
  }
  catch (error) {
    // Dẹp toast "đang xử lý" nếu lỗi giữa chừng; màn lỗi bên dưới sẽ nói rõ.
    if (generating)
      message.destroy(toastKey)

    const parsed = parseFlashcardError(error)
    errorCode.value = parsed.errorCode
    errorMessage.value = parsed.message

    // Quyền có thể mất giữa chừng (ghi danh hết hạn, admin thu hồi).
    // Nạp lại trạng thái để chuyển về màn xin quyền thay vì báo lỗi khó hiểu.
    if (parsed.errorCode === 'FLASHCARD_ACCESS_DENIED')
      await loadAccess()
  }
  finally {
    twStop()
    streamCard.value = null
    loading.value = false
    loadingWord.value = ''
  }
}

/**
 * `flashcard_id` khác null nghĩa là từ đã có sẵn, mở tức thì.
 * Null thì phải chạy lookup và chờ AI ~15s.
 */
async function handleSuggestionClick(suggestion: FlashcardSuggestion) {
  if (!suggestion.flashcard_id) {
    await handleLookup(suggestion.word)
    return
  }

  resetResult()
  loading.value = true
  loadingWord.value = suggestion.word
  searchTerm.value = suggestion.word

  try {
    flashcard.value = await getFlashcard(suggestion.flashcard_id)
  }
  catch (error) {
    const parsed = parseFlashcardError(error)
    errorCode.value = parsed.errorCode
    errorMessage.value = parsed.message

    // Quyền có thể mất giữa chừng (ghi danh hết hạn, admin thu hồi).
    // Nạp lại trạng thái để chuyển về màn xin quyền thay vì báo lỗi khó hiểu.
    if (parsed.errorCode === 'FLASHCARD_ACCESS_DENIED')
      await loadAccess()
  }
  finally {
    loading.value = false
    loadingWord.value = ''
  }
}

async function openHistoryWord(item: FlashcardListItem) {
  await handleSuggestionClick({
    word: item.word,
    relation: 'similar',
    meaning_vi: item.meaning,
    flashcard_id: item.id,
  })
}

async function handleToggleSave() {
  const current = flashcard.value
  if (!current || savePending.value)
    return

  savePending.value = true
  const wasSaved = current.is_saved
  try {
    const result = wasSaved
      ? await unsaveWord(current.id)
      : await saveWord(current.id)
    current.is_saved = result.is_saved
    message.success(result.is_saved ? 'Đã lưu từ' : 'Đã bỏ lưu từ')
    loadHistory()
  }
  catch (error) {
    message.error(parseFlashcardError(error).message)
  }
  finally {
    savePending.value = false
  }
}

function handleWordSetChanged(wordSetIds: string[]) {
  if (flashcard.value)
    flashcard.value.word_set_ids = wordSetIds
}

async function handleSendFeedback() {
  const current = flashcard.value
  const content = feedbackContent.value.trim()
  if (!current || !content) {
    message.warning('Mô tả nội dung sai để giáo viên sửa giúp bạn')
    return
  }

  feedbackSending.value = true
  try {
    await sendFeedback(current.id, content)
    message.success('Đã gửi báo lỗi, cảm ơn bạn')
    feedbackContent.value = ''
    showFeedbackModal.value = false
  }
  catch (error) {
    message.error(parseFlashcardError(error).message)
  }
  finally {
    feedbackSending.value = false
  }
}

onMounted(async () => {
  await loadAccess()
  // Không có quyền thì mọi endpoint khác đều 403, đừng gọi cho tốn request.
  if (canUseFlashcard.value)
    await loadHistory()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="mx-auto max-w-6xl px-4">
      <!-- Chưa có quyền dùng: hiện màn xin quyền, không hiện ô tra từ -->
      <div v-if="accessLoading" class="flex justify-center py-20">
        <Icon name="tabler:loader-2" class="animate-spin text-3xl text-[#1B8A3C]" />
      </div>

      <FlashcardPermissionGate
        v-else-if="!canUseFlashcard && access"
        :access="access"
        :sending="accessSending"
        @request="handleRequestAccess"
      />

      <template v-else>
        <!-- Ô tra từ -->
        <header class="mb-6 text-center">
          <h1 class="text-2xl font-bold text-gray-900 sm:text-3xl">
            Flashcard AI
          </h1>
          <p class="mt-1.5 text-sm text-gray-500">
            Nhập một từ tiếng Ý, AI soạn thẻ hai mặt kèm ngữ pháp, ví dụ và mẹo ghi nhớ.
          </p>
        </header>

        <div class="mx-auto mb-6 max-w-2xl">
          <div class="flex gap-2">
            <div class="relative flex-1">
              <Icon
                name="tabler:search"
                class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-400"
              />
              <input
                v-model="searchTerm"
                type="text"
                placeholder="Ví dụ: casa, libro, mangiare…"
                autocapitalize="off"
                autocomplete="off"
                spellcheck="false"
                class="w-full rounded-full border border-gray-200 bg-white py-3 pl-11 pr-4 text-base text-gray-900 shadow-sm outline-none transition-colors placeholder:text-gray-400 focus:border-green-400"
                :class="inputError ? 'border-red-300 focus:border-red-400' : ''"
                @keyup.enter="handleLookup()"
              >
            </div>
            <button
              type="button"
              :disabled="loading || !searchTerm.trim() || Boolean(inputError)"
              class="flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200"
              :class="loading || !searchTerm.trim() || inputError
                ? 'cursor-not-allowed bg-gray-300'
                : 'cursor-pointer bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 hover:shadow-md'"
              @click="handleLookup()"
            >
              <Icon :name="loading ? 'tabler:loader-2' : 'tabler:sparkles'" :class="loading ? 'animate-spin' : ''" />
              Tra từ
            </button>
          </div>
          <p v-if="inputError" class="mt-2 pl-4 text-xs text-red-500">
            {{ inputError }}
          </p>
        </div>

        <!-- AI đang sinh: hiện layout thẻ hoàn chỉnh, giá trị fill realtime -->
        <div v-if="streamCard" class="space-y-3">
          <p class="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Icon name="tabler:sparkles" class="animate-pulse text-base text-[#1B8A3C]" />
            AI đang soạn thẻ cho từ "{{ loadingWord }}"…
          </p>
          <FlashcardDetail
            :flashcard="streamCard"
            :streaming="true"
            :speech-supported="speechSupported"
            @speak="speak"
          />
        </div>

        <!-- Chờ bước đầu (tra DB + từ điển, chưa tới lượt AI) -->
        <div v-else-if="loading" class="rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
            <Icon name="tabler:sparkles" class="animate-pulse text-2xl text-green-600" />
          </div>
          <p class="mt-4 font-medium text-gray-900">
            AI đang soạn thẻ cho từ "{{ loadingWord }}"…
          </p>
          <p class="mt-1 text-sm text-gray-500">
            Từ mới mất khoảng 15 giây. Lần sau tra lại sẽ hiện ngay lập tức.
          </p>
          <div class="mt-6 space-y-3">
            <a-skeleton active :paragraph="{ rows: 4 }" />
          </div>
        </div>

        <!-- Lỗi -->
        <div
          v-else-if="errorMessage"
          class="rounded-3xl border bg-white p-8 text-center shadow-sm"
          :class="errorCode === 'FLASHCARD_UNDER_REVIEW' ? 'border-amber-200' : 'border-red-100'"
        >
          <div
            class="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
            :class="errorCode === 'FLASHCARD_UNDER_REVIEW' ? 'bg-amber-50' : 'bg-red-50'"
          >
            <Icon
              :name="errorCode === 'FLASHCARD_UNDER_REVIEW' ? 'tabler:clock-hour-4' : 'tabler:alert-circle'"
              class="text-2xl"
              :class="errorCode === 'FLASHCARD_UNDER_REVIEW' ? 'text-amber-500' : 'text-red-500'"
            />
          </div>
          <!-- `message` từ backend đã là tiếng Việt sẵn sàng hiển thị -->
          <p class="mt-4 font-medium text-gray-900">
            {{ errorMessage }}
          </p>
          <p v-if="errorCode === 'FLASHCARD_UNDER_REVIEW'" class="mt-1 text-sm text-gray-500">
            Thẻ này đang chờ giáo viên kiểm duyệt, bạn quay lại sau nhé.
          </p>
          <!-- FLASHCARD_WORD_NOT_FOUND: không gợi ý từ gần đúng, đây là yêu cầu nghiệp vụ -->
          <button
            v-if="errorCode === 'FLASHCARD_DICTIONARY_UNAVAILABLE' || errorCode === 'FLASHCARD_AI_UNAVAILABLE'"
            type="button"
            class="mt-5 cursor-pointer rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-green-300 hover:text-green-700"
            @click="handleLookup()"
          >
            Thử lại
          </button>
        </div>

        <!-- Kết quả -->
        <template v-else-if="flashcard">
          <!-- Thẻ tự lật hai mặt nên không còn chế độ luyện tập riêng. -->
          <FlashcardDetail
            :flashcard="flashcard"
            :save-pending="savePending"
            :speaking-text="speakingText"
            :speech-supported="speechSupported"
            @speak="speak"
            @toggle-save="handleToggleSave"
            @add-to-set="showSetModal = true"
            @feedback="showFeedbackModal = true"
            @lookup-word="handleSuggestionClick"
          />
        </template>

        <!-- Trạng thái ban đầu -->
        <div v-else class="rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center">
          <Icon name="tabler:cards" class="text-4xl text-gray-300" />
          <p class="mt-3 text-sm text-gray-500">
            Nhập một từ tiếng Ý để bắt đầu.
          </p>
        </div>

        <!-- Grid các từ user đã tra -->
        <section v-if="historyWords.length" class="mt-8">
          <div class="mb-3 flex items-center gap-2">
            <Icon name="tabler:history" class="text-base text-[#1B8A3C]" />
            <h2 class="text-sm font-semibold text-gray-900">
              Từ đã tra
            </h2>
          </div>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <button
              v-for="item in historyWords"
              :key="item.id"
              type="button"
              class="group cursor-pointer rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#1B8A3C] hover:shadow-md"
              @click="openHistoryWord(item)"
            >
              <p class="truncate text-lg font-bold text-[#CE2B37]">
                {{ item.word }}
              </p>
              <p class="truncate text-sm text-gray-700">
                {{ item.meaning }}
              </p>
              <p v-if="item.pronunciation" class="mt-0.5 truncate text-xs text-gray-400">
                [{{ item.pronunciation.replace(/^\/|\/$/g, '') }}]
              </p>
            </button>
          </div>
        </section>
      </template>
    </div>

    <!-- Popup thêm vào bộ từ -->
    <FlashcardAddToWordSetModal
      v-if="flashcard"
      v-model:open="showSetModal"
      :flashcard-id="flashcard.id"
      :word="flashcard.word"
      :word-set-ids="flashcard.word_set_ids"
      @changed="handleWordSetChanged"
    />

    <!-- Báo nội dung sai -->
    <a-modal v-model:open="showFeedbackModal" title="Báo nội dung sai" :footer="null" :width="440">
      <div class="mt-2 space-y-3">
        <p class="text-sm text-gray-500">
          Mô tả chỗ sai để giáo viên kiểm tra và sửa lại thẻ.
        </p>
        <a-textarea
          v-model:value="feedbackContent"
          :rows="4"
          :maxlength="500"
          show-count
          placeholder="Ví dụ: Phiên âm sai, phải là /ˈka.sa/"
        />
        <div class="flex justify-end gap-2">
          <a-button @click="showFeedbackModal = false">
            Huỷ
          </a-button>
          <a-button type="primary" :loading="feedbackSending" @click="handleSendFeedback">
            Gửi
          </a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>
