<script setup lang="ts">
import type { Rule } from 'ant-design-vue/es/form'
import type { CreateHomeworkPayload, HomeworkAttachment } from '~/composables/api/useHomeworkApi'
import type { Classroom } from '~/types/course.type'
import { Modal, notification } from 'ant-design-vue'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { reactive, ref } from 'vue'
import { useClassroomApi } from '~/composables/api/useClassroomApi'
import { useHomeworkApi } from '~/composables/api/useHomeworkApi'
import { useFileUpload } from '~/composables/useFileUpload'

dayjs.extend(utc)
dayjs.extend(timezone)

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
})

const route = useRoute()
const router = useRouter()
const courseId = computed(() => route.params.id as string)

const { t } = useI18n()
const { createHomework, getUploadUrl } = useHomeworkApi()
const { getClassroomsByCourse } = useClassroomApi()
const { uploadFileWithProgress } = useFileUpload()

const formRef = ref()
const loading = ref(false)
const error = ref<string | null>(null)
const classrooms = ref<Classroom[]>([])
const assignAllClassrooms = ref(false)
const attachments = ref<HomeworkAttachment[]>([])
const uploadProgress = ref(0)
const uploading = ref(false)
const uploadFileList = ref<any[]>([])

function getFileTypeFromFile(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase()
  const mime = file.type?.toLowerCase()
  if (ext === 'pdf' || mime === 'application/pdf')
    return 'pdf'
  if (ext === 'doc' || mime === 'application/msword')
    return 'doc'
  if (ext === 'docx' || mime?.includes('wordprocessingml'))
    return 'docx'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '') || mime?.startsWith('image/'))
    return 'image'
  return 'other'
}

function beforeUpload(file: File): boolean {
  const maxSize = 50 * 1024 * 1024 // 50MB
  if (file.size > maxSize) {
    Modal.error({
      title: t('admin.homeworks.form.attachments.fileTooLarge'),
      content: t('admin.homeworks.form.attachments.fileTooLargeDesc'),
    })
    return false
  }
  return false // Prevent auto upload
}

async function handleUploadFile(file: File) {
  try {
    uploading.value = true
    uploadProgress.value = 0
    const sanitizedName = file.name.replace(/ /g, '_')
    const presigned = await getUploadUrl({
      file_name: sanitizedName,
      content_type: file.type || 'application/octet-stream',
    })
    if (!presigned?.upload_url || !presigned?.file_url) {
      throw new Error(t('admin.homeworks.form.attachments.missingUrls'))
    }
    await uploadFileWithProgress(file, presigned.upload_url, (p) => {
      uploadProgress.value = p
    })
    attachments.value.push({
      file_url: presigned.file_url,
      file_name: file.name,
      file_size: file.size,
      file_type: getFileTypeFromFile(file),
    })
    uploadFileList.value = []
  }
  catch (err: any) {
    notification.error({
      message: t('admin.homeworks.form.attachments.uploadFailed'),
      description: err?.message || err?.data?.message,
    })
  }
  finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

function handleFileChange(info: any) {
  const file = info.fileList[info.fileList.length - 1]?.originFileObj
  if (file && !uploading.value) {
    handleUploadFile(file)
  }
  uploadFileList.value = []
}

function removeAttachment(index: number) {
  attachments.value.splice(index, 1)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024)
    return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const formData = reactive({
  classroom_ids: [] as string[],
  title: '',
  description: '',
  due_date: null as dayjs.Dayjs | null,
  strict_deadline: false,
})

const rules: Record<string, Rule[]> = {
  classroom_ids: [
    { type: 'array', min: 1, message: t('admin.homeworks.form.classroomsRequired'), trigger: 'change' },
  ],
  title: [
    { required: true, message: t('admin.homeworks.form.titleRequired'), trigger: 'blur' },
    { max: 255, message: t('admin.homeworks.form.titleMaxLength'), trigger: 'blur' },
  ],
  description: [
    { required: true, message: t('admin.homeworks.form.descriptionRequired'), trigger: 'blur' },
  ],
  due_date: [
    { required: true, message: t('admin.homeworks.form.dueDateRequired'), trigger: 'change' },
  ],
}

async function loadClassrooms() {
  try {
    const response = await getClassroomsByCourse(courseId.value)
    classrooms.value = response || []
  }
  catch (err) {
    console.error('Error loading classrooms:', err)
    notification.error({ message: t('admin.homeworks.messages.loadClassroomsError') })
  }
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
    if (!formData.due_date) {
      notification.error({ message: t('admin.homeworks.form.dueDateRequired') })
      return
    }

    loading.value = true
    error.value = null

    const payload: CreateHomeworkPayload = {
      classroom_ids: formData.classroom_ids,
      title: formData.title.trim(),
      description: formData.description.trim(),
      due_date: dayjs.tz(formData.due_date.format('YYYY-MM-DD HH:mm'), 'Asia/Ho_Chi_Minh').format('YYYY-MM-DDTHH:mm:ssZ'),
      strict_deadline: formData.strict_deadline,
    }
    if (attachments.value.length > 0) {
      payload.attachments = attachments.value.map(a => ({
        file_url: a.file_url,
        file_name: a.file_name,
        file_size: a.file_size,
        file_type: a.file_type,
      }))
    }

    await createHomework(payload)
    notification.success({ message: t('admin.homeworks.messages.createSuccess') })
    router.push(`/admin/courses/${courseId.value}/homeworks`)
  }
  catch (err: any) {
    if (err?.errorFields) {
      return
    }
    error.value = err?.message || t('admin.homeworks.messages.createError')
    notification.error({ message: error.value })
    console.error('Error creating homework:', err)
  }
  finally {
    loading.value = false
  }
}

