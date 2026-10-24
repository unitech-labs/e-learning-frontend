<script setup lang="ts">
import type { NewQuizDetail } from '~/composables/api/useNewQuizApi'

/**
 * Tài liệu đi kèm bài tập: đoạn văn (đọc hiểu), audio + ảnh đề (nghe hiểu).
 * Đặt NGOÀI khối câu hỏi để chuyển câu không làm audio dừng / tua lại.
 */
interface Props {
  quiz: Pick<NewQuizDetail, 'exercise_type' | 'passage' | 'audio_url' | 'image_urls'>
  defaultOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  defaultOpen: true,
})

const open = ref(props.defaultOpen)
const audioEl = ref<HTMLAudioElement | null>(null)

const images = computed(() => props.quiz.image_urls ?? [])
const hasMaterials = computed(() => !!props.quiz.passage || !!props.quiz.audio_url || images.value.length > 0)

const title = computed(() => {
  if (props.quiz.audio_url)
    return 'Audio & đề bài nghe'
  if (props.quiz.passage)
    return 'Đoạn văn'
  return 'Đề bài'
})

function replayFromStart() {
  if (!audioEl.value)
    return
  audioEl.value.currentTime = 0
  audioEl.value.play()
}
</script>

<template>
  <section v-if="hasMaterials" class="overflow-hidden rounded-2xl border border-green-200 bg-white">
    <button
      type="button"
      class="flex w-full cursor-pointer items-center justify-between gap-3 bg-green-50 px-5 py-3 text-left"
      @click="open = !open"
    >
      <span class="flex items-center gap-2 font-semibold text-green-800">
        <Icon :name="quiz.audio_url ? 'tabler:headphones' : quiz.passage ? 'tabler:book' : 'tabler:photo'" class="text-lg" />
        {{ title }}
      </span>
      <Icon name="tabler:chevron-down" class="text-lg text-green-700 transition-transform" :class="open ? 'rotate-180' : ''" />
    </button>

    <div v-show="open" class="space-y-4 p-4 sm:p-5">
      <!-- Audio: nghe lại không giới hạn -->
      <div v-if="quiz.audio_url" class="space-y-2">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <audio
            ref="audioEl"
            :src="quiz.audio_url"
            controls
            preload="metadata"
            class="w-full"
          />
          <button
            type="button"
            class="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full border border-green-500 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50"
            @click="replayFromStart"
          >
            <Icon name="tabler:rotate-clockwise" />
            Nghe lại từ đầu
          </button>
        </div>
        <p class="text-xs text-gray-500">
          Bạn có thể nghe lại không giới hạn số lần.
        </p>
      </div>

      <!-- Ảnh đề (kiểu IELTS Listening): bấm để phóng to -->
      <a-image-preview-group v-if="images.length">
        <div class="grid gap-3" :class="images.length > 1 ? 'sm:grid-cols-2' : ''">
          <a-image
            v-for="(src, index) in images"
            :key="src"
            :src="src"
            :alt="`Trang đề ${index + 1}`"
            class="rounded-lg border border-gray-200"
          />
        </div>
      </a-image-preview-group>

      <!-- Đoạn văn đọc hiểu -->
      <div
        v-if="quiz.passage"
        lang="it"
        class="max-h-96 overflow-y-auto whitespace-pre-line rounded-xl bg-gray-50 p-4 text-[15px] leading-relaxed text-gray-800"
      >
        {{ quiz.passage }}
      </div>
    </div>
  </section>
</template>
