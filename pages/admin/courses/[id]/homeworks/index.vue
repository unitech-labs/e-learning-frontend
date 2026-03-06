<script setup lang="ts">
import type { TableColumnsType } from 'ant-design-vue'
import type { AdminHomework, HomeworkClassroom } from '~/composables/api/useHomeworkApi'
import type { Classroom } from '~/types/course.type'
import { Modal, notification } from 'ant-design-vue'
import { useClassroomApi } from '~/composables/api/useClassroomApi'
import { useCourseApi } from '~/composables/api/useCourseApi'
import { useHomeworkApi } from '~/composables/api/useHomeworkApi'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
})

const route = useRoute()
const router = useRouter()
const courseId = computed(() => route.params.id as string)

const { t } = useI18n()
const { getAdminHomeworks, deleteHomework } = useHomeworkApi()
const { getClassroomsByCourse } = useClassroomApi()
const { getDetailCourses } = useCourseApi()

const loading = ref(false)
const homeworks = ref<AdminHomework[]>([])
const totalCount = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const selectedClassroomId = ref<string>('')
const classrooms = ref<Classroom[]>([])
const courseDetail = ref<any>(null)

const stats = computed(() => ({
  total: totalCount.value,
  totalSubmissions: homeworks.value.reduce((sum, h) => sum + h.submission_count, 0),
  totalGraded: homeworks.value.reduce((sum, h) => sum + h.graded_count, 0),
}))

async function loadHomeworks() {
  try {
    loading.value = true
    const params: any = {
      page: currentPage.value,
      page_size: pageSize.value,
      course_id: courseId.value,
    }
    if (selectedClassroomId.value)
      params.classroom_id = selectedClassroomId.value

    const response = await getAdminHomeworks(params)
    homeworks.value = response.results || []
    totalCount.value = response.count || 0
  }
  catch (error) {
    console.error('Error loading homeworks:', error)
    notification.error({ message: t('admin.homeworks.messages.loadError') })
  }
  finally {
    loading.value = false
  }
}

async function loadClassrooms() {
  try {
    const response = await getClassroomsByCourse(courseId.value)
    classrooms.value = response || []
  }
  catch (error) {
    console.error('Error loading classrooms:', error)
  }
}

async function loadCourseDetail() {
  try {
    courseDetail.value = await getDetailCourses(courseId.value)
  }
  catch (error) {
    console.error('Error loading course:', error)
  }
}

function formatDateShort(dateString: string) {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function handleCreate() {
  router.push(`/admin/courses/${courseId.value}/homeworks/create`)
}

function handleEdit(homework: AdminHomework) {
  router.push(`/admin/courses/${courseId.value}/homeworks/${homework.id}/edit`)
}

function handleRefresh() {
  loadHomeworks()
  notification.success({ message: t('admin.homeworks.messages.refreshSuccess') })
}

async function handleDelete(homework: AdminHomework) {
  Modal.confirm({
    title: t('admin.homeworks.actions.deleteConfirm.title'),
    content: t('admin.homeworks.actions.deleteConfirm.message', { title: homework.title }),
    okText: t('admin.homeworks.actions.deleteConfirm.confirm'),
    cancelText: t('admin.homeworks.actions.deleteConfirm.cancel'),
    okType: 'danger',
    onOk: async () => {
      try {
        await deleteHomework(homework.id)
        notification.success({ message: t('admin.homeworks.messages.deleteSuccess', { title: homework.title }) })
        await loadHomeworks()
      }
      catch (error) {
        console.error('Error deleting homework:', error)
        notification.error({ message: t('admin.homeworks.messages.deleteError') })
      }
    },
  })
}

const columns = computed((): TableColumnsType<AdminHomework> => [
  {
    title: t('admin.homeworks.table.columns.title'),
    key: 'title',
    width: 280,
    fixed: 'left',
  },
  {
    title: t('admin.homeworks.table.columns.classrooms'),
    key: 'classrooms',
    width: 220,
  },
  {
    title: t('admin.homeworks.table.columns.dueDate'),
    key: 'due_date',
    width: 150,
  },
  {
    title: t('admin.homeworks.table.columns.submissions'),
    key: 'submission_count',
    width: 100,
  },
  {
    title: t('admin.homeworks.table.columns.graded'),
    key: 'graded_count',
    width: 100,
  },
  {
    title: t('admin.homeworks.table.columns.createdBy'),
    key: 'created_by',
    width: 150,
  },
  {
    title: t('admin.homeworks.table.columns.actions'),
    key: 'actions',
    width: 100,
    fixed: 'right',
  },
])

const paginationConfig = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: totalCount.value,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number, range: [number, number]) =>
    `${range[0]}-${range[1]} / ${total} ${t('admin.homeworks.table.totalItems')}`,
  onChange: (page: number, size: number) => {
    currentPage.value = page
    pageSize.value = size
  },
  onShowSizeChange: (_current: number, size: number) => {
    currentPage.value = 1
    pageSize.value = size
  },
}))

watch([selectedClassroomId], () => {
  currentPage.value = 1
  loadHomeworks()
})

onMounted(async () => {
  await Promise.all([loadClassrooms(), loadCourseDetail()])
  await loadHomeworks()
})
</script>

