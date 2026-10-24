<script setup lang="ts">
import type { AdminAIExerciseDetail } from '~/composables/api/useAIExerciseApi'
import { useMediaQuery } from '@vueuse/core'
import { message } from 'ant-design-vue'
import ExerciseMaterials from '~/components/learning/new-quiz/ExerciseMaterials.vue'
import { parseExerciseError, useAIExerciseApi } from '~/composables/api/useAIExerciseApi'
import { exerciseTypeLabel, OPTION_LABEL_COLORS, REVIEW_STATUS_META } from '~/utils/exercise'

/** Xem toàn bộ đề + đáp án của một bài AI rồi duyệt / từ chối / chuyển sang sửa. */
interface Props {
  exerciseId: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  reviewed: [exercise: AdminAIExerciseDetail]
}>()

const api = useAIExerciseApi()
const router = useRouter()

const exercise = ref<AdminAIExerciseDetail | null>(null)
const loading = ref(false)
const submitting = ref<'approve' | 'reject' | null>(null)
const note = ref('')

const open = computed(() => !!props.exerciseId)
// Màn hẹp: drawer chiếm toàn màn hình thay vì cố định 760px
const isNarrow = useMediaQuery('(max-width: 799px)')

// Duyệt lại được cả bài đã duyệt nhưng bị gỡ xuất bản (vd sau khi sửa ở trình soạn quiz)
const canApprove = computed(() => !!exercise.value && !(exercise.value.review_status === 'approved' && exercise.value.is_published))
const canReject = computed(() => !!exercise.value && exercise.value.review_status !== 'rejected')

watch(() => props.exerciseId, async (id) => {
  exercise.value = null
  note.value = ''
  if (!id)
    return
  loading.value = true
  try {
    exercise.value = await api.adminGet(id)
    note.value = exercise.value.review_note || ''
  }
  catch (error) {
    message.error(parseExerciseError(error).message)
    emit('close')
  }
  finally {
    loading.value = false
  }
}, { immediate: true })

async function review(action: 'approve' | 'reject') {
  if (!exercise.value)
    return
  submitting.value = action
  try {
    const updated = action === 'approve'
      ? await api.approve(exercise.value.id, note.value)
      : await api.reject(exercise.value.id, note.value)
    exercise.value = updated
    message.success(action === 'approve' ? 'Đã duyệt — bài đã vào kho bài tập chung' : 'Đã từ chối — bài đã bị ẩn')
    emit('reviewed', updated)
  }
  catch (error) {
    message.error(parseExerciseError(error).message)
  }
  finally {
    submitting.value = null
  }
}

function editContent() {
  if (!exercise.value)
    return
  router.push({
    path: `/admin/new-quiz-management/${exercise.value.id}/edit`,
    query: { redirect: `/admin/ai-exercises?id=${exercise.value.id}` },
  })
}

function formatDate(date?: string | null) {
  return date ? new Date(date).toLocaleString('vi-VN') : '—'
}
</script>

