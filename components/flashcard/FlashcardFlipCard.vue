<script setup lang="ts">
import type { Flashcard } from '~/types/flashcard.type'

interface Props {
  flashcard: Flashcard
  speakingText?: string
  speechSupported?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  speak: [text: string]
  exit: []
}>()

const flipped = ref(false)

// API trả cả hai mặt cùng lúc nên lật thẻ không cần gọi thêm request.
function flip() {
  flipped.value = !flipped.value
}

watch(() => props.flashcard.id, () => {
  flipped.value = false
})

const speechDisabled = computed(() => props.speechSupported === false)
</script>

<template>
  <section class="space-y-4">
    <div class="flex items-center justify-between">
      <p class="flex items-center gap-2 text-sm text-gray-500">
        <Icon name="tabler:refresh" class="text-base" />
        Chế độ luyện tập — bấm vào thẻ để lật
      </p>
      <button
        type="button"
        class="flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-green-300 hover:text-green-700"
        @click="emit('exit')"
      >
        <Icon name="tabler:arrow-left" class="text-sm" />
        Xem chi tiết
      </button>
    </div>

    <div class="flip-card" :class="{ 'is-flipped': flipped }" @click="flip">
      <div class="flip-card-inner">
        <!-- Mặt trước: hoàn toàn tiếng Ý -->
        <div class="flip-card-face rounded-3xl border border-gray-100 bg-gradient-to-br from-green-50 to-white shadow-sm">
          <span class="absolute left-5 top-5 rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-semibold text-green-700">
            Italiano
          </span>
          <p class="text-4xl font-bold text-gray-900 sm:text-5xl">
            {{ flashcard.front.word }}
          </p>
          <p v-if="flashcard.front.pronunciation" class="mt-2 font-mono text-base text-gray-500">
            {{ flashcard.front.pronunciation }}
          </p>
          <p v-if="flashcard.front.part_of_speech" class="mt-1 text-sm italic text-gray-400">
            {{ flashcard.front.part_of_speech }}
          </p>
          <div class="mt-5">
            <FlashcardSpeakButton
              :text="flashcard.front.word"
              size="lg"
              :speaking="speakingText === flashcard.front.word"
              :disabled="speechDisabled"
              @speak="emit('speak', $event)"
            />
          </div>
          <p class="absolute bottom-5 text-xs text-gray-400">
            Bấm để xem nghĩa
          </p>
        </div>

        <!-- Mặt sau: tiếng Việt -->
        <div class="flip-card-face flip-card-back rounded-3xl border border-gray-100 bg-gradient-to-br from-blue-50 to-white shadow-sm">
          <span class="absolute left-5 top-5 rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
            Tiếng Việt
          </span>
          <p class="text-3xl font-bold text-gray-900 sm:text-4xl">
            {{ flashcard.back.word }}
          </p>
          <p v-if="flashcard.back.part_of_speech" class="mt-1 text-sm italic text-gray-400">
            {{ flashcard.back.part_of_speech }}
          </p>
          <p v-if="flashcard.back.definition" class="mt-4 max-w-md text-sm text-gray-600">
            {{ flashcard.back.definition }}
          </p>
          <p v-if="flashcard.back.synonyms?.length" class="mt-3 text-sm text-gray-500">
            {{ flashcard.back.synonyms.join(', ') }}
          </p>
          <p class="absolute bottom-5 text-xs text-gray-400">
            Bấm để lật lại
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.flip-card {
  perspective: 1600px;
  cursor: pointer;
}

.flip-card-inner {
  position: relative;
  width: 100%;
  min-height: 22rem;
  transition: transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
}

.flip-card.is-flipped .flip-card-inner {
  transform: rotateY(180deg);
}

.flip-card-face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
  text-align: center;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.flip-card-back {
  transform: rotateY(180deg);
}

@media (prefers-reduced-motion: reduce) {
  .flip-card-inner {
    transition: none;
  }
}
</style>