<template>
  <div class="py-4">
    <!-- Page Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-2 flex-wrap">
        <div>
          <h2 class="text-xl font-bold text-gray-900 flex items-center gap-3">
            <div class="size-10 flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
              <Icon name="solar:document-text-bold" size="22" class="text-white" />
            </div>
            {{ $t('admin.homeworks.title') }}
          </h2>
          <p class="text-gray-600 mt-1 text-sm">
            {{ $t('admin.homeworks.description') }}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <a-button
            type="primary"
            size="middle"
            class="!flex !items-center !justify-center !gap-1"
            @click="handleCreate"
          >
            <Icon name="solar:add-circle-bold" size="18" />
            {{ $t('admin.homeworks.actions.create') }}
          </a-button>
          <a-button
            class="rounded-lg gap-1 text-sm !font-semibold !flex !justify-center !items-center bg-green-700 border-green-700 text-white hover:bg-green-800 hover:border-green-800"
            @click="handleRefresh"
          >
            <Icon name="solar:refresh-bold" size="18" />
            {{ $t('admin.homeworks.actions.refresh') }}
          </a-button>
        </div>
      </div>
    </div>

    <!-- Stats + Filter (compact) -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="flex items-center gap-4 py-2 px-3 rounded-lg bg-white border border-gray-200">
        <div class="flex items-center gap-2">
          <Icon name="solar:document-text-bold" size="16" class="text-amber-600" />
          <span class="text-sm text-gray-600">{{ $t('admin.homeworks.stats.total') }}:</span>
          <span class="text-sm font-semibold text-gray-900">{{ stats.total }}</span>
        </div>
        <div class="w-px h-4 bg-gray-200" />
        <div class="flex items-center gap-2">
          <Icon name="solar:inbox-bold" size="16" class="text-blue-600" />
          <span class="text-sm text-gray-600">{{ $t('admin.homeworks.stats.submissions') }}:</span>
          <span class="text-sm font-semibold text-gray-900">{{ stats.totalSubmissions }}</span>
        </div>
        <div class="w-px h-4 bg-gray-200" />
        <div class="flex items-center gap-2">
          <Icon name="solar:check-circle-bold" size="16" class="text-green-600" />
          <span class="text-sm text-gray-600">{{ $t('admin.homeworks.stats.graded') }}:</span>
          <span class="text-sm font-semibold text-gray-900">{{ stats.totalGraded }}</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium text-gray-600 whitespace-nowrap">{{ $t('admin.homeworks.filters.classroom') }}:</span>
        <a-select
          v-model:value="selectedClassroomId"
          :placeholder="$t('admin.homeworks.filters.selectClassroom')"
          allow-clear
          class="w-[200px]"
          size="small"
        >
          <a-select-option value="">
            {{ $t('admin.homeworks.filters.allClassrooms') }}
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
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <a-table
        :columns="columns"
        :data-source="homeworks"
        :loading="loading"
        :pagination="paginationConfig"
        :scroll="{ x: 1100 }"
        row-key="id"
        class="custom-table"
      >
        <template #emptyText>
          <div class="py-12 text-center">
            <Icon name="solar:document-text-bold" size="48" class="text-gray-300 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 mb-2">
              {{ $t('admin.homeworks.table.emptyState.title') }}
            </h3>
            <p class="text-gray-500 mb-4">
              {{ $t('admin.homeworks.table.emptyState.description') }}
            </p>
            <a-button type="primary" @click="handleCreate">
              {{ $t('admin.homeworks.actions.create') }}
            </a-button>
          </div>
        </template>

        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'title'">
            <div class="font-medium text-gray-900 truncate max-w-[260px]" :title="record.title">
              {{ record.title }}
            </div>
            <div v-if="record.strict_deadline" class="text-xs text-amber-600 mt-0.5">
              {{ $t('admin.homeworks.table.strictDeadline') }}
            </div>
          </template>

          <template v-else-if="column.key === 'classrooms'">
            <a-tooltip
              v-if="record.classrooms.length > 2"
              :title="record.classrooms.map((c: HomeworkClassroom) => c.title).join(', ')"
            >
              <div class="flex flex-wrap gap-1 cursor-help">
                <a-tag
                  v-for="c in record.classrooms.slice(0, 2)"
                  :key="c.id"
                  size="small"
                >
                  {{ c.title }}
                </a-tag>
                <a-tag size="small" color="default">
                  +{{ record.classrooms.length - 2 }}
                </a-tag>
              </div>
            </a-tooltip>
            <div v-else class="flex flex-wrap gap-1">
              <a-tag
                v-for="c in record.classrooms"
                :key="c.id"
                size="small"
              >
                {{ c.title }}
              </a-tag>
            </div>
          </template>

          <template v-else-if="column.key === 'due_date'">
            <div class="text-gray-600">
              {{ formatDateShort(record.due_date) }}
            </div>
          </template>

          <template v-else-if="column.key === 'submission_count'">
            <span class="font-medium">{{ record.submission_count }}</span>
          </template>

          <template v-else-if="column.key === 'graded_count'">
            <span class="font-medium text-green-600">{{ record.graded_count }}</span>
          </template>

          <template v-else-if="column.key === 'created_by'">
            <div class="text-gray-600">
              {{ record.created_by?.full_name || record.created_by?.username || '-' }}
            </div>
          </template>

          <template v-else-if="column.key === 'actions'">
            <div class="flex items-center gap-1">
              <a-button
                type="text"
                size="small"
                class="!flex !items-center !justify-center !gap-1"
                @click="handleEdit(record)"
              >
                <Icon name="solar:pen-bold" size="16" />
              </a-button>
              <a-button
                type="text"
                danger
                size="small"
                class="!flex !items-center !justify-center !gap-1"
                @click="handleDelete(record)"
              >
                <Icon name="solar:trash-bin-trash-bold" size="16" />
              </a-button>
            </div>
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>

<style scoped>
.custom-table :deep(.ant-table-thead > tr > th) {
  background-color: #f9fafb;
  font-weight: 600;
  color: #374151;
}

.custom-table :deep(.ant-table-tbody > tr:hover > td) {
  background-color: #f9fafb;
}
</style>
