<script setup lang="ts">
import type { Flashcard, FlashcardCardData } from '~/types/flashcard.type'
import type { CardNode } from '~/utils/cardTypewriter'
import { message } from 'ant-design-vue'
import { lookupFlashcardStream, parseFlashcardError } from '~/composables/api/useFlashcardApi'
import { advanceCard, cardBacklog } from '~/utils/cardTypewriter'

/**
 * Modal sinh flashcard bằng AI — trải nghiệm y hệt màn tra từ của học sinh
 * (layout thẻ hiện ngay, giá trị gõ từng ký tự realtime), đóng gói để nơi khác
 * (trang admin) cũng sinh được thẻ. Mở modal với `word` là tự chạy.
 */
const props = defineProps<{
  open: boolean
  word: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  /** Thẻ vừa sinh xong (hoặc lấy từ cache) — cha dùng để refresh danh sách. */
  'done': [card: Flashcard]
}>()

const { speak, speakingText, isSupported: speechSupported, stop: stopSpeaking } = useItalianSpeech()

const loading = ref(false)
const result = ref<Flashcard | null>(null)
const streamCard = ref<Flashcard | null>(null)
const errorMessage = ref('')

// ─── Vòng gõ từng ký tự (cùng cơ chế với trang /flashcards) ──────
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
    if (twDraining)
      twStop()
    return
  }

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

function twDrain(word: string, finalCard: FlashcardCardData): Promise<void> {
  twTargetCard = toStreamCard(word, finalCard)
  twDraining = true
  return new Promise((resolve) => {
    twDrainResolve = resolve
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
    status: 'approved',
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

async function run() {
  const target = props.word.trim().toLowerCase()
  if (!target || loading.value)
    return

  loading.value = true
  result.value = null
  streamCard.value = null
  errorMessage.value = ''
  let generating = false

  try {
    const card = await lookupFlashcardStream(target, {
      onStatus: (stage) => {
        if (stage === 'generating') {
          generating = true
          twStart(target)
        }
      },
      onPartial: (partial) => {
        twTargetCard = toStreamCard(target, partial)
      },
    })
    if (generating)
      await twDrain(target, card)
    result.value = card
    emit('done', card)
    if (generating)
      message.success(`Đã tạo xong flashcard "${target}"`)
  }
  catch (error) {
    errorMessage.value = parseFlashcardError(error).message
  }
  finally {
    twStop()
    streamCard.value = null
    loading.value = false
  }
}

function close() {
  stopSpeaking()
  emit('update:open', false)
}

// Mở modal là chạy luôn; đổi từ khi đang mở cũng chạy lại.
watch(
  () => [props.open, props.word] as const,
  ([open]) => {
    if (open)
      run()
  },
  { immediate: true },
)

onUnmounted(twStop)

const shownCard = computed(() => streamCard.value ?? result.value)
</script>

<template>
  <a-modal
    :open="open"
    :footer="null"
    :width="900"
    destroy-on-close
    @cancel="close"
  >
    <template #title>
      <span>Sinh flashcard bằng AI</span>
      <span class="ml-2 font-serif font-bold text-[#CE2B37]">{{ word }}</span>
    </template>

    <!-- Đang tra từ điển, AI chưa nhả chữ nào -->
    <div v-if="loading && !shownCard" class="flex flex-col items-center gap-3 py-14 text-gray-500">
      <a-spin />
      <p class="text-sm">
        Đang kiểm tra từ điển tiếng Ý…
      </p>
    </div>

    <div v-else-if="errorMessage" class="flex flex-col items-center gap-3 py-12">
      <Icon name="tabler:alert-circle" class="text-4xl text-[#CE2B37]" />
      <p class="text-sm text-gray-700">
        {{ errorMessage }}
      </p>
      <a-button @click="close">
        Đóng
      </a-button>
    </div>

    <FlashcardDetail
      v-else-if="shownCard"
      :flashcard="shownCard"
      :streaming="streamCard !== null"
      :speaking-text="speakingText"
      :speech-supported="speechSupported"
      @speak="speak"
    />
  </a-modal>
</template>