function handleBack() {
  router.push(`/admin/courses/${courseId.value}/homeworks`)
}

function handleAssignAllChange(checked: boolean) {
  if (checked) {
    formData.classroom_ids = classrooms.value.map(c => c.id)
  }
  else {
    formData.classroom_ids = []
  }
  nextTick(() => formRef.value?.clearValidate('classroom_ids'))
}

// Chỉ sync checkbox từ select, KHÔNG gọi handleAssignAllChange khi user thay đổi select thủ công
watch(() => formData.classroom_ids, (ids) => {
  assignAllClassrooms.value = classrooms.value.length > 0 && ids.length === classrooms.value.length
}, { deep: true, immediate: true })

onMounted(() => {
  loadClassrooms()
})

useHead({
  title: () => `${t('admin.homeworks.form.createTitle')} - E-Learning`,
})
</script>

<template>
  <div class="py-6 px-4 sm:px-6">
    <div class="w-full max-w-4xl mx-auto space-y-6">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center gap-4 mb-4">
          <div class="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg shadow">
            <Icon name="solar:document-text-bold" size="22" class="text-white" />
          </div>
          <div class="flex-1">
            <h2 class="text-xl font-bold text-gray-900">
              {{ $t('admin.homeworks.form.createTitle') }}
            </h2>
            <p class="text-gray-600 mt-1 text-sm">
              {{ $t('admin.homeworks.form.createDescription') }}
            </p>
          </div>
          <a-button class="!flex !justify-center !items-center !gap-1" @click="handleBack">
            <Icon name="solar:arrow-left-bold" size="18" />
            {{ $t('admin.homeworks.form.back') }}
          </a-button>
        </div>
      </div>

      <!-- Error -->
      <a-alert
        v-if="error"
        type="error"
        :message="error"
        show-icon
        closable
        class="mb-4"
      />

      <!-- Form -->
      <a-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        layout="vertical"
        class="bg-white rounded-xl border border-gray-200 shadow-sm !px-6 !py-6 sm:!px-8 sm:!py-8"
      >
        <!-- Classrooms (only from this course) -->
        <a-form-item
          :label="$t('admin.homeworks.form.classrooms')"
          name="classroom_ids"
        >
          <div class="space-y-3">
            <a-checkbox
              :checked="assignAllClassrooms"
              @update:checked="(v: boolean) => { handleAssignAllChange(v); assignAllClassrooms = v }"
            >
              {{ $t('admin.homeworks.form.assignAllClassrooms') }}
            </a-checkbox>
            <a-select
              v-model:value="formData.classroom_ids"
              mode="multiple"
              :placeholder="$t('admin.homeworks.form.classroomsPlaceholder')"
              size="large"
              class="w-full"
            >
              <a-select-option
                v-for="classroom in classrooms"
                :key="classroom.id"
                :value="classroom.id"
              >
                {{ classroom.title }}
              </a-select-option>
            </a-select>
          </div>
          <template #extra>
            <span class="text-gray-500 text-sm">{{ $t('admin.homeworks.form.classroomsHint') }}</span>
          </template>
        </a-form-item>

        <!-- Title -->
        <a-form-item
          :label="$t('admin.homeworks.form.title')"
          name="title"
        >
          <a-input
            v-model:value="formData.title"
            :placeholder="$t('admin.homeworks.form.titlePlaceholder')"
            size="large"
            :maxlength="255"
            show-count
          />
        </a-form-item>

        <!-- Description -->
        <a-form-item
          :label="$t('admin.homeworks.form.description')"
          name="description"
        >
          <a-textarea
            v-model:value="formData.description"
            :placeholder="$t('admin.homeworks.form.descriptionPlaceholder')"
            :rows="6"
            size="large"
          />
        </a-form-item>

        <!-- Due Date -->
        <a-form-item
          :label="$t('admin.homeworks.form.dueDate')"
          name="due_date"
        >
          <a-date-picker
            v-model:value="formData.due_date"
            show-time
            format="DD/MM/YYYY HH:mm"
            :placeholder="$t('admin.homeworks.form.dueDatePlaceholder')"
            size="large"
            class="w-full"
            :show-now="false"
          />
          <template #extra>
            <span class="text-gray-500 text-sm">{{ $t('admin.homeworks.form.dueDateHint') }}</span>
          </template>
        </a-form-item>

        <!-- Strict Deadline -->
        <a-form-item name="strict_deadline">
          <a-checkbox v-model:checked="formData.strict_deadline">
            {{ $t('admin.homeworks.form.strictDeadline') }}
          </a-checkbox>
          <template #extra>
            <span class="text-gray-500 text-sm">{{ $t('admin.homeworks.form.strictDeadlineHint') }}</span>
          </template>
        </a-form-item>

        <!-- Attachments -->
        <a-form-item :label="$t('admin.homeworks.form.attachments.label')">
          <div class="space-y-3">
            <a-upload-dragger
              :before-upload="beforeUpload"
              :file-list="uploadFileList"
              :max-count="1"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.png,.jpg,.jpeg,.gif,.webp"
              @change="handleFileChange"
            >
              <p class="ant-upload-drag-icon">
                <Icon name="solar:cloud-upload-bold-duotone" size="40" class="text-amber-500" />
              </p>
              <p class="ant-upload-text">
                {{ $t('admin.homeworks.form.attachments.uploadHint') }}
              </p>
              <p class="ant-upload-hint">
                {{ $t('admin.homeworks.form.attachments.uploadDesc') }}
              </p>
            </a-upload-dragger>
            <div v-if="uploading" class="flex items-center gap-2 text-sm text-gray-600">
              <a-progress :percent="uploadProgress" size="small" class="flex-1 max-w-xs" />
            </div>
            <div v-if="attachments.length > 0" class="space-y-2">
              <div
                v-for="(att, idx) in attachments"
                :key="idx"
                class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <Icon name="solar:document-bold-duotone" size="20" class="text-gray-500 shrink-0" />
                  <div class="min-w-0">
                    <a
                      v-if="att.file_url"
                      :href="att.file_url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="font-medium text-gray-900 truncate block hover:text-amber-600"
                    >
                      {{ att.file_name }}
                    </a>
                    <p v-else class="font-medium text-gray-900 truncate">
                      {{ att.file_name }}
                    </p>
                    <p class="text-xs text-gray-500">
                      {{ formatFileSize(att.file_size) }}
                    </p>
                  </div>
                </div>
                <a-button type="text" danger size="small" @click="removeAttachment(idx)">
                  <Icon name="solar:trash-bin-trash-bold" size="18" />
                </a-button>
              </div>
            </div>
          </div>
          <template #extra>
            <span class="text-gray-500 text-sm">{{ $t('admin.homeworks.form.attachments.extra') }}</span>
          </template>
        </a-form-item>

        <!-- Submit -->
        <a-form-item>
          <div class="flex gap-2">
            <a-button
              type="primary"
              size="middle"
              :loading="loading"
              class="!flex !items-center !gap-1.5"
              @click="handleSubmit"
            >
              <Icon name="solar:check-circle-bold" size="16" />
              {{ $t('admin.homeworks.form.submit') }}
            </a-button>
            <a-button size="middle" class="!flex !items-center" @click="handleBack">
              {{ $t('admin.homeworks.form.cancel') }}
            </a-button>
          </div>
        </a-form-item>
      </a-form>
    </div>
  </div>
</template>
