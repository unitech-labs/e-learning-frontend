<script setup lang="ts">
import type { Flashcard } from '~/types/flashcard.type'
import { getTopicIcon } from '~/utils/flashcardTopicIcon'

interface Props {
  flashcard: Flashcard
  /** 'it' = mặt tiếng Ý (như design), 'vi' = mặt tiếng Việt (nội dung tương ứng). */
  side: 'it' | 'vi'
  savePending?: boolean
  speakingText?: string
  speechDisabled?: boolean
  /** AI đang sinh: giá trị trống hiển thị skeleton, ẩn nút cần flashcard.id. */
  streaming?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  speak: [text: string]
  toggleSave: []
  addToSet: []
  feedback: []
}>()

const isItalian = computed(() => props.side === 'it')

/**
 * Nút LƯU TỪ / THÊM VÀO BỘ TỪ đang ẨN theo yêu cầu (2026-08-22).
 * API và modal phía sau vẫn nguyên — muốn hiện lại chỉ cần đổi thành true.
 */
const SHOW_CARD_ACTIONS = false

const topicIcon = computed(() => getTopicIcon(props.flashcard.topics))

/** Từ lớn màu đỏ: mặt Ý là từ tiếng Ý, mặt Việt là nghĩa tiếng Việt. */
const headWord = computed(() =>
  isItalian.value ? props.flashcard.front.word : props.flashcard.back.word,
)

/**
 * Mỗi mặt thuần một ngôn ngữ: mặt Ý KHÔNG lộ nghĩa tiếng Việt (muốn biết thì
 * lật thẻ). Mặt Việt thêm dòng TIẾNG Ý để biết thẻ này của từ nào.
 */
const meaningRow = computed(() => {
  if (isItalian.value)
    return null
  return { label: 'TIẾNG Ý', value: props.flashcard.front.word }
})

/** Tô đỏ từ đang học trong câu ví dụ, gồm cả dạng số nhiều. */
const highlightWords = computed(() => [
  props.flashcard.front.word,
  props.flashcard.grammar?.plural?.form ?? '',
].filter(Boolean))

/** Bỏ dấu `/` bao quanh IPA cho khớp cách design hiển thị: ['ka:za] */
const pronunciation = computed(() =>
  (props.flashcard.front.pronunciation || '').replace(/^\/|\/$/g, ''),
)

/** Từ dài ở text-5xl sẽ tràn đè ô ảnh — co cỡ chữ theo độ dài. */
const wordSizeClass = computed(() => {
  const len = headWord.value.length
  if (len <= 6)
    return 'text-4xl sm:text-5xl'
  if (len <= 10)
    return 'text-3xl sm:text-4xl'
  return 'text-2xl sm:text-3xl'
})

const definition = computed(() =>
  isItalian.value ? props.flashcard.front.definition : props.flashcard.back.definition,
)
</script>

