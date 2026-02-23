<script setup lang="ts">
import type { EssayGrading, RecentSubmission } from '~/composables/api/useQuizApi'
import type { Classroom } from '~/types/course.type'
import { useClassroomApi } from '~/composables/api/useClassroomApi'
import { useQuizApi } from '~/composables/api/useQuizApi'

definePageMeta({
  layout: 'admin',
})

const { t } = useI18n()

// API composables
const { getRecentSubmissions, getEssayGradingsNeedingGrading } = useQuizApi()
const { getClassrooms } = useClassroomApi()

// State
const recentSubmissions = ref<RecentSubmission[]>([])
const pendingEssays = ref<EssayGrading[]>([])
const needsGradingSubmissions = ref<EssayGrading[]>([])
const classrooms = ref<Classroom[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Filters
const selectedClassroom = ref<string>('')
const showNeedsGrading = ref(false)

// Computed
const filteredSubmissions = computed(() => {
  let filtered = recentSubmissions.value

  if (selectedClassroom.value) {
    // Filter by classroom if needed (already handled by API)
  }

  if (showNeedsGrading.value) {
    filtered = filtered.filter(s => s.has_pending_essays)
  }

  return filtered
})

const _pendingEssaysCount = computed(() => pendingEssays.value.length)

// Check if submission needs grading
function needsGrading(submission: RecentSubmission): boolean {
  return submission.has_pending_essays || false
}

// Get grading link for a submission
function getGradingLink(submission: RecentSubmission): string | null {
  if (!needsGrading(submission))
    return null

  // Find the essay grading ID from pendingEssays by matching attempt_id
  // RecentSubmission.id should be the attempt_id
  const essayGrading = pendingEssays.value.find(e =>
    e.attempt_id === submission.id
    || (e.quiz_title === submission.quiz_title
      && e.student_name === submission.student_name),
  )

  return essayGrading ? `/admin/quiz-management/essay-grading-teacher/${essayGrading.id}` : null
}

// Methods
async function loadRecentSubmissions() {
  try {
    loading.value = true
    error.value = null

    const params: any = {}
    if (selectedClassroom.value) {
      params.classroom_id = selectedClassroom.value
    }
    // Remove needs_grading filter to show all submissions

    const response = await getRecentSubmissions(params)
    recentSubmissions.value = response.results
  }
  catch (err: any) {
    error.value = err.message || t('admin.quizManagement.errors.loadSubmissions')
    console.error('Error loading recent submissions:', err)
  }
  finally {
    loading.value = false
  }
}

async function loadPendingEssays() {
  try {
    const response = await getEssayGradingsNeedingGrading(selectedClassroom.value || undefined)
    pendingEssays.value = response.results
  }
  catch (err: any) {
    console.error('Error loading pending essays:', err)
  }
}

async function loadNeedsGradingSubmissions() {
  try {
    const response = await getEssayGradingsNeedingGrading(selectedClassroom.value || undefined)
    needsGradingSubmissions.value = response.results
  }
  catch (err: any) {
    console.error('Error loading needs grading submissions:', err)
  }
}

async function loadClassrooms() {
  try {
    const response = await getClassrooms()
    classrooms.value = response.results || []
  }
  catch (err: any) {
    console.error('Error loading classrooms:', err)
  }
}

function handleClassroomChange() {
  loadRecentSubmissions()
  loadPendingEssays()
  loadNeedsGradingSubmissions()
}

function handleNeedsGradingToggle() {
  loadRecentSubmissions()
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

function getStatusBadge(status: string) {
  const statusMap: Record<string, { labelKey: string, color: string }> = {
    completed: { labelKey: 'admin.quizManagement.status.completed', color: 'bg-green-100 text-green-800' },
    in_progress: { labelKey: 'admin.quizManagement.status.inProgress', color: 'bg-blue-100 text-blue-800' },
    expired: { labelKey: 'admin.quizManagement.status.expired', color: 'bg-gray-100 text-gray-800' },
  }
  const entry = statusMap[status] || { labelKey: '', color: 'bg-gray-100 text-gray-800' }
  return { label: entry.labelKey ? t(entry.labelKey) : status, color: entry.color }
}

function formatScore(submission: RecentSubmission) {
  if (submission.status === 'completed') {
    return `${submission.total_score}/${submission.max_score}`
  }
  return '-'
}

// Removed unused functions

// Lifecycle
onMounted(async () => {
  await Promise.all([
    loadClassrooms(),
    loadRecentSubmissions(),
    loadPendingEssays(),
    loadNeedsGradingSubmissions(),
  ])
})
</script>

<template>
  <div class="p-4 sm:p-6 max-md:px-0">
    <!-- Header -->
    <div class="mb-4 sm:mb-6">
      <h1 class="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
        {{ $t('admin.quizManagement.title') }}
      </h1>
      <p class="text-sm sm:text-base text-gray-600">
        {{ $t('admin.quizManagement.description') }}
      </p>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow-sm border p-3 mb-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 items-end">
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1.5">{{ $t('admin.quizManagement.filters.classroom') }}</label>
          <a-select
            v-model:value="selectedClassroom"
            :placeholder="$t('admin.quizManagement.filters.selectClassroom')"
            class="w-full"
            size="small"
            @change="handleClassroomChange"
          >
            <a-select-option value="">
              {{ $t('admin.quizManagement.filters.allClassrooms') }}
            </a-select-option>
            <a-select-option
              v-for="classroom in classrooms"
              :key="classroom.id"
              :value="classroom.id"
            >
              {{ classroom.title }}
            </a-select-option>
          </a-select>
        </div>

        <div class="flex items-center">
          <a-checkbox v-model:checked="showNeedsGrading" class="text-xs" @change="handleNeedsGradingToggle">
            {{ $t('admin.quizManagement.filters.onlyNeedsGrading') }}
          </a-checkbox>
        </div>

        <div class="flex items-center sm:col-span-2 lg:col-span-1">
          <a-button type="primary" :loading="loading" size="small" class="w-full sm:w-auto text-xs" @click="loadRecentSubmissions">
            {{ $t('admin.quizManagement.filters.refresh') }}
          </a-button>
        </div>
      </div>
    </div>

    <!-- Submissions Table -->
    <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div class="p-4 sm:p-6 border-b border-gray-200">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 class="text-base sm:text-lg font-semibold text-gray-900">
            {{ $t('admin.quizManagement.table.title') }}
          </h3>
          <div class="flex items-center gap-2">
            <span class="text-xs sm:text-sm text-gray-500">
              {{ $t('admin.quizManagement.table.total', { count: filteredSubmissions.length }) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="p-4 sm:p-6">
        <div class="flex items-center justify-center py-6 sm:py-8">
          <div class="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600" />
          <span class="ml-2 text-sm sm:text-base text-gray-600">{{ $t('admin.quizManagement.table.loading') }}</span>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="p-4 sm:p-6">
        <div class="text-center py-6 sm:py-8">
          <Icon name="tabler:alert-circle" class="text-red-500 text-3xl sm:text-4xl mx-auto mb-4" />
          <p class="text-sm sm:text-base text-red-600">
            {{ error }}
          </p>
          <a-button type="primary" class="mt-4 text-xs sm:text-sm" @click="loadRecentSubmissions">
            {{ $t('admin.quizManagement.table.retry') }}
          </a-button>
        </div>
      </div>

      <!-- Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                {{ $t('admin.quizManagement.table.student') }}
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                {{ $t('admin.quizManagement.table.quiz') }}
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                {{ $t('admin.quizManagement.table.status') }}
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                {{ $t('admin.quizManagement.table.score') }}
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                {{ $t('admin.quizManagement.table.date') }}
              </th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                {{ $t('admin.quizManagement.table.actions') }}
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="submission in filteredSubmissions"
              :key="submission.id"
              class="hover:bg-gray-50 transition-colors"
            >
              <!-- Student Name -->
              <td class="px-4 py-3 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ submission.student_name }}
                </div>
              </td>

              <!-- Quiz Title -->
              <td class="px-4 py-3">
                <div class="text-sm text-gray-900">
                  {{ submission.quiz_title }}
                </div>
              </td>

              <!-- Status -->
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full"
                  :class="getStatusBadge(submission.status).color"
                >
                  {{ getStatusBadge(submission.status).label }}
                </span>
                <span
                  v-if="needsGrading(submission)"
                  class="ml-2 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800"
                >
                  {{ $t('admin.quizManagement.status.needsGrading') }}
                </span>
              </td>

              <!-- Score -->
              <td class="px-4 py-3 whitespace-nowrap">
                <div class="text-sm text-gray-900">
                  {{ formatScore(submission) }}
                </div>
              </td>

              <!-- Date -->
              <td class="px-4 py-3 whitespace-nowrap">
                <div class="text-sm text-gray-500">
                  {{ formatDate(submission.started_at) }}
                </div>
              </td>

              <!-- Actions -->
              <td class="px-4 py-3 whitespace-nowrap text-center">
                <div class="flex items-center justify-center gap-2">
                  <NuxtLink
                    v-if="getGradingLink(submission)"
                    :to="getGradingLink(submission)!"
                  >
                    <a-button type="primary" size="small" class="text-xs">
                      <template #icon>
                        <Icon name="tabler:edit" class="text-sm" />
                      </template>
                      {{ $t('admin.quizManagement.table.grade') }}
                    </a-button>
                  </NuxtLink>
                  <NuxtLink
                    v-else
                    :to="`/admin/quiz-management/submission/${submission.id}`"
                  >
                    <a-button type="default" size="small" class="text-xs">
                      <template #icon>
                        <Icon name="tabler:eye" class="text-sm" />
                      </template>
                      {{ $t('admin.quizManagement.table.view') }}
                    </a-button>
                  </NuxtLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div v-if="filteredSubmissions.length === 0" class="p-4 sm:p-6">
          <div class="text-center py-6 sm:py-8">
            <Icon name="tabler:file-text" class="text-gray-400 text-3xl sm:text-4xl mx-auto mb-4" />
            <p class="text-sm sm:text-base text-gray-500">
              {{ showNeedsGrading ? $t('admin.quizManagement.empty.noSubmissionsNeedsGrading') : $t('admin.quizManagement.empty.noSubmissions') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
