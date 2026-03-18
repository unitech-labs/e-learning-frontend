<script setup lang="ts">
import type { StudentHomeworkDetail } from '~/composables/api/useHomeworkApi'
import { notification } from 'ant-design-vue'
import FilePreviewModal from '~/components/shared/FilePreviewModal.vue'
import { useHomeworkApi } from '~/composables/api/useHomeworkApi'
import {
  formatHomeworkDueDate,
  getHomeworkTimeRemaining,
  isHomeworkOverdue,
} from '~/composables/useHomeworkDueDate'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'onboarding'],
})

const route = useRoute()
const router = useRouter()
const homeworkId = computed(() => route.params.id as string)

const { t } = useI18n()
const { getStudentHomeworkDetail, submitHomework, getUploadUrl } = useHomeworkApi()
const { refreshCount: refreshHomeworkCount } = useHomeworkCount({ enabled: true })

// State
const loading = ref(true)
const homework = ref<StudentHomeworkDetail | null>(null)
const error = ref<string | null>(null)
const previewOpen = ref(false)
const previewAttachment = ref<{ file_url: string, file_name: string, file_size: number, file_type: string } | null>(null)

// Submission form state
const isEditing = ref(false)
const submitting = ref(false)
const submissionContent = ref('')
const pendingAttachments = ref<{ file_url: string, file_name: string, file_size: number, file_type: string }[]>([])
const uploadingFiles = ref<Map<string, number>>(new Map())

// Character limit (~1 short essay)
const SUBMISSION_MAX_LENGTH = 2500

function getPlainTextLength(html: string): number {
  if (!html || typeof html !== 'string')
    return 0
  if (typeof document === 'undefined')
    return html.replace(/<[^>]*>/g, '').length
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent?.length ?? 0
}

const submissionCharCount = computed(() => getPlainTextLength(submissionContent.value))
const isOverCharLimit = computed(() => submissionCharCount.value > SUBMISSION_MAX_LENGTH)

const canSubmit = computed(() => {
  if (!homework.value)
    return false
  if (homework.value.strict_deadline && isHomeworkOverdue(homework.value.due_date))
    return false
  if (homework.value.my_submission?.status === 'graded')
    return false
  return true
})

const canEdit = computed(() => {
  if (!homework.value)
    return false
  if (!homework.value.my_submission)
    return true
  return homework.value.my_submission.status === 'pending'
})

const showForm = computed(() => {
  if (!canSubmit.value)
    return false
  if (!homework.value?.my_submission)
    return true
  return isEditing.value
})

const statusType = computed(() => {
  if (!homework.value)
    return 'pending'
  if (homework.value.my_submission) {
    return homework.value.my_submission.status === 'graded' ? 'graded' : 'submitted'
  }
  return isHomeworkOverdue(homework.value.due_date) ? 'overdue' : 'pending'
})

