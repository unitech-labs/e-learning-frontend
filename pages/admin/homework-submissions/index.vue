<script setup lang="ts">
import type { AdminHomeworkSubmission } from '~/composables/api/useHomeworkApi'
import type { Classroom } from '~/types/course.type'
import { useClassroomApi } from '~/composables/api/useClassroomApi'
import { useHomeworkApi } from '~/composables/api/useHomeworkApi'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
})

const { t } = useI18n()
const { getAdminHomeworkSubmissions, getAdminHomeworkSubmissionCount, getAdminHomeworks } = useHomeworkApi()
const { getClassrooms } = useClassroomApi()

const loading = ref(false)
const submissions = ref<AdminHomeworkSubmission[]>([])
const totalCount = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const selectedCourseId = ref<string>('')
const selectedClassroomId = ref<string>('')
const selectedHomeworkId = ref<string>('')
const statusFilter = ref<string>('')
const studentNameSearch = ref('')
const classrooms = ref<Classroom[]>([])
const courses = ref<{ id: string, title: string }[]>([])
const homeworks = ref<{ id: string, title: string }[]>([])
const countStats = ref<{ total: number, pending: number, graded: number } | null>(null)
const { refreshCount } = useAdminHomeworkSubmissionsCount({ enabled: true })

const filteredClassrooms = computed(() => {
  if (!selectedCourseId.value) return classrooms.value
  return classrooms.value.filter(c => c.course?.id === selectedCourseId.value)
})

async function loadClassrooms() {
  try {
    const res = await getClassrooms()
    classrooms.value = res?.results || []
    const courseMap = new Map<string, string>()
    classrooms.value.forEach((c) => {
      if (c.course?.id)
        courseMap.set(c.course.id, c.course.title)
    })
    courses.value = Array.from(courseMap.entries()).map(([id, title]) => ({ id, title }))
  }
  catch (e) {
    console.error('Load classrooms:', e)
  }
}

async function loadHomeworks() {
  try {
    const params: Record<string, any> = { page_size: 100 }
    if (selectedCourseId.value) params.course_id = selectedCourseId.value
    const res = await getAdminHomeworks(params)
    homeworks.value = (res.results || []).map(h => ({ id: h.id, title: h.title }))
  }
  catch {
    homeworks.value = []
  }
}

async function loadSubmissions() {
  try {
    loading.value = true
    const params: Record<string, any> = {
      page: currentPage.value,
      page_size: pageSize.value,
    }
    if (selectedCourseId.value) params.course_id = selectedCourseId.value
    if (selectedClassroomId.value) params.classroom_id = selectedClassroomId.value
    if (selectedHomeworkId.value) params.homework_id = selectedHomeworkId.value
    if (statusFilter.value) params.status = statusFilter.value
    if (studentNameSearch.value.trim()) params.student_name = studentNameSearch.value.trim()

    const res = await getAdminHomeworkSubmissions(params)
    submissions.value = res.results || []
    totalCount.value = res.count || 0
  }
  catch (e) {
    console.error('Load submissions:', e)
    submissions.value = []
    totalCount.value = 0
  }
  finally {
    loading.value = false
  }
}