<template>
  <a-drawer
    :open="open"
    :width="isNarrow ? '100%' : 760"
    :body-style="isNarrow ? { padding: '16px' } : undefined"
    title="Duyệt bài tập AI"
    @close="emit('close')"
  >
    <div v-if="loading" class="flex justify-center py-16">
      <a-spin />
    </div>

    <div v-else-if="exercise" class="space-y-5">
      <!-- Meta -->
      <div class="space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-lg font-semibold text-gray-900">
            {{ exercise.title }}
          </h2>
          <a-tag v-if="exercise.review_status" :color="REVIEW_STATUS_META[exercise.review_status]?.color">
            {{ REVIEW_STATUS_META[exercise.review_status]?.label }}
          </a-tag>
          <a-tag v-if="exercise.review_status === 'approved' && !exercise.is_published" color="default">
            Chưa xuất bản
          </a-tag>
        </div>
        <div class="grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-gray-600 sm:grid-cols-2">
          <span>Dạng bài: <b class="text-gray-800">{{ exerciseTypeLabel(exercise.exercise_type) }}</b></span>
          <span>Trình độ: <b class="text-gray-800">{{ exercise.level_code }}</b></span>
          <span>Chủ đề: <b class="text-gray-800">{{ exercise.topic_name || '—' }}</b></span>
          <span>Số câu: <b class="text-gray-800">{{ exercise.questions.length }}</b></span>
          <span class="break-words">Học viên: <b class="text-gray-800">{{ exercise.requested_by_name || '—' }}</b> {{ exercise.requested_by_email ? `(${exercise.requested_by_email})` : '' }}</span>
          <span>Tạo lúc: {{ formatDate(exercise.created_at) }}</span>
          <span v-if="exercise.reviewed_by_name">Người duyệt: {{ exercise.reviewed_by_name }} · {{ formatDate(exercise.reviewed_at) }}</span>
          <span>Model: {{ exercise.ai_model || '—' }}</span>
        </div>
        <p v-if="exercise.description" class="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
          {{ exercise.description }}
        </p>
      </div>

      <ExerciseMaterials :quiz="exercise" />

      <!-- Questions with answers -->
      <ol class="space-y-3">
        <li
          v-for="(question, index) in exercise.questions"
          :key="question.id"
          class="rounded-xl border border-gray-200 p-4"
        >
          <p class="whitespace-pre-line font-medium text-gray-900" lang="it">
            {{ index + 1 }}. {{ question.prompt }}
          </p>

          <div v-if="question.question_type === 'multiple_choice'" class="mt-3 grid gap-2 sm:grid-cols-2">
            <div
              v-for="option in question.options || []"
              :key="option.id"
              class="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
              :class="option.is_correct ? 'border-green-300 bg-green-50 text-green-900' : 'border-gray-200 text-gray-700'"
            >
              <span
                class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-black"
                :class="OPTION_LABEL_COLORS[option.label] || 'bg-gray-200'"
              >{{ option.label }}</span>
              <span class="flex-1" lang="it">{{ option.text }}</span>
              <Icon v-if="option.is_correct" name="tabler:circle-check" class="text-green-600" />
            </div>
          </div>

          <div v-else-if="question.question_type === 'text_input' && question.sample_answer" class="mt-3 text-sm">
            <p>
              Đáp án: <b class="text-green-700" lang="it">{{ question.sample_answer.text }}</b>
            </p>
            <p v-if="question.sample_answer.accepted_answers?.length" class="text-gray-600">
              Cũng chấp nhận: <span lang="it">{{ question.sample_answer.accepted_answers.join(', ') }}</span>
            </p>
            <p v-if="question.sample_answer.case_sensitive === false" class="text-xs text-gray-400">
              Không phân biệt hoa/thường
            </p>
          </div>

          <p v-if="question.explanation" class="mt-3 rounded-lg bg-blue-50 p-2 text-sm text-blue-800">
            {{ question.explanation }}
          </p>
        </li>
      </ol>
    </div>

    <template v-if="exercise" #footer>
      <div class="space-y-3">
        <a-textarea
          v-model:value="note"
          :rows="2"
          :maxlength="2000"
          placeholder="Ghi chú duyệt (không bắt buộc), ví dụ: Câu 3 sai đáp án"
        />
        <!-- Màn hẹp: nút xếp dọc, full width, hành động chính ở trên -->
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <a-button class="!flex w-full !items-center !justify-center !gap-1 sm:w-auto" @click="editContent">
            <Icon name="tabler:pencil" />
            Sửa nội dung
          </a-button>
          <a-button
            v-if="canReject"
            danger
            class="w-full sm:w-auto"
            :loading="submitting === 'reject'"
            :disabled="!!submitting"
            @click="review('reject')"
          >
            Từ chối
          </a-button>
          <a-button
            v-if="canApprove"
            type="primary"
            class="w-full sm:w-auto"
            :loading="submitting === 'approve'"
            :disabled="!!submitting"
            @click="review('approve')"
          >
            Duyệt & xuất bản
          </a-button>
        </div>
      </div>
    </template>
  </a-drawer>
</template>
