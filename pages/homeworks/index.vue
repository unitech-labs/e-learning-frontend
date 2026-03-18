<script setup lang="ts">
import type { StudentHomework } from '~/composables/api/useHomeworkApi'
import type { EnrolledCourse } from '~/types/course.type'
import { notification } from 'ant-design-vue'
import { useCourseApi } from '~/composables/api/useCourseApi'
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

const { t } = useI18n()
const router = useRouter()
const { getStudentHomeworks, getStudentHomeworkCount } = useHomeworkApi()
const { getCourseEnrolled } = useCourseApi()

const loading = ref(false)
const loadingMore = ref(false)
const homeworks = ref<StudentHomework[]>([])
const totalCount = ref(0)
const currentPage = ref(1)
const pageSize = ref(12)
const selectedCourseId = ref<string>('')
const activeTab = ref<string>('all')
const enrolledCourses = ref<EnrolledCourse[]>([])
const countStats = ref<{
  total: number
  pending: number
  submitted: number
  graded: number
  overdue: number
} | null>(null)

const tabs = computed(() => [
  { key: 'all', label: t('homeworks.stats.total'), count: countStats.value?.total ?? 0, color: 'text-gray-700', bg: 'bg-gray-100' },
  { key: 'pending', label: t('homeworks.stats.pending'), count: countStats.value?.pending ?? 0, color: 'text-slate-700', bg: 'bg-slate-100' },
  { key: 'submitted', label: t('homeworks.stats.submitted'), count: countStats.value?.submitted ?? 0, color: 'text-blue-700', bg: 'bg-blue-50' },
  { key: 'graded', label: t('homeworks.stats.graded'), count: countStats.value?.graded ?? 0, color: 'text-green-700', bg: 'bg-green-50' },
  { key: 'overdue', label: t('homeworks.stats.overdue'), count: countStats.value?.overdue ?? 0, color: 'text-red-700', bg: 'bg-red-50' },
])

const filteredHomeworks = computed(() => {
  if (activeTab.value === 'all')
    return homeworks.value
  return homeworks.value.filter((hw) => {
    const status = getStatusType(hw)
    return status === activeTab.value
  })
})

async function loadEnrolledCourses() {
  try {
    const response = await getCourseEnrolled()
    enrolledCourses.value = response?.results || []
  }
  catch (error) {
    console.error('Error loading enrolled courses:', error)
  }
}

async function loadHomeworks(append = false) {
  try {
    if (append) {
      loadingMore.value = true
    }
    else {
      loading.value = true
    }
    const params: Record<string, any> = {
      page: currentPage.value,
      page_size: pageSize.value,
    }
    if (selectedCourseId.value)
      params.course_id = selectedCourseId.value

    const response = await getStudentHomeworks(params)
    const results = response.results || []
    totalCount.value = response.count || 0

    if (append) {
      homeworks.value = [...homeworks.value, ...results]
    }
    else {
      homeworks.value = results
    }
  }
  catch (error) {
    console.error('Error loading homeworks:', error)
    notification.error({ message: t('homeworks.messages.loadError') })
  }
  finally {
    loading.value = false
    loadingMore.value = false
  }
}

const hasMore = computed(() => homeworks.value.length < totalCount.value)

function handleLoadMore() {
  if (loadingMore.value || !hasMore.value)
    return
  currentPage.value += 1
  loadHomeworks(true)
}

async function loadCountStats() {
  try {
    const params: Record<string, string> = {}
    if (selectedCourseId.value)
      params.course_id = selectedCourseId.value

    countStats.value = await getStudentHomeworkCount(params)
  }
  catch (error) {
    console.error('Error loading homework count:', error)
  }
}

function formatDateShort(dateString: string) {
  return formatHomeworkDueDate(dateString)
}

function getStatusType(homework: StudentHomework): 'pending' | 'submitted' | 'graded' | 'overdue' {
  if (homework.my_submission) {
    return homework.my_submission.status === 'graded' ? 'graded' : 'submitted'
  }
  return isHomeworkOverdue(homework.due_date) ? 'overdue' : 'pending'
}

