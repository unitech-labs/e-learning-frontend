<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue'
import type { Classroom } from '~/types/course.type'
import { Modal, notification } from 'ant-design-vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import CreateSessionsDialog from '~/components/admin/course/classroom/CreateSessionsDialog.vue'
import { useCourseApi } from '~/composables/api'
import { useClassroomApi } from '~/composables/api/useClassroomApi'

const router = useRouter()
const route = useRoute()
const courseId = computed(() => route.params.id as string)
const { getDetailCourses } = useCourseApi()

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
})

// State
const loading = ref(false)
const classrooms = ref<Classroom[]>([])
const courseDetail = ref<any>(null)
const openSessionsDialog = ref<boolean>(false)

// Format date
function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Format price
function formatPrice(price: string | null) {
  if (!price)
    return '-'
  return `€${Number.parseFloat(price).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Load classrooms
async function loadClassrooms() {
  try {
    loading.value = true
    const response = await getDetailCourses(courseId.value)
    courseDetail.value = response
    classrooms.value = response.classrooms || []
  }
  catch (err: any) {
    console.error('Error loading classrooms:', err)
    notification.error({
      message: 'Lỗi',
      description: err?.message || 'Không thể tải danh sách lớp học',
      duration: 5,
    })
  }
  finally {
    loading.value = false
  }
}

// Handle classroom creation success
async function handleClassroomCreated() {
  await loadClassrooms()
}

// Handle refresh
async function handleRefresh() {
  await loadClassrooms()
  notification.success({ message: 'Đã làm mới danh sách' })
}

// Handle view classroom detail
function handleViewClassroom(classroom: Classroom) {
  router.push(`/admin/courses/${courseId.value}/classrooms/${classroom.id}`)
}

// Handle delete classroom
async function handleDeleteClassroom(classroom: Classroom) {
  const { deleteClassroom } = useClassroomApi()
  Modal.confirm({
    title: 'Xác nhận xóa lớp học',
    content: `Bạn có chắc chắn muốn xóa lớp học "${classroom.title}" không?`,
    okText: 'Xóa',
    cancelText: 'Hủy',
    okType: 'danger',
    async onOk() {
      try {
        await deleteClassroom(classroom.id)
        notification.success({ message: 'Đã xóa lớp học thành công' })
        await loadClassrooms()
      }
      catch (error: any) {
        console.error('Error deleting classroom:', error)
        notification.error({
          message: 'Lỗi',
          description: error?.message || 'Không thể xóa lớp học',
          duration: 5,
        })
      }
    },
  })
}

// Table columns
const columns = computed((): TableColumnsType<Classroom> => [
  {
    title: 'Tên lớp học',
    key: 'title',
    width: 250,
    fixed: 'left',
  },
  {
    title: 'Số học viên',
    key: 'student_count',
    width: 120,
  },
  {
    title: 'Số buổi học',
    key: 'session_count',
    width: 120,
  },
  {
    title: 'Số học viên đã đăng ký',
    key: 'enrollment_count',
    width: 150,
  },
  {
    title: 'Giá',
    key: 'price',
    width: 150,
  },
  {
    title: 'Lịch học',
    key: 'schedule_summary',
    width: 200,
  },
  {
    title: 'Ngày tạo',
    key: 'created_at',
    width: 180,
    sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  },
  {
    title: 'Thao tác',
    key: 'actions',
    width: 150,
    fixed: 'right',
  },
])

onMounted(() => {
  loadClassrooms()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 pt-0 pb-6">
    <!-- Page Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-2 flex-wrap">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div class="size-12 flex items-center justify-center bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
              <Icon name="solar:calendar-bold" size="28" class="text-white" />
            </div>
            Danh sách lớp học
          </h1>
          <p class="text-gray-600 mt-1">
            Quản lý tất cả các lớp học trong khóa học này
          </p>
        </div>
        <div class="flex items-center gap-3">
          <a-button
            class="rounded-lg gap-1 text-sm !font-semibold !flex !justify-center !items-center bg-green-700 border-green-700 text-white hover:bg-green-800 hover:border-green-800"
            @click="handleRefresh"
          >
            <Icon name="solar:refresh-bold" size="18" />
            Làm mới
          </a-button>
        </div>
      </div>
    </div>

    <!-- Classrooms Table -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <a-table
        :columns="columns"
        :data-source="classrooms"
        :loading="loading"
        :scroll="{ x: 1200 }"
        row-key="id"
        class="custom-table"
      >
        <!-- Empty State -->
        <template #emptyText>
          <div class="py-12 text-center">
            <div class="mb-4">
              <Icon name="solar:calendar-bold" size="48" class="text-gray-300 mx-auto" />
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">
              Chưa có lớp học nào
            </h3>
            <p class="text-gray-500 mb-4">
              Hãy tạo lớp học đầu tiên để bắt đầu
            </p>
          </div>
        </template>

        <!-- Table Body Cells -->
        <template #bodyCell="{ column, record }">
          <!-- Title Column -->
          <template v-if="column.key === 'title'">
            <div class="font-medium text-gray-900">
              {{ record.title }}
            </div>
          </template>

          <!-- Student Count Column -->
          <template v-else-if="column.key === 'student_count'">
            <div class="text-gray-900">
              {{ record.student_count }}
            </div>
          </template>

          <!-- Session Count Column -->
          <template v-else-if="column.key === 'session_count'">
            <div class="text-gray-900">
              {{ record.session_count }}
            </div>
          </template>

          <!-- Enrollment Count Column -->
          <template v-else-if="column.key === 'enrollment_count'">
            <div class="text-gray-900">
              {{ record.enrollment_count }}
            </div>
          </template>

          <!-- Price Column -->
          <template v-else-if="column.key === 'price'">
            <div class="text-gray-900">
              <span v-if="record.is_free" class="text-green-600 font-semibold">{{ $t('admin.classroom.card.free') }}</span>
              <span v-else>
                <span v-if="record.discount_price && Number.parseFloat(record.discount_price) < Number.parseFloat(record.price)">
                  <span class="line-through text-gray-400">{{ formatPrice(record.price) }}</span>
                  <span class="text-green-600 font-semibold ml-2">{{ formatPrice(record.discount_price) }}</span>
                </span>
                <span v-else>
                  {{ formatPrice(record.price) }}
                </span>
              </span>
            </div>
          </template>

          <!-- Schedule Summary Column -->
          <template v-else-if="column.key === 'schedule_summary'">
            <div class="text-gray-600">
              {{ record.schedule_summary || '-' }}
            </div>
          </template>

          <!-- Created At Column -->
          <template v-else-if="column.key === 'created_at'">
            <div class="text-gray-600">
              {{ formatDate(record.created_at) }}
            </div>
          </template>

          <!-- Actions Column -->
          <template v-else-if="column.key === 'actions'">
            <div class="flex items-center gap-2">
              <a-button
                type="text"
                size="small"
                class="!flex !items-center !justify-center !gap-1"
                @click="handleViewClassroom(record)"
              >
                <Icon name="solar:eye-bold" size="16" />
              </a-button>
              <a-button
                type="text"
                danger
                size="small"
                class="!flex !items-center !justify-center !gap-1"
                @click="handleDeleteClassroom(record)"
              >
                <Icon name="solar:trash-bin-trash-bold" size="16" />
              </a-button>
            </div>
          </template>
        </template>
      </a-table>
    </div>

    <CreateSessionsDialog
      v-model:open="openSessionsDialog"
      :course-id="courseId"
      :classrooms="(courseDetail?.classrooms || []) as Array<{ id: string; title: string }>"
      @success="handleClassroomCreated"
    />
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