async function loadCountStats() {
  try {
    const params: Record<string, string> = {}
    if (selectedCourseId.value) params.course_id = selectedCourseId.value
    if (selectedClassroomId.value) params.classroom_id = selectedClassroomId.value
    countStats.value = await getAdminHomeworkSubmissionCount(params)
  }
  catch {
    countStats.value = null
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

function getStatusConfig(status: string) {
  return status === 'graded'
    ? { color: 'text-green-600 bg-green-100', label: t('admin.homeworkSubmissions.status.graded') }
    : { color: 'text-amber-600 bg-amber-100', label: t('admin.homeworkSubmissions.status.pending') }
}

function handleRefresh() {
  currentPage.value = 1
  loadSubmissions()
  loadCountStats()
  refreshCount()
}

function handlePageChange(page: number, size: number) {
  currentPage.value = page
  pageSize.value = size
  loadSubmissions()
}

watch(selectedCourseId, () => {
  selectedClassroomId.value = ''
  selectedHomeworkId.value = ''
  currentPage.value = 1
  loadHomeworks()
  loadSubmissions()
  loadCountStats()
})

watch([selectedClassroomId, selectedHomeworkId, statusFilter], () => {
  currentPage.value = 1
  loadSubmissions()
  loadCountStats()
})

onMounted(async () => {
  await loadClassrooms()
  await loadHomeworks()
  await Promise.all([loadSubmissions(), loadCountStats()])
})
</script>

<template>
  <div class="py-4">
    <div class="mb-6">
      <h2 class="text-xl font-bold text-gray-900 flex items-center gap-3">
        <div class="size-10 flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
          <Icon name="solar:document-text-bold" size="22" class="text-white" />
        </div>
        {{ $t('admin.homeworkSubmissions.title') }}
      </h2>
      <p class="text-gray-600 mt-1 text-sm">
        {{ $t('admin.homeworkSubmissions.description') }}
      </p>
    </div>

    <!-- Stats + Filters -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div v-if="countStats" class="flex items-center gap-4 py-2 px-3 rounded-lg bg-white border border-gray-200">
        <div class="flex items-center gap-2">
          <Icon name="solar:inbox-bold" size="16" class="text-blue-600" />
          <span class="text-sm text-gray-600">{{ $t('admin.homeworkSubmissions.stats.total') }}:</span>
          <span class="text-sm font-semibold text-gray-900">{{ countStats.total }}</span>
        </div>
        <div class="w-px h-4 bg-gray-200" />
        <div class="flex items-center gap-2">
          <Icon name="solar:clock-circle-bold" size="16" class="text-amber-600" />
          <span class="text-sm text-gray-600">{{ $t('admin.homeworkSubmissions.stats.pending') }}:</span>
          <span class="text-sm font-semibold text-amber-600">{{ countStats.pending }}</span>
        </div>
        <div class="w-px h-4 bg-gray-200" />
        <div class="flex items-center gap-2">
          <Icon name="solar:check-circle-bold" size="16" class="text-green-600" />
          <span class="text-sm text-gray-600">{{ $t('admin.homeworkSubmissions.stats.graded') }}:</span>
          <span class="text-sm font-semibold text-green-600">{{ countStats.graded }}</span>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <a-select
          v-model:value="selectedCourseId"
          :placeholder="$t('admin.homeworks.filters.selectCourse')"
          allow-clear
          class="w-[180px]"
          size="small"
        >
          <a-select-option value="">{{ $t('admin.homeworks.filters.allCourses') }}</a-select-option>
          <a-select-option v-for="c in courses" :key="c.id" :value="c.id">{{ c.title }}</a-select-option>
        </a-select>
        <a-select
          v-model:value="selectedClassroomId"
          :placeholder="$t('admin.homeworks.filters.selectClassroom')"
          allow-clear
          class="w-[180px]"
          size="small"
        >
          <a-select-option value="">{{ $t('admin.homeworks.filters.allClassrooms') }}</a-select-option>
          <a-select-option v-for="c in filteredClassrooms" :key="c.id" :value="c.id">{{ c.title }}</a-select-option>
        </a-select>
        <a-select
          v-model:value="selectedHomeworkId"
          :placeholder="$t('admin.homeworkSubmissions.filters.homework')"
          allow-clear
          class="w-[200px]"
          size="small"
        >
          <a-select-option value="">{{ $t('admin.homeworkSubmissions.filters.allHomeworks') }}</a-select-option>
          <a-select-option v-for="h in homeworks" :key="h.id" :value="h.id">{{ h.title }}</a-select-option>
        </a-select>
        <a-select
          v-model:value="statusFilter"
          :placeholder="$t('admin.homeworkSubmissions.filters.status')"
          allow-clear
          class="w-[140px]"
          size="small"
        >
          <a-select-option value="">{{ $t('admin.homeworkSubmissions.filters.allStatus') }}</a-select-option>
          <a-select-option value="pending">{{ $t('admin.homeworkSubmissions.status.pending') }}</a-select-option>
          <a-select-option value="graded">{{ $t('admin.homeworkSubmissions.status.graded') }}</a-select-option>
        </a-select>
        <a-input
          v-model:value="studentNameSearch"
          :placeholder="$t('admin.homeworkSubmissions.filters.studentName')"
          class="!w-[140px]"
          size="small"
          allow-clear
          @press-enter="handleRefresh"
        >
          <template #prefix>
            <Icon name="solar:magnifer-linear" size="16" class="text-gray-400" />
          </template>
        </a-input>
        <a-button type="primary" size="small" :loading="loading" class="!flex !items-center" @click="handleRefresh">
          <Icon name="solar:refresh-bold" size="16" />
          {{ $t('admin.homeworks.actions.refresh') }}
        </a-button>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <a-table
        :columns="[
          { title: $t('admin.homeworkSubmissions.table.homework'), key: 'homework', width: 220 },
          { title: $t('admin.homeworkSubmissions.table.student'), key: 'student', width: 160 },
          { title: $t('admin.homeworkSubmissions.table.classroom'), key: 'classroom', width: 160 },
          { title: $t('admin.homeworkSubmissions.table.status'), key: 'status', width: 100 },
          { title: $t('admin.homeworkSubmissions.table.grade'), key: 'grade', width: 90 },
          { title: $t('admin.homeworkSubmissions.table.submittedAt'), key: 'submitted_at', width: 150 },
          { title: '', key: 'actions', width: 100, fixed: 'right' },
        ]"
        :data-source="submissions"
        :loading="loading"
        :pagination="{
          current: currentPage,
          pageSize,
          total: totalCount,
          showSizeChanger: true,
          showTotal: (total: number, range: [number, number]) => `${range[0]}-${range[1]} / ${total}`,
          onChange: handlePageChange,
        }"
        row-key="id"
        :scroll="{ x: 1000 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'homework'">
            <div class="font-medium text-gray-900 truncate max-w-[200px]" :title="record.homework?.title">
              {{ record.homework?.title || '-' }}
            </div>
          </template>
          <template v-else-if="column.key === 'student'">
            <div class="flex items-center gap-2">
              <a-avatar :size="32" :src="record.student?.avatar">
                {{ record.student?.full_name?.charAt(0) }}
              </a-avatar>
              <div>
                <div class="font-medium text-gray-900 text-sm">{{ record.student?.full_name || record.student?.username || '-' }}</div>
              </div>
            </div>
          </template>
          <template v-else-if="column.key === 'classroom'">
            <div class="text-gray-600 text-sm">{{ record.classroom?.title || '-' }}</div>
            <div class="text-xs text-gray-400">{{ record.classroom?.course?.title }}</div>
          </template>
          <template v-else-if="column.key === 'status'">
            <span
              class="px-2 py-0.5 rounded-full text-xs font-medium"
              :class="getStatusConfig(record.status).color"
            >
              {{ getStatusConfig(record.status).label }}
            </span>
          </template>
          <template v-else-if="column.key === 'grade'">
            <span v-if="record.grade != null" class="font-semibold" :class="record.grade >= 8 ? 'text-green-600' : record.grade >= 5 ? 'text-blue-600' : 'text-red-600'">
              {{ record.grade }}/10
            </span>
            <span v-else class="text-gray-400">-</span>
          </template>
          <template v-else-if="column.key === 'submitted_at'">
            <span class="text-gray-600 text-sm">{{ formatDate(record.submitted_at) }}</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <NuxtLink :to="`/admin/homework-submissions/${record.id}`">
              <a-button type="link" size="small">
                {{ $t('admin.homeworkSubmissions.actions.view') }}
              </a-button>
            </NuxtLink>
          </template>
        </template>
        <template #emptyText>
          <div class="py-12 text-center">
            <Icon name="solar:document-text-bold" size="48" class="text-gray-300 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 mb-2">{{ $t('admin.homeworkSubmissions.empty.title') }}</h3>
            <p class="text-gray-500">{{ $t('admin.homeworkSubmissions.empty.description') }}</p>
          </div>
        </template>
      </a-table>
    </div>
  </div>
</template>