function getStatusConfig(status: string) {
  const configs: Record<string, { dot: string, text: string, bg: string }> = {
    pending: { dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-100' },
    submitted: { dot: 'bg-green-400', text: 'text-green-700', bg: 'bg-green-50' },
    graded: { dot: 'bg-green-400', text: 'text-green-700', bg: 'bg-green-50' },
    overdue: { dot: 'bg-red-400', text: 'text-red-700', bg: 'bg-red-50' },
  }
  return configs[status] || configs.pending
}

function handleViewDetail(homework: StudentHomework) {
  router.push(`/homeworks/${homework.id}`)
}

function handleRefresh() {
  currentPage.value = 1
  loadHomeworks(false)
  loadCountStats()
  notification.success({ message: t('homeworks.messages.refreshSuccess') })
}

watch([selectedCourseId], () => {
  currentPage.value = 1
  loadHomeworks(false)
  loadCountStats()
})

onMounted(async () => {
  await loadEnrolledCourses()
  await Promise.all([loadHomeworks(false), loadCountStats()])
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20 lg:pb-8">
    <div class="mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">
            {{ $t('homeworks.title') }}
          </h1>
          <p class="text-gray-500 mt-0.5 text-sm">
            {{ $t('homeworks.description') }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <a-select
            v-model:value="selectedCourseId"
            :placeholder="$t('homeworks.filters.selectCourse')"
            allow-clear
            class="!w-[180px]"
            size="small"
          >
            <a-select-option value="">
              {{ $t('homeworks.filters.allCourses') }}
            </a-select-option>
            <a-select-option
              v-for="course in enrolledCourses"
              :key="course.id"
              :value="course.id"
            >
              {{ course.title }}
            </a-select-option>
          </a-select>
          <button
            class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            @click="handleRefresh"
          >
            <Icon name="solar:refresh-bold" size="18" />
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
          :class="activeTab === tab.key
            ? `${tab.bg} ${tab.color}`
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
          <span
            class="text-xs tabular-nums px-1.5 py-0.5 rounded-full"
            :class="activeTab === tab.key ? 'bg-white/60' : 'bg-gray-100'"
          >
            {{ tab.count }}
          </span>
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 4" :key="i" class="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 bg-gray-100 rounded-lg shrink-0" />
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-gray-100 rounded w-1/3" />
              <div class="h-3 bg-gray-100 rounded w-2/3" />
              <div class="h-3 bg-gray-100 rounded w-1/4" />
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="filteredHomeworks.length === 0" class="py-16 text-center">
        <div class="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
          <Icon name="solar:document-text-bold" size="28" class="text-gray-400" />
        </div>
        <h3 class="text-base font-semibold text-gray-900 mb-1">
          {{ $t('homeworks.emptyState.title') }}
        </h3>
        <p class="text-sm text-gray-500">
          {{ $t('homeworks.emptyState.description') }}
        </p>
      </div>

      <!-- Homework list -->
      <div v-else class="space-y-3">
        <div
          v-for="hw in filteredHomeworks"
          :key="hw.id"
          class="group bg-white shadow-xs rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer"
          @click="handleViewDetail(hw)"
        >
          <div class="p-4 sm:p-5">
            <div class="flex items-start gap-3 sm:gap-4">
              <!-- Left status indicator -->
              <div
                class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                :class="getStatusConfig(getStatusType(hw)).bg"
              >
                <Icon
                  :name="hw.my_submission ? 'solar:check-circle-bold' : getStatusType(hw) === 'overdue' ? 'solar:alarm-bold' : 'solar:document-text-bold'"
                  size="20"
                  :class="getStatusConfig(getStatusType(hw)).text"
                />
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <h3 class="font-semibold text-gray-900 truncate text-[15px] group-hover:text-blue-600 transition-colors">
                      {{ hw.title }}
                    </h3>
                    <p class="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Icon name="solar:book-2-bold" size="12" />
                      {{ hw.classroom.course.title }}
                    </p>
                  </div>
                  <!-- Status badge -->
                  <span
                    class="shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                    :class="`${getStatusConfig(getStatusType(hw)).bg} ${getStatusConfig(getStatusType(hw)).text}`"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :class="getStatusConfig(getStatusType(hw)).dot" />
                    {{ $t(`homeworks.status.${getStatusType(hw)}`) }}
                  </span>
                </div>

                <!-- Meta row -->
                <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-xs text-gray-400">
                  <span class="flex items-center gap-1">
                    <Icon name="solar:users-group-rounded-bold" size="13" />
                    {{ hw.classroom.title }}
                  </span>
                  <span class="flex items-center gap-1">
                    <Icon name="solar:calendar-bold" size="13" />
                    {{ formatDateShort(hw.due_date) }}
                  </span>
                  <span
                    v-if="!isHomeworkOverdue(hw.due_date) && !hw.my_submission && getHomeworkTimeRemaining(hw.due_date)"
                    class="flex items-center gap-1 text-blue-500"
                  >
                    <Icon name="solar:clock-circle-bold" size="13" />
                    {{ getHomeworkTimeRemaining(hw.due_date) }}
                  </span>
                  <span v-if="hw.strict_deadline" class="flex items-center gap-1 text-red-400">
                    <Icon name="solar:lock-bold" size="13" />
                    {{ $t('homeworks.strictDeadline') }}
                  </span>
                </div>

                <!-- Grade display -->
                <div
                  v-if="hw.my_submission?.status === 'graded' && hw.my_submission.grade != null"
                  class="mt-2.5 flex items-center gap-2"
                >
                  <div class="flex-1 max-w-[120px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all"
                      :class="hw.my_submission.grade >= 8 ? 'bg-green-400' : hw.my_submission.grade >= 5 ? 'bg-blue-400' : 'bg-red-400'"
                      :style="{ width: `${hw.my_submission.grade * 100}%` }"
                    />
                  </div>
                  <span class="text-xs font-semibold tabular-nums" :class="hw.my_submission.grade >= 8 ? 'text-green-600' : hw.my_submission.grade >= 5 ? 'text-blue-600' : 'text-red-600'">
                    {{ hw.my_submission.grade }}
                  </span>
                </div>
              </div>

              <!-- Arrow -->
              <Icon
                name="solar:arrow-right-linear"
                size="18"
                class="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0 mt-2 hidden sm:block"
              />
            </div>
          </div>
        </div>

        <!-- Load more -->
        <div v-if="hasMore && !loading" class="flex justify-center pt-6 pb-4">
          <button
            class="px-6 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center gap-2"
            :disabled="loadingMore"
            @click="handleLoadMore"
          >
            <Icon
              v-if="loadingMore"
              name="solar:refresh-bold"
              size="18"
              class="animate-spin"
            />
            <span>{{ loadingMore ? $t('homeworks.loadMore.loading') : $t('homeworks.loadMore.button') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
