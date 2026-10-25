<script setup lang="ts">
import type { NewQuiz } from '~/composables/api/useNewQuizApi'
import type { ExerciseReviewStatus, ExerciseType } from '~/types/ai-exercise.type'
import { useAIExerciseApi } from '~/composables/api/useAIExerciseApi'
import { EXERCISE_TYPE_META } from '~/utils/exercise'

/** Bài AI học viên đã tạo + bài nghe đã nhận, theo lần nhận gần nhất. Kết quả từng lần làm xem ở /quizz/{id}/attempts. */
const PAGE_SIZE = 10

const api = useAIExerciseApi()

const items = ref<NewQuiz[]>([])
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)

// Học viên chỉ cần biết bài còn làm được hay không, không cần thuật ngữ "duyệt".
const STATUS_HINT: Record<ExerciseReviewStatus, { label: string, class: string }> = {
  pending: { label: 'Mới tạo', class: 'bg-sky-50 text-sky-700' },
  approved: { label: 'Đã kiểm duyệt', class: 'bg-green-50 text-green-700' },
  rejected: { label: 'Đã gỡ — nội dung chưa chính xác', class: 'bg-red-50 text-red-700' },
}

async function load(append = false) {
  if (append)
    loadingMore.value = true
  else
    loading.value = true
  try {
    const res = await api.getMine({ limit: PAGE_SIZE, offset: append ? items.value.length : 0 })
    items.value = append ? [...items.value, ...res.results] : res.results
    total.value = res.count
  }
  catch (error) {
    console.error('Error loading AI exercises:', error)
  }
  finally {
    loading.value = false
    loadingMore.value = false
  }
}

function typeMeta(quiz: NewQuiz) {
  return EXERCISE_TYPE_META[quiz.exercise_type as ExerciseType]
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(date))
}

function canRetake(quiz: NewQuiz) {
  return quiz.review_status !== 'rejected' && (quiz.user_attempts_count ?? 0) < quiz.retake_limit
}

onMounted(() => load())
</script>

<template>
  <section class="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
    <div class="mb-4 flex items-center gap-2">
      <Icon name="tabler:history" class="text-xl text-[#1B8A3C]" />
      <h2 class="text-lg font-semibold text-gray-900">
        Bài tập của bạn
      </h2>
      <span v-if="total" class="text-sm text-gray-400">({{ total }})</span>
    </div>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-16 animate-pulse rounded-2xl bg-gray-100" />
    </div>

    <p v-else-if="!items.length" class="py-6 text-center text-sm text-gray-500">
      Bạn chưa có bài tập nào. Chọn chủ đề và trình độ ở trên để bắt đầu.
    </p>

    <ul v-else class="space-y-3">
      <li
        v-for="quiz in items"
        :key="quiz.id"
        class="flex flex-col gap-3 rounded-2xl border border-gray-100 px-4 py-3 sm:flex-row sm:items-center"
      >
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F1F9F3]">
          <Icon :name="typeMeta(quiz)?.icon || 'tabler:list-check'" class="text-xl text-[#1B8A3C]" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate font-medium text-gray-900">
            {{ quiz.title }}
          </p>
          <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span>{{ quiz.total_questions }} câu</span>
            <span>· {{ formatDate(quiz.last_requested_at ?? quiz.created_at) }}</span>
            <span v-if="quiz.user_attempts_count">· Đã làm {{ quiz.user_attempts_count }} lần</span>
            <span
              v-if="quiz.review_status"
              class="rounded-full px-2 py-0.5 font-medium"
              :class="STATUS_HINT[quiz.review_status]?.class"
            >
              {{ STATUS_HINT[quiz.review_status]?.label }}
            </span>
          </div>
        </div>
        <div class="flex shrink-0 gap-2">
          <NuxtLink
            v-if="quiz.user_attempts_count"
            :to="`/quizz/${quiz.id}/attempts`"
            class="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium !text-gray-700 hover:!bg-gray-50"
          >
            <Icon name="tabler:chart-bar" />
            Kết quả
          </NuxtLink>
          <NuxtLink
            v-if="canRetake(quiz)"
            :to="`/quizz/${quiz.id}`"
            class="inline-flex items-center gap-1 rounded-xl !bg-emerald-600 px-3 py-2 text-sm font-semibold !text-white hover:!bg-emerald-500"
          >
            <Icon name="tabler:player-play" />
            {{ quiz.user_attempts_count ? 'Làm lại' : 'Làm bài' }}
          </NuxtLink>
        </div>
      </li>
    </ul>

    <div v-if="items.length < total" class="mt-4 text-center">
      <button
        type="button"
        :disabled="loadingMore"
        class="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-5 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        @click="load(true)"
      >
        <Icon v-if="loadingMore" name="tabler:loader-2" class="animate-spin" />
        Xem thêm
      </button>
    </div>
  </section>
</template>
