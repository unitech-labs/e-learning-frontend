<script setup lang="ts">
import type { AdminHomeworkSubmission } from '~/composables/api/useHomeworkApi'
import { notification } from 'ant-design-vue'
import FilePreviewModal from '~/components/shared/FilePreviewModal.vue'
import { useHomeworkApi } from '~/composables/api/useHomeworkApi'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
})

const route = useRoute()
const router = useRouter()
const submissionId = computed(() => route.params.id as string)

const { t } = useI18n()
const { getAdminHomeworkSubmissionDetail, gradeAdminHomeworkSubmission } = useHomeworkApi()
const { refreshCount } = useAdminHomeworkSubmissionsCount({ enabled: true })

const loading = ref(true)
const grading = ref(false)
const submission = ref<AdminHomeworkSubmission | null>(null)
const error = ref<string | null>(null)
const gradeValue = ref<number | null>(null)
const feedbackValue = ref('')
const gradeModalOpen = ref(false)
const previewOpen = ref(false)
const previewFile = ref<{ file_url: string, file_name: string, file_type?: string } | null>(null)

const canGrade = computed(() => submission.value?.status === 'pending')

function openPreview(att: { file_url: string, file_name: string, file_type?: string }) {
  previewFile.value = att
  previewOpen.value = true
}

async function loadSubmission() {
  try {
    loading.value = true
    error.value = null
    submission.value = await getAdminHomeworkSubmissionDetail(submissionId.value)
    gradeValue.value = submission.value.grade
    feedbackValue.value = submission.value.feedback || ''
  }
  catch (e) {
    console.error('Load submission:', e)
    error.value = t('admin.homeworkSubmissions.messages.loadDetailError')
  }
  finally {
    loading.value = false
  }
}

function openGradeModal() {
  gradeValue.value = submission.value?.grade ?? null
  feedbackValue.value = submission.value?.feedback || ''
  gradeModalOpen.value = true
}