<template>
  <article class="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
    <!-- Thân thẻ: hai cột như design -->
    <div class="grid gap-6 px-5 py-6 sm:px-8 lg:grid-cols-2 lg:gap-0">
      <!-- Cột trái -->
      <div class="space-y-4 lg:pr-8">
        <div class="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
          <div class="flex shrink-0 flex-col items-center gap-1">
            <FlashcardSpeakButton
              :text="flashcard.front.word"
              size="xl"
              tone="red"
              :speaking="speakingText === flashcard.front.word"
              :disabled="speechDisabled"
              label="Nghe phát âm"
              @speak="emit('speak', $event)"
            />
            <span class="text-[10px] text-gray-500">Nghe phát âm</span>
          </div>

          <div class="min-w-0 flex-1 text-center">
            <span
              v-if="streaming && !headWord"
              class="mx-auto block h-10 w-40 animate-pulse rounded-lg bg-gray-200 sm:h-12"
            />
            <h2
              v-else
              class="font-serif font-bold leading-none text-[#CE2B37] [overflow-wrap:anywhere]"
              :class="wordSizeClass"
            >
              {{ headWord }}
            </h2>
            <!-- IPA là phiên âm tiếng Ý -> chỉ mặt Ý mới hiện -->
            <span
              v-if="isItalian && streaming && !pronunciation"
              class="mx-auto mt-2 block h-4 w-24 animate-pulse rounded bg-gray-100"
            />
            <p v-else-if="isItalian && pronunciation" class="mt-1.5 whitespace-nowrap text-sm text-gray-600 sm:text-base">
              [{{ pronunciation }}]
            </p>
          </div>

          <!-- Ô chủ đề chỉ còn icon: nhãn chữ trước đây là ngôn ngữ mặt kia -->
          <div
            class="flex w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-gray-200 px-2 py-2.5 sm:w-24 sm:py-3"
          >
            <Icon :name="topicIcon" class="text-2xl text-[#1B8A3C] sm:text-3xl" />
          </div>
        </div>

        <FlashcardGrammarTable
          :grammar="flashcard.grammar"
          :primary="side"
          :meaning="meaningRow?.value"
          :meaning-label="meaningRow?.label"
          :streaming="streaming"
        />

        <!-- Ghi nhớ viết bằng tiếng Việt -> chỉ nằm ở mặt Việt -->
        <section
          v-if="!isItalian && (flashcard.mnemonic || streaming)"
          class="flex items-start gap-2.5 rounded-2xl border border-[#CFE7D4] bg-white px-3.5 py-3 sm:px-4"
        >
          <Icon name="tabler:bulb" class="mt-0.5 shrink-0 text-lg text-amber-500" />
          <p class="min-w-0 flex-1 text-sm text-gray-800">
            <span class="font-bold text-[#CE2B37]">GHI NHỚ:&nbsp;</span>
            <template v-if="flashcard.mnemonic">
              {{ flashcard.mnemonic }}
            </template>
            <span v-else class="inline-block h-4 w-3/5 animate-pulse rounded bg-gray-200 align-middle" />
          </p>
        </section>

        <!-- Định nghĩa theo ngôn ngữ của mặt -->
        <section v-if="definition" class="border-t border-gray-100 pt-3">
          <p class="text-xs text-gray-600 sm:text-sm" :class="isItalian ? '' : 'italic'">
            {{ definition }}
          </p>
        </section>
      </div>

      <!-- Cột phải -->
      <div class="flex flex-col border-t border-gray-100 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
        <FlashcardExamples
          class="flex-1"
          :italian="flashcard.front.examples"
          :vietnamese="flashcard.back.examples"
          :primary="side"
          :highlight-words="highlightWords"
          :speaking-text="speakingText"
          :speech-disabled="speechDisabled"
          :streaming="streaming"
          @speak="emit('speak', $event)"
        />

        <!-- Hai nút chính: nằm trong thẻ như design, click không được lật thẻ -->
        <div v-if="SHOW_CARD_ACTIONS" class="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            :disabled="savePending"
            :aria-pressed="flashcard.is_saved"
            class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#CE2B37] px-4 py-3.5 text-sm font-bold tracking-wide text-white transition-colors hover:bg-[#B3232E] disabled:cursor-wait disabled:opacity-60 sm:text-base"
            @click.stop="emit('toggleSave')"
          >
            <Icon :name="flashcard.is_saved ? 'tabler:heart-filled' : 'tabler:heart'" class="text-lg" />
            {{ flashcard.is_saved ? 'ĐÃ LƯU' : 'LƯU TỪ' }}
          </button>

          <button
            type="button"
            class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1B8A3C] px-4 py-3.5 text-sm font-bold tracking-wide text-white transition-colors hover:bg-[#157031] sm:text-base"
            @click.stop="emit('addToSet')"
          >
            <Icon name="tabler:square-plus" class="text-lg" />
            THÊM VÀO BỘ TỪ
          </button>
        </div>

        <div class="mt-3 flex items-center justify-between">
          <p class="flex items-center gap-1.5 text-xs text-gray-400">
            <Icon name="tabler:hand-click" class="text-sm" />
            {{ isItalian ? 'Bấm vào thẻ để xem mặt tiếng Việt' : 'Bấm vào thẻ để lật lại mặt tiếng Ý' }}
          </p>
          <button
            v-if="!streaming"
            type="button"
            class="flex cursor-pointer items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-[#CE2B37]"
            @click.stop="emit('feedback')"
          >
            <Icon name="tabler:flag" class="text-sm" />
            Báo nội dung sai
          </button>
        </div>
      </div>
    </div>
  </article>
</template>