const statusConfig: Record<string, { dot: string, text: string, bg: string }> = {
  pending: { dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-100' },
  submitted: { dot: 'bg-blue-400', text: 'text-blue-700', bg: 'bg-blue-50' },
  graded: { dot: 'bg-green-400', text: 'text-green-700', bg: 'bg-green-50' },
  overdue: { dot: 'bg-red-400', text: 'text-red-700', bg: 'bg-red-50' },
}

async function loadHomework() {
  try {
    loading.value = true
    error.value = null
    homework.value = await getStudentHomeworkDetail(homeworkId.value)
    if (homework.value.my_submission) {
      submissionContent.value = homework.value.my_submission.content || ''
      pendingAttachments.value = (homework.value.my_submission.attachments || []).map(a => ({
        file_url: a.file_url,
        file_name: a.file_name,
        file_size: a.file_size,
        file_type: a.file_type,
      }))
    }
  }
  catch (err: any) {
    console.error('Error loading homework:', err)
    error.value = err?.message || t('homeworks.messages.loadDetailError')
    notification.error({ message: error.value! })
  }
  finally {
    loading.value = false
  }
}

function formatDate(dateString: string) {
  return formatHomeworkDueDate(dateString)
}

function formatFileSize(bytes: number) {
  if (bytes < 1024)
    return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(fileType: string) {
  if (fileType === 'pdf')
    return 'solar:document-bold'
  if (fileType === 'image')
    return 'solar:gallery-bold'
  if (['doc', 'docx'].includes(fileType))
    return 'solar:document-text-bold'
  if (['ppt', 'pptx'].includes(fileType))
    return 'solar:presentation-graph-bold'
  return 'solar:file-bold'
}

function openPreview(att: { file_url: string, file_name: string, file_size: number, file_type: string }) {
  previewAttachment.value = att
  previewOpen.value = true
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files?.length)
    return

  for (const file of Array.from(files)) {
    if (file.size > 20 * 1024 * 1024) {
      notification.warning({ message: `${file.name}: ${t('homeworks.detail.maxFileSize')}` })
      continue
    }

    const sanitizedName = file.name.replace(/ /g, '_')
    const fileId = `${sanitizedName}-${Date.now()}`
    uploadingFiles.value.set(fileId, 0)

    try {
      const { upload_url, file_url } = await getUploadUrl({
        file_name: sanitizedName,
        content_type: file.type,
      })

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            uploadingFiles.value.set(fileId, Math.round((e.loaded / e.total) * 100))
          }
        })
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300)
            resolve()
          else reject(new Error(`Upload failed: ${xhr.status}`))
        })
        xhr.addEventListener('error', () => reject(new Error('Upload failed')))
        xhr.open('PUT', upload_url)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })

      let fileType = 'other'
      const ext = sanitizedName.split('.').pop()?.toLowerCase()
      if (ext === 'pdf')
        fileType = 'pdf'
      else if (['doc', 'docx'].includes(ext || ''))
        fileType = ext!
      else if (['ppt', 'pptx'].includes(ext || ''))
        fileType = ext!
      else if (file.type.startsWith('image/'))
        fileType = 'image'

      pendingAttachments.value.push({
        file_url,
        file_name: sanitizedName,
        file_size: file.size,
        file_type: fileType,
      })
    }
    catch (err) {
      console.error('Upload error:', err)
      notification.error({ message: t('homeworks.messages.uploadError') })
    }
    finally {
      uploadingFiles.value.delete(fileId)
    }
  }

  input.value = ''
}

function removeAttachment(index: number) {
  pendingAttachments.value.splice(index, 1)
}

async function handleSubmit() {
  if (!submissionContent.value.trim() && pendingAttachments.value.length === 0) {
    notification.warning({ message: t('homeworks.messages.emptySubmission') })
    return
  }
  if (isOverCharLimit.value) {
    notification.warning({ message: t('homeworks.detail.contentTooLong', { max: SUBMISSION_MAX_LENGTH }) })
    return
  }

  try {
    submitting.value = true
    await submitHomework(homeworkId.value, {
      content: submissionContent.value,
      attachments: pendingAttachments.value,
    })
    notification.success({ message: t('homeworks.messages.submitSuccess') })
    isEditing.value = false
    await loadHomework()
    await refreshHomeworkCount()
  }
  catch (err: any) {
    console.error('Submit error:', err)
    const msg = err?.response?.data?.message || t('homeworks.messages.submitError')
    notification.error({ message: msg })
  }
  finally {
    submitting.value = false
  }
}

function startEdit() {
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
  if (homework.value?.my_submission) {
    submissionContent.value = homework.value.my_submission.content || ''
    pendingAttachments.value = (homework.value.my_submission.attachments || []).map(a => ({
      file_url: a.file_url,
      file_name: a.file_name,
      file_size: a.file_size,
      file_type: a.file_type,
    }))
  }
}

