<script setup lang="ts">
interface Props {
  italian?: string[]
  vietnamese?: string[]
  /** Mỗi mặt chỉ hiện đúng một ngôn ngữ: 'it' -> câu Ý (kèm loa), 'vi' -> câu dịch. */
  primary?: 'it' | 'vi'
  /** Các dạng của từ đang học, để tô đỏ trong câu ví dụ (số ít + số nhiều). */
  highlightWords?: string[]
  speakingText?: string
  speechDisabled?: boolean
  /** Đang stream: luôn hiện đủ 3 khung ví dụ, câu chưa tới là skeleton. */
  streaming?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  italian: () => [],
  vietnamese: () => [],
  primary: 'it',
  highlightWords: () => [],
})

const emit = defineEmits<{
  speak: [text: string]
}>()

/**
 * Backend đảm bảo `back.examples[i]` luôn là bản dịch của `front.examples[i]`
 * và hai mảng luôn bằng nhau về số lượng, nên zip theo index là an toàn.
 */
const pairs = computed(() => {
  const total = props.streaming ? Math.max(props.italian.length, 3) : props.italian.length
  return Array.from({ length: total }, (_, index) => ({
    it: props.italian[index] ?? '',
    vi: props.vietnamese[index] ?? '',
  }))
})

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Khớp cả dạng số ít lẫn số nhiều, ưu tiên chuỗi dài hơn để không cắt nhầm. */
const highlightRe = computed(() => {
  const words = [...new Set(props.highlightWords.filter(Boolean))]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)

  return words.length ? new RegExp(`(${words.join('|')})`, 'gi') : null
})

interface Segment { text: string, hit: boolean }

function segments(text: string): Segment[] {
  const re = highlightRe.value
  if (!re)
    return [{ text, hit: false }]

  const out: Segment[] = []
  let last = 0

  for (const match of text.matchAll(re)) {
    const index = match.index ?? 0
    if (index > last)
      out.push({ text: text.slice(last, index), hit: false })
    out.push({ text: match[0], hit: true })
    last = index + match[0].length
  }
  if (last < text.length)
    out.push({ text: text.slice(last), hit: false })

  return out
}
</script>

<template>
  <section v-if="pairs.length">
    <h3
      class="rounded-lg bg-[#1B8A3C] px-4 py-2.5 text-center text-sm font-bold tracking-wide text-white sm:text-base"
    >
      {{ streaming ? 3 : pairs.length }} {{ primary === 'it' ? 'ESEMPI' : 'VÍ DỤ' }}
    </h3>

    <ol class="mt-1 divide-y divide-gray-100">
      <li
        v-for="(pair, index) in pairs"
        :key="index"
        class="flex items-start gap-3 py-4 sm:gap-4"
      >
        <span
          class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1B8A3C] text-xs font-bold text-white"
        >
          {{ index + 1 }}
        </span>

        <div v-if="streaming && !(primary === 'it' ? pair.it : pair.vi)" class="min-w-0 flex-1 space-y-2 py-0.5">
          <span class="block h-4 w-4/5 animate-pulse rounded bg-gray-200" />
          <span class="block h-3 w-3/5 animate-pulse rounded bg-gray-100" />
        </div>
        <div v-else class="min-w-0 flex-1">
          <!-- Mặt Ý: chỉ câu tiếng Ý (tô đỏ từ đang học). Mặt Việt: chỉ câu dịch. -->
          <p v-if="primary === 'it'" class="text-sm font-bold text-gray-900 sm:text-base">
            <template v-for="(segment, i) in segments(pair.it)" :key="i">
              <span :class="segment.hit ? 'text-[#CE2B37]' : ''">{{ segment.text }}</span>
            </template>
          </p>
          <p v-else class="text-sm font-bold text-gray-900 sm:text-base">
            {{ pair.vi }}
          </p>
        </div>

        <!-- Loa đọc câu Ý nên chỉ có ở mặt Ý -->
        <FlashcardSpeakButton
          v-if="primary === 'it' && pair.it"
          :text="pair.it"
          size="md"
          :speaking="speakingText === pair.it"
          :disabled="speechDisabled"
          :label="`Nghe câu ví dụ ${index + 1}`"
          @speak="emit('speak', $event)"
        />
      </li>
    </ol>
  </section>
</template>
