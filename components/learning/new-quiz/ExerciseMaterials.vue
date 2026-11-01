<script setup lang="ts">
import type { NewQuizDetail } from '~/composables/api/useNewQuizApi'
import { quizAudioTracks } from '~/utils/exercise'
import { shortSection } from '~/utils/listeningDraft'

/**
 * Tài liệu đi kèm bài tập: đoạn văn (đọc hiểu), audio + ảnh đề (nghe hiểu).
 * Đặt NGOÀI khối câu hỏi để chuyển câu không làm audio dừng / tua lại.
 *
 * Bài nghe có thể có nhiều file audio. Học viên KHÔNG chọn file (như khi thi
 * thật): trình phát tự phát audio của phần đang làm — file gắn với phần đó, không
 * có thì audio cả bài. Nhiều file cùng một chỗ thì phát nối tiếp như một bản ghi.
 */
interface Props {
  quiz: Pick<NewQuizDetail, 'exercise_type' | 'passage' | 'audio_url' | 'audio_tracks' | 'image_urls'>
  defaultOpen?: boolean
  /** Phần của câu học viên đang làm — để tự chuyển sang audio của phần đó. */
  currentSection?: string
}

const props = withDefaults(defineProps<Props>(), {
  defaultOpen: true,
  currentSection: undefined,
})

const open = ref(props.defaultOpen)
const audioEl = ref<HTMLAudioElement | null>(null)

const tracks = computed(() => quizAudioTracks(props.quiz))

// Danh sách phát của phần đang làm: file của phần đó; không có thì audio cả bài.
// Không biết phần nào (trang kết quả) thì phát nối tiếp mọi file.
const playlist = computed(() => {
  if (props.currentSection === undefined)
    return tracks.value
  const own = tracks.value.filter(track => track.section && track.section === props.currentSection)
  if (own.length)
    return own
  const whole = tracks.value.filter(track => !track.section)
  return whole.length ? whole : tracks.value
})
const position = ref(0)
const activeTrack = computed(() => playlist.value[position.value] ?? playlist.value[0])
const playlistLabel = computed(() => {
  const section = activeTrack.value?.section
  if (tracks.value.length < 2)
    return ''
  const where = section ? `Audio phần ${shortSection(section)}` : 'Audio của bài'
  return playlist.value.length > 1 ? `${where} · đoạn ${position.value + 1}/${playlist.value.length}` : where
})

const images = computed(() => props.quiz.image_urls ?? [])
const hasMaterials = computed(() => !!props.quiz.passage || tracks.value.length > 0 || images.value.length > 0)

const title = computed(() => {
  if (tracks.value.length)
    return 'Audio & đề bài nghe'
  if (props.quiz.passage)
    return 'Đoạn văn'
  return 'Đề bài'
})

// Sang phần có audio khác thì về đoạn đầu của audio đó; trong cùng phần thì giữ nguyên chỗ đang nghe.
watch(() => playlist.value.map(track => track.url).join('|'), () => {
  position.value = 0
})

// Hết một đoạn thì tự phát đoạn tiếp theo của cùng danh sách.
async function onEnded() {
  if (position.value >= playlist.value.length - 1)
    return
  position.value++
  await nextTick()
  audioEl.value?.play()
}

async function replayFromStart() {
  position.value = 0
  await nextTick()
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
        <Icon :name="tracks.length ? 'tabler:headphones' : quiz.passage ? 'tabler:book' : 'tabler:photo'" class="text-lg" />
        {{ title }}
      </span>
      <Icon name="tabler:chevron-down" class="text-lg text-green-700 transition-transform" :class="open ? 'rotate-180' : ''" />
    </button>

    <div v-show="open" class="space-y-4 p-4 sm:p-5">
      <!-- Audio: nghe lại không giới hạn -->
      <div v-if="activeTrack" class="space-y-2">
        <p v-if="playlistLabel" class="flex items-center gap-1 text-sm font-medium text-green-700">
          <Icon name="tabler:headphones" />
          {{ playlistLabel }}
        </p>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <audio
            ref="audioEl"
            :key="activeTrack.url"
            :src="activeTrack.url"
            controls
            preload="metadata"
            class="w-full"
            @ended="onEnded"
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
          <template v-if="tracks.length > 1">
            Audio tự chuyển theo phần bạn đang làm.
          </template>
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