async function handleGrade() {
  if (gradeValue.value == null || gradeValue.value < 0 || gradeValue.value > 10) {
    notification.warning({ message: t('admin.homeworkSubmissions.detail.gradePlaceholder') })
    return
  }
  try {
    grading.value = true
    submission.value = await gradeAdminHomeworkSubmission(submissionId.value, {
      grade: gradeValue.value,
      feedback: feedbackValue.value.trim() || undefined,
    })
    gradeModalOpen.value = false
    notification.success({ message: t('admin.homeworkSubmissions.messages.gradeSuccess') })
    refreshCount()
  }
  catch (e) {
    console.error('Grade submission:', e)
    notification.error({ message: t('admin.homeworkSubmissions.messages.gradeError') })
  }
  finally {
    grading.value = false
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function handleBack() {
  router.push('/admin/homework-submissions')
}

onMounted(() => loadSubmission())
</script>

<template>
  <div class="py-4">
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <a-button type="text" class="!flex !items-center" @click="handleBack">
          <template #icon>
            <Icon name="tabler:arrow-left" />
          </template>
          {{ $t('admin.homeworkSubmissions.actions.back') }}
        </a-button>
        <div>
          <h2 class="text-xl font-bold text-gray-900">
            {{ $t('admin.homeworkSubmissions.title') }} - {{ submission?.homework?.title || '...' }}
          </h2>
          <p class="text-gray-600 text-sm mt-0.5">
            {{ submission?.classroom?.title }}
          </p>
        </div>
      </div>
      <a-button
        v-if="canGrade"
        type="primary"
        class="!flex !items-center"
        @click="openGradeModal"
      >
        <Icon name="solar:pen-bold" size="18" />
        {{ $t('admin.homeworkSubmissions.actions.grade') }}
      </a-button>
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <a-spin size="large" />
    </div>

    <div v-else-if="error" class="bg-white rounded-xl border p-8 text-center">
      <p class="text-red-600">
        {{ error }}
      </p>
      <a-button class="mt-4 !flex !items-center" @click="loadSubmission">
        {{ $t('admin.homeworkSubmissions.actions.retry') }}
      </a-button>
    </div>

    <div v-else-if="submission" class="space-y-6">
      <!-- Student info -->
      <div class="bg-white rounded-xl border p-6">
        <h3 class="font-semibold text-gray-900 mb-4">
          {{ $t('admin.homeworkSubmissions.detail.studentInfo') }}
        </h3>
        <div class="flex items-center gap-4">
          <a-avatar :size="64" :src="submission.student?.avatar" class="shrink-0">
            {{ submission.student?.full_name?.charAt(0) || submission.student?.username?.charAt(0) }}
          </a-avatar>
          <div class="min-w-0">
            <div class="font-semibold text-gray-900 text-lg">
              {{ submission.student?.full_name || submission.student?.username || '-' }}
            </div>
            <div v-if="submission.student?.username" class="text-sm text-gray-500 mt-0.5">
              @{{ submission.student.username }}
            </div>
            <div v-if="submission.student?.email" class="text-sm text-gray-600 mt-1 flex items-center gap-1">
              <Icon name="solar:letter-bold" size="14" />
              {{ submission.student.email }}
            </div>
          </div>
        </div>
      </div>

      <!-- Meta -->
      <div class="bg-white rounded-xl border p-4 flex flex-wrap gap-4">
        <div>
          <span class="text-xs text-gray-500">{{ $t('admin.homeworkSubmissions.table.submittedAt') }}</span>
          <div class="font-medium">
            {{ formatDate(submission.submitted_at) }}
          </div>
        </div>
        <div v-if="submission.status === 'graded'">
          <span class="text-xs text-gray-500">{{ $t('admin.homeworkSubmissions.table.grade') }}</span>
          <div class="font-semibold" :class="submission.grade != null && submission.grade >= 8 ? 'text-green-600' : submission.grade != null && submission.grade >= 5 ? 'text-blue-600' : 'text-red-600'">
            {{ submission.grade }}/10
          </div>
        </div>
        <div v-if="submission.graded_by">
          <span class="text-xs text-gray-500">Chấm bởi</span>
          <div class="font-medium">
            {{ submission.graded_by.full_name || submission.graded_by.username }}
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="bg-white rounded-xl border p-6">
        <h3 class="font-semibold text-gray-900 mb-3">
          {{ $t('admin.homeworkSubmissions.detail.submissionContent') }}
        </h3>
        <div
          v-if="submission.content"
          class="text-gray-700 prose prose-sm max-w-none"
          v-html="submission.content"
        ></div>
        <p v-else class="text-gray-400 italic">
          {{ $t('homeworks.detail.noContent') }}
        </p>
      </div>

      <!-- Attachments -->
      <div v-if="submission.attachments?.length" class="bg-white rounded-xl border p-6">
        <h3 class="font-semibold text-gray-900 mb-3">
          {{ $t('admin.homeworkSubmissions.detail.attachments') }}
        </h3>
        <div class="space-y-2">
          <button
            v-for="att in submission.attachments"
            :key="att.id"
            type="button"
            class="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-gray-700 text-left transition-colors"
            @click="openPreview(att)"
          >
            <Icon name="solar:document-bold" size="20" />
            <span class="truncate flex-1">{{ att.file_name }}</span>
            <Icon name="solar:arrow-right-linear" size="14" class="text-gray-400 shrink-0" />
          </button>
        </div>
      </div>

      <!-- Feedback (when graded) -->
      <div v-if="submission.status === 'graded' && submission.feedback" class="bg-white rounded-xl border p-6">
        <h3 class="font-semibold text-gray-900 mb-3">
          {{ $t('admin.homeworkSubmissions.detail.feedback') }}
        </h3>
        <p class="text-gray-700 whitespace-pre-wrap">
          {{ submission.feedback }}
        </p>
      </div>
    </div>

    <!-- Grade Modal -->
    <a-modal
      v-model:open="gradeModalOpen"
      :title="$t('admin.homeworkSubmissions.actions.grade')"
      :ok-text="$t('admin.homeworkSubmissions.actions.saveGrade')"
      :cancel-text="$t('admin.homeworks.form.cancel')"
      :confirm-loading="grading"
      @ok="handleGrade"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('admin.homeworkSubmissions.detail.grade') }}</label>
          <a-input-number
            v-model:value="gradeValue"
            :min="0"
            :max="10"
            :placeholder="$t('admin.homeworkSubmissions.detail.gradePlaceholder')"
            class="w-full"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('admin.homeworkSubmissions.detail.feedback') }}</label>
          <a-textarea
            v-model:value="feedbackValue"
            :placeholder="$t('admin.homeworkSubmissions.detail.feedbackPlaceholder')"
            :rows="4"
          />
        </div>
      </div>
    </a-modal>

    <!-- File preview modal -->
    <FilePreviewModal
      v-model:open="previewOpen"
      :file="previewFile"
      @update:open="(v) => { if (!v) previewFile = null }"
    />
  </div>
</template>
