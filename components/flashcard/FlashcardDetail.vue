<script setup lang="ts">
import type { Flashcard, FlashcardSuggestion } from '~/types/flashcard.type'

interface Props {
  flashcard: Flashcard
  savePending?: boolean
  speakingText?: string
  speechSupported?: boolean
  /** AI đang sinh nội dung realtime. */
  streaming?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  speak: [text: string]
  toggleSave: []
  addToSet: []
  feedback: []
  lookupWord: [suggestion: FlashcardSuggestion]
}>()

/** API trả cả hai mặt trong một response nên lật thẻ không cần gọi thêm request. */
const flipped = ref(false)

function flip() {
  flipped.value = !flipped.value
}

// Tra từ mới thì luôn bắt đầu lại từ mặt tiếng Ý.
watch(() => props.flashcard.id, () => {
  flipped.value = false
})

const suggestions = computed<FlashcardSuggestion[]>(() => [
  ...(props.flashcard.suggestions?.similar ?? []),
  ...(props.flashcard.suggestions?.same_topic ?? []),
])

const speechDisabled = computed(() => props.speechSupported === false)
</script>

<template>
  <div class="space-y-4">
    <!--
      Bấm vào thẻ (hoặc Enter/Space) để lật giữa hai mặt.
      Các nút bên trong thẻ đều @click.stop nên không kích hoạt lật.
    -->
    <div
      class="flip"
      :class="{ 'is-flipped': flipped, 'is-streaming': streaming }"
      role="button"
      tabindex="0"
      :aria-label="flipped ? 'Đang xem mặt tiếng Việt, bấm để lật về tiếng Ý' : 'Đang xem mặt tiếng Ý, bấm để lật sang tiếng Việt'"
      @click="flip"
      @keydown.enter.prevent="flip"
      @keydown.space.prevent="flip"
    >
      <div class="flip-inner">
        <FlashcardFace
          class="flip-face"
          :flashcard="flashcard"
          side="it"
          :streaming="streaming"
          :save-pending="savePending"
          :speaking-text="speakingText"
          :speech-disabled="speechDisabled"
          @speak="emit('speak', $event)"
          @toggle-save="emit('toggleSave')"
          @add-to-set="emit('addToSet')"
          @feedback="emit('feedback')"
        />
        <FlashcardFace
          class="flip-face flip-face--back"
          :flashcard="flashcard"
          side="vi"
          :streaming="streaming"
          :save-pending="savePending"
          :speaking-text="speakingText"
          :speech-disabled="speechDisabled"
          @speak="emit('speak', $event)"
          @toggle-save="emit('toggleSave')"
          @add-to-set="emit('addToSet')"
          @feedback="emit('feedback')"
        />
      </div>
    </div>

    <!-- Gợi ý từ liên quan: ngoài thẻ lật để không nhân đôi ở hai mặt -->
    <section v-if="suggestions.length" class="rounded-2xl border border-gray-100 bg-white px-4 py-3">
      <h3 class="text-[11px] font-bold tracking-wide text-gray-500">
        TỪ LIÊN QUAN
      </h3>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="suggestion in suggestions"
          :key="`${suggestion.relation}-${suggestion.word}`"
          type="button"
          :title="suggestion.flashcard_id
            ? suggestion.meaning_vi
            : `${suggestion.meaning_vi} — từ này chưa có sẵn, AI sẽ soạn mất khoảng 15 giây`"
          class="cursor-pointer rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:border-[#1B8A3C] hover:text-[#1B8A3C]"
          @click="emit('lookupWord', suggestion)"
        >
          {{ suggestion.word }}
          <span class="ml-1 text-xs text-gray-400">{{ suggestion.meaning_vi }}</span>
          <!-- flashcard_id null nghĩa là phải chờ AI soạn -->
          <Icon
            v-if="!suggestion.flashcard_id"
            name="tabler:sparkles"
            class="ml-1 text-xs text-amber-500"
          />
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.flip {
  perspective: 2000px;
  cursor: pointer;
}

/*
  Viền RGB khi AI đang stream: vòng conic-gradient quay chậm sau lưng thẻ,
  blur nhẹ thành quầng sáng quanh mép. Thẻ nền trắng che phần giữa nên chỉ
  lộ viền. Tắt bằng cách bỏ class is-streaming — không đụng layout.
*/
@property --fc-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

.flip.is-streaming {
  position: relative;
}

.flip.is-streaming::before {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 1.75rem;
  background: conic-gradient(
    from var(--fc-angle),
    #ce2b37,
    #f0b429,
    #1b8a3c,
    #2f8fe0,
    #ce2b37
  );
  filter: blur(7px);
  opacity: 0.55;
  animation: fc-border-spin 3.2s linear infinite;
  pointer-events: none;
}

.flip.is-streaming .flip-inner {
  position: relative;
}

@keyframes fc-border-spin {
  to {
    --fc-angle: 360deg;
  }
}

@media (prefers-reduced-motion: reduce) {
  .flip.is-streaming::before {
    animation: none;
    opacity: 0.35;
  }
}

/*
  Dùng grid thay vì position:absolute để container tự cao bằng mặt dài hơn.
  Với absolute, hai mặt khác chiều cao sẽ bị cắt hoặc hở đáy.
*/
.flip-inner {
  display: grid;
  transform-style: preserve-3d;
  transition: transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
}

.flip.is-flipped .flip-inner {
  transform: rotateY(180deg);
}

.flip-face {
  grid-area: 1 / 1;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.flip-face--back {
  transform: rotateY(180deg);
}

.flip:focus-visible {
  outline: 2px solid #1b8a3c;
  outline-offset: 4px;
  border-radius: 1.5rem;
}

@media (prefers-reduced-motion: reduce) {
  .flip-inner {
    transition: none;
  }
}
</style>