onMounted(() => {
  loadHomework()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20 lg:pb-8">
    <div class="mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <!-- Back button -->
      <button
        class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors"
        @click="router.push('/homeworks')"
      >
        <Icon name="solar:arrow-left-linear" size="18" />
        {{ $t('homeworks.actions.back') }}
      </button>

      <!-- Loading -->
      <div v-if="loading" class="space-y-4">
        <div class="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
          <div class="h-5 bg-gray-100 rounded w-2/3 mb-3" />
          <div class="h-4 bg-gray-100 rounded w-1/3 mb-6" />
          <div class="h-3 bg-gray-100 rounded w-full mb-2" />
          <div class="h-3 bg-gray-100 rounded w-4/5" />
        </div>
        <div class="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
          <div class="h-4 bg-gray-100 rounded w-1/4 mb-4" />
          <div class="h-24 bg-gray-100 rounded" />
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="bg-white rounded-xl border border-red-200 p-6 text-center">
        <Icon name="solar:danger-triangle-bold" size="32" class="text-red-400 mx-auto mb-2" />
        <p class="text-sm text-red-600">
          {{ error }}
        </p>
      </div>

      <template v-else-if="homework">
        <!-- Assignment card -->
        <div class="bg-white shadow-xs rounded-xl border border-gray-100 overflow-hidden">
          <div class="p-5 sm:p-6">
            <!-- Title + Status -->
            <div class="flex items-start justify-between gap-3 mb-3">
              <h1 class="text-xl font-bold text-gray-900">
                {{ homework.title }}
              </h1>
              <span
                class="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                :class="`${statusConfig[statusType].bg} ${statusConfig[statusType].text}`"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="statusConfig[statusType].dot" />
                {{ $t(`homeworks.status.${statusType}`) }}
              </span>
            </div>

            <!-- Meta -->
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-500 mb-5">
              <span class="flex items-center gap-1.5">
                <Icon name="solar:book-2-bold" size="15" class="text-gray-400" />
                {{ homework.classroom.course.title }}
              </span>
              <span class="flex items-center gap-1.5">
                <Icon name="solar:users-group-rounded-bold" size="15" class="text-gray-400" />
                {{ homework.classroom.title }}
              </span>
              <span class="flex items-center gap-1.5">
                <Icon name="solar:calendar-bold" size="15" class="text-gray-400" />
                {{ formatDate(homework.due_date) }}
              </span>
              <span
                v-if="!isHomeworkOverdue(homework.due_date) && !homework.my_submission && getHomeworkTimeRemaining(homework.due_date)"
                class="flex items-center gap-1.5 text-blue-500"
              >
                <Icon name="solar:clock-circle-bold" size="15" />
                {{ getHomeworkTimeRemaining(homework.due_date) }}
              </span>
              <span v-if="homework.strict_deadline" class="flex items-center gap-1.5 text-red-400">
                <Icon name="solar:lock-bold" size="15" />
                {{ $t('homeworks.strictDeadline') }}
              </span>
            </div>

            <!-- Deadline warning -->
            <div
              v-if="isHomeworkOverdue(homework.due_date) && homework.strict_deadline && !homework.my_submission"
              class="flex items-center gap-2 bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-5"
            >
              <Icon name="solar:danger-triangle-bold" size="16" />
              {{ $t('homeworks.detail.deadlinePassed') }}
            </div>

            <!-- Description -->
            <div>
              <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {{ $t('homeworks.detail.assignment') }}
              </h2>
              <div class="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                {{ homework.description }}
              </div>
            </div>

            <!-- Homework attachments (reference materials) -->
            <div v-if="homework.attachments?.length" class="mt-5 pt-5 border-t border-gray-100">
              <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {{ $t('homeworks.detail.assignmentFiles') }}
              </h2>
              <div class="space-y-1.5">
                <button
                  v-for="att in homework.attachments"
                  :key="att.file_url"
                  type="button"
                  class="flex items-center gap-2.5 px-3 py-2.5 w-full text-left bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm border border-transparent hover:border-gray-200"
                  @click="openPreview(att)"
                >
                  <Icon :name="getFileIcon(att.file_type)" size="18" class="text-gray-400 shrink-0" />
                  <span class="flex-1 min-w-0 truncate text-gray-700">{{ att.file_name }}</span>
                  <span class="text-xs text-gray-400 shrink-0">{{ formatFileSize(att.file_size) }}</span>
                  <Icon name="solar:eye-bold" size="14" class="text-gray-400 shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Grade card (if graded) -->
        <div
          v-if="homework.my_submission?.status === 'graded'"
          class="mt-4 bg-white shadow-xs rounded-xl border border-gray-100 overflow-hidden"
        >
          <div class="p-5 sm:p-6">
            <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              {{ $t('homeworks.grade') }}
            </h2>
            <div class="flex items-center gap-4 mb-3">
              <div
                class="text-3xl font-bold tabular-nums"
                :class="homework.my_submission.grade != null && homework.my_submission.grade >= 8 ? 'text-green-600' : homework.my_submission.grade != null && homework.my_submission.grade >= 5 ? 'text-blue-600' : 'text-red-500'"
              >
                {{ homework.my_submission.grade }}<span class="text-lg text-gray-400 font-normal">/10</span>
              </div>
              <div class="flex-1 max-w-[200px] h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all"
                  :class="homework.my_submission.grade != null && homework.my_submission.grade >= 8 ? 'bg-green-400' : homework.my_submission.grade != null && homework.my_submission.grade >= 5 ? 'bg-blue-400' : 'bg-red-400'"
                  :style="{ width: `${(homework.my_submission.grade ?? 0) * 10}%` }"
                />
              </div>
            </div>

            <!-- Feedback -->
            <div v-if="homework.my_submission.feedback" class="mt-4 pt-4 border-t border-gray-100">
              <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {{ $t('homeworks.detail.feedback') }}
              </h3>
              <div class="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
                {{ homework.my_submission.feedback }}
              </div>
            </div>
          </div>
        </div>

        <!-- Existing submission (read-only view) -->
        <div
          v-if="homework.my_submission && !isEditing"
          class="mt-4 bg-white shadow-xs rounded-xl border border-gray-100 overflow-hidden"
        >
          <div class="p-5 sm:p-6">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {{ $t('homeworks.detail.submissionSection') }}
              </h2>
              <div class="flex items-center gap-3">
                <span class="text-xs text-gray-400">
                  {{ $t('homeworks.submittedAt') }}: {{ formatDate(homework.my_submission.submitted_at) }}
                </span>
                <button
                  v-if="canEdit"
                  class="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  @click="startEdit"
                >
                  {{ $t('homeworks.actions.editSubmission') }}
                </button>
              </div>
            </div>

            <!-- Content -->
            <div
              v-if="homework.my_submission.content"
              class="text-sm text-gray-700 mb-3 prose prose-sm max-w-none"
              v-html="homework.my_submission.content"
            />
            <p v-else class="text-sm text-gray-400 italic mb-3">
              {{ $t('homeworks.detail.noContent') }}
            </p>

            <!-- Attachments -->
            <div v-if="homework.my_submission.attachments?.length" class="space-y-2">
              <h3 class="text-xs font-medium text-gray-500">
                {{ $t('homeworks.detail.attachedFiles') }}
              </h3>
              <div class="space-y-1.5">
                <button
                  v-for="att in homework.my_submission.attachments"
                  :key="att.id"
                  type="button"
                  class="flex items-center gap-2.5 px-3 py-2 w-full text-left bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                  @click="openPreview(att)"
                >
                  <Icon :name="getFileIcon(att.file_type)" size="18" class="text-gray-400 shrink-0" />
                  <span class="flex-1 min-w-0 truncate text-gray-700">{{ att.file_name }}</span>
                  <span class="text-xs text-gray-400 shrink-0">{{ formatFileSize(att.file_size) }}</span>
                  <Icon name="solar:eye-bold" size="14" class="text-gray-400 shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Submission form -->
        <div
          v-if="showForm"
          class="mt-4 bg-white shadow-xs rounded-xl border border-gray-100 overflow-hidden"
        >
          <div class="p-5 sm:p-6">
            <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              {{ homework.my_submission ? $t('homeworks.actions.editSubmission') : $t('homeworks.actions.submit') }}
            </h2>

            <!-- Rich text editor -->
            <QuillEditor
              v-model:content="submissionContent"
              content-type="html"
              theme="snow"
              :placeholder="$t('homeworks.detail.contentPlaceholder')"
              class="submission-quill"
            />
            <p
              class="mt-1.5 text-xs"
              :class="isOverCharLimit ? 'text-red-500' : 'text-gray-400'"
            >
              {{ submissionCharCount }} / {{ SUBMISSION_MAX_LENGTH }} {{ $t('homeworks.detail.characters') }}
            </p>

            <!-- Attachments list -->
            <div v-if="pendingAttachments.length > 0" class="mt-3 space-y-1.5">
              <div
                v-for="(att, index) in pendingAttachments"
                :key="att.file_url"
                class="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-lg text-sm"
              >
                <Icon :name="getFileIcon(att.file_type)" size="18" class="text-gray-400 shrink-0" />
                <span class="flex-1 min-w-0 truncate text-gray-700">{{ att.file_name }}</span>
                <span class="text-xs text-gray-400 shrink-0">{{ formatFileSize(att.file_size) }}</span>
                <button
                  class="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                  @click="removeAttachment(index)"
                >
                  <Icon name="solar:close-circle-bold" size="16" />
                </button>
              </div>
            </div>

            <!-- Uploading files -->
            <div v-if="uploadingFiles.size > 0" class="mt-3 space-y-1.5">
              <div
                v-for="[fileId, progress] in uploadingFiles"
                :key="fileId"
                class="flex items-center gap-2.5 px-3 py-2 bg-blue-50 rounded-lg text-sm"
              >
                <Icon name="svg-spinners:ring-resize" size="16" class="text-blue-500 shrink-0" />
                <span class="flex-1 min-w-0 truncate text-blue-700">{{ $t('homeworks.detail.uploadingFile') }}</span>
                <span class="text-xs text-blue-500 shrink-0 tabular-nums">{{ progress }}%</span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-between mt-4">
              <label class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 cursor-pointer transition-colors">
                <Icon name="solar:paperclip-bold" size="18" />
                {{ $t('homeworks.detail.attachFiles') }}
                <input
                  type="file"
                  multiple
                  class="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                  @change="handleFileSelect"
                >
              </label>

              <div class="flex items-center gap-2">
                <button
                  v-if="homework.my_submission && isEditing"
                  class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  @click="cancelEdit"
                >
                  {{ $t('homeworks.actions.back') }}
                </button>
                <button
                  class="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                  :disabled="submitting || uploadingFiles.size > 0 || isOverCharLimit"
                  @click="handleSubmit"
                >
                  <Icon v-if="submitting" name="svg-spinners:ring-resize" size="14" />
                  {{ submitting ? $t('homeworks.detail.submitting') : homework.my_submission ? $t('homeworks.actions.editSubmission') : $t('homeworks.actions.submit') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Graded - cannot edit message -->
        <div
          v-if="homework.my_submission?.status === 'graded'"
          class="mt-4 flex items-center gap-2 text-sm text-gray-400 justify-center"
        >
          <Icon name="solar:lock-bold" size="14" />
          {{ $t('homeworks.detail.cannotEditGraded') }}
        </div>
      </template>

      <!-- Attachment preview dialog -->
      <FilePreviewModal
        v-model:open="previewOpen"
        :file="previewAttachment"
        @update:open="(v) => { if (!v) previewAttachment = null }"
      />
    </div>
  </div>
</template>

<style scoped lang="css">
:deep(.ql-editor) {
  min-height: 200px;
  height: 200px !important;
  overflow-y: auto;
}
:deep(.ql-toolbar.ql-snow) {
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}
:deep(.ql-container.ql-snow) {
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}
</style>
