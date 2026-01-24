<script lang="ts" setup>
import type { Course } from '~/types/course.type'
import { notification } from 'ant-design-vue'
import { useClassroomApi } from '~/composables/api/useClassroomApi'
import { useCourseApi } from '~/composables/api/useCourseApi'
import { useGeneralSessionsApi } from '~/composables/api/useGeneralSessionsApi'

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  mode: 'create',
})
const emit = defineEmits<Emits>()
const { t } = useI18n()
const { createClassroom } = useClassroomApi()
const { getCourses, getDetailCourses } = useCourseApi()
const { bulkGenerateSessions } = useGeneralSessionsApi()

interface Props {
  open: boolean
  // When provided (course page), course is fixed and selector is hidden.
  courseId?: string
  loading?: boolean
  // create: legacy behavior (create only)
  // select_or_create: allow selecting existing classroom OR creating new classroom
  mode?: 'create' | 'select_or_create'
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'success'): void
  (e: 'selected', payload: { courseId: string, classroomId: string, classroomTitle?: string }): void
}

const confirmLoading = ref(false)
const formRef = ref()

// Select-or-create state
const isCreateNew = ref(true)
const coursesLoading = ref(false)
const courses = ref<Course[]>([])
const selectedCourseId = ref<string | null>(null)
const classroomsLoading = ref(false)
const classrooms = ref<Array<{ id: string, title: string }>>([])
const selectedClassroomId = ref<string | null>(null)
const bulkNumberOfSessions = ref<number | null>(null)

const daysOfWeek = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
]

// List of background colors (dark colors suitable for white text)
const BACKGROUND_COLORS = [
  '#268100', // Green (default)
  '#1e40af', // Blue
  '#7c3aed', // Purple
  '#c2410c', // Orange
  '#be123c', // Rose
  '#0891b2', // Cyan
  '#b45309', // Amber
  '#059669', // Emerald
  '#7c2d12', // Brown
  '#6b21a8', // Violet
  '#0c4a6e', // Sky
  '#831843', // Fuchsia
  '#1e3a8a', // Indigo
  '#92400e', // Yellow
  '#991b1b', // Red
]

const formState = ref({
  title: '',
  student_count: null as number | null,
  number_of_sessions: null as number | null,
  start_date: null as any,
  schedule: [
    { day: null, start: null, end: null },
  ],
  // Pricing fields
  price: null as number | null,
  discount_price: null as number | null,
  background_color: BACKGROUND_COLORS[0], // Default to first color
})

// Computed for dialog visibility
const dialogVisible = computed({
  get: () => props.open,
  set: (value: boolean) => {
    emit('update:open', value)
  },
})

const effectiveCourseId = computed(() => props.courseId || selectedCourseId.value)

async function fetchCourses() {
  try {
    coursesLoading.value = true
    const response = await getCourses({ limit: 200 })
    const list = response?.results || []
    courses.value = list.filter(c => c.course_type === 'course')
  }
  catch (err) {
    console.error('Error fetching courses:', err)
    courses.value = []
  }
  finally {
    coursesLoading.value = false
  }
}

async function fetchClassroomsOfCourse(courseId: string) {
  try {
    classroomsLoading.value = true
    const detail: any = await getDetailCourses(courseId)
    const cls = (detail?.classrooms || []) as Array<{ id: string, title: string }>
    classrooms.value = cls
  }
  catch (err) {
    console.error('Error fetching course classrooms:', err)
    classrooms.value = []
  }
  finally {
    classroomsLoading.value = false
  }
}

function addScheduleItem() {
  formState.value.schedule.push({ day: null, start: null, end: null })
}

function removeScheduleItem(index: number) {
  if (index > 0) {
    formState.value.schedule.splice(index, 1)
  }
}

// Format time for API
function formatTimeForApi(time: any): string {
  if (!time)
    return ''
  if (typeof time === 'string')
    return time
  if (time.format) {
    return time.format('HH:mm')
  }
  return time.toString()
}

// Validate price
function validatePrice(rule: any, value: any, callback: any) {
  if (!value || value <= 0) {
    callback(new Error('Giá cả là bắt buộc và phải lớn hơn 0'))
    return
  }

  callback()
}

// Validate discount price
function validateDiscountPrice(rule: any, value: any, callback: any) {
  if (!value) {
    // Discount price is optional
    callback()
    return
  }

  const price = formState.value.price || 0
  if (value >= price) {
    callback(new Error('Giá khuyến mãi phải nhỏ hơn giá gốc'))
    return
  }

  callback()
}

// Reset form
function resetForm() {
  formState.value = {
    title: '',
    student_count: null,
    number_of_sessions: null,
    start_date: null,
    schedule: [
      { day: null, start: null, end: null },
    ],
    // Reset pricing fields
    price: null,
    discount_price: null,
    background_color: BACKGROUND_COLORS[0],
  }
  // Reset form fields if formRef exists
  if (formRef.value) {
    try {
      formRef.value.resetFields()
    }
    catch (err) {
      // Ignore reset errors if form is not mounted
      console.warn('Form reset error:', err)
    }
  }
}

// Handle OK button
async function handleOk() {
  // Select existing classroom mode
  if (props.mode === 'select_or_create' && !isCreateNew.value) {
    const courseId = effectiveCourseId.value
    const classroomId = selectedClassroomId.value
    const classroomTitle = classrooms.value.find(c => c.id === classroomId)?.title

    if (!courseId) {
      notification.error({
        message: 'Vui lòng chọn khóa học',
        duration: 3,
      })
      return
    }
    if (!classroomId) {
      notification.error({
        message: 'Vui lòng chọn lớp học',
        duration: 3,
      })
      return
    }

    if (!bulkNumberOfSessions.value || bulkNumberOfSessions.value <= 0) {
      notification.error({
        message: 'Vui lòng nhập số buổi cần tạo',
        duration: 3,
      })
      return
    }

    try {
      confirmLoading.value = true
      const res = await bulkGenerateSessions({
        course_id: courseId,
        classroom_id: classroomId,
        number_of_sessions: Number(bulkNumberOfSessions.value),
      })

      notification.success({
        message: `Đã tạo thêm ${res?.created_count ?? bulkNumberOfSessions.value} buổi học`,
        duration: 3,
      })

      // Let parent reload if needed
      emit('success')

      dialogVisible.value = false
      await nextTick()
      resetForm()
      bulkNumberOfSessions.value = null

      emit('selected', { courseId, classroomId, classroomTitle })
      return
    }
    catch (err: any) {
      console.error('Error bulk generating sessions:', err)
      notification.error({
        message: 'Không thể tạo thêm buổi học',
        description: err?.message || err?.data?.detail || 'Vui lòng thử lại',
        duration: 5,
      })
      return
    }
    finally {
      confirmLoading.value = false
    }
  }

  try {
    await formRef.value?.validateFields()
    confirmLoading.value = true

    const courseId = effectiveCourseId.value
    if (!courseId) {
      notification.error({
        message: 'Vui lòng chọn khóa học',
        duration: 3,
      })
      return
    }

    // Transform form data to API format
    const classroomPayload: any = {
      course_id: courseId,
      title: formState.value.title,
      student_count: Number(formState.value.student_count),
      number_of_sessions: Number(formState.value.number_of_sessions),
      start_date: formState.value.start_date?.format
        ? formState.value.start_date.format('YYYY-MM-DD')
        : undefined,
      schedules_data: formState.value.schedule
        .filter(schedule => schedule.day && schedule.start && schedule.end)
        .map((schedule) => {
          const scheduleData = {
            day_of_week: schedule.day as unknown as string,
            start_time: formatTimeForApi(schedule.start),
            end_time: formatTimeForApi(schedule.end),
          }
          return scheduleData
        }),
      // Pricing fields
      price: formState.value.price?.toString() || '0',
      discount_price: formState.value.discount_price ? formState.value.discount_price.toString() : null,
      // Background color
      background_color: formState.value.background_color,
    }

    // Call API to create classroom
    // console.warn('Classroom payload (ready for backend):', JSON.stringify(classroomPayload, null, 2))
    const created: any = await createClassroom(classroomPayload)

    // Close modal first
    dialogVisible.value = false

    // Reset form after dialog closes to avoid formRef errors
    await nextTick()
    resetForm()

    // Emit success event
    emit('success')
    if (created?.id) {
      emit('selected', { courseId, classroomId: created.id, classroomTitle: created?.title })
    }

    // Show success message
    notification.success({
      message: t('admin.classroom.notifications.createSuccess') || 'Đã tạo lớp học thành công',
      duration: 3,
    })
  }
  catch (err: any) {
    console.error('Error creating classroom:', err)
    notification.error({
      message: t('admin.classroom.notifications.createFailed') || 'Có lỗi xảy ra khi tạo lớp học',
      description: err.message || err.detail || 'Vui lòng thử lại',
      duration: 5,
    })
  }
  finally {
    confirmLoading.value = false
  }
}

// Handle cancel
function handleCancel() {
  dialogVisible.value = false
  // Reset form after dialog closes
  nextTick(() => {
    resetForm()
  })
}

// Watch for dialog close to reset form
watch(() => props.open, (newValue) => {
  if (!newValue) {
    // reset select-or-create state
    isCreateNew.value = true
    selectedClassroomId.value = null
    bulkNumberOfSessions.value = null
    classrooms.value = []
    if (!props.courseId) {
      selectedCourseId.value = null
      courses.value = []
    }
    resetForm()
  }
})

watch(() => props.open, (newValue) => {
  if (newValue) {
    // Fetch courses if course is not fixed
    if (!props.courseId) {
      fetchCourses()
    }
    // If course is fixed (or already selected), prefetch classrooms for selection mode
    const cid = effectiveCourseId.value
    if (cid && props.mode === 'select_or_create') {
      fetchClassroomsOfCourse(cid)
    }
  }
})

watch(effectiveCourseId, (cid) => {
  selectedClassroomId.value = null
  classrooms.value = []
  if (cid && props.mode === 'select_or_create') {
    fetchClassroomsOfCourse(cid)
  }
})
</script>

<template>
  <a-modal
    v-model:open="dialogVisible"
    :title="$t('admin.classroom.form.title')"
    :confirm-loading="confirmLoading"
    :ok-text="props.mode === 'select_or_create' && !isCreateNew ? 'Tạo buổi' : undefined"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <div v-if="props.mode === 'select_or_create'" class="w-full mb-4 mt-6 flex items-center justify-between">
      <div class="text-sm font-medium text-gray-800">
        Tạo lớp mới
      </div>
      <a-switch v-model:checked="isCreateNew" />
    </div>

    <!-- Course selector (only when not fixed by prop) -->
    <div v-if="!props.courseId" class="w-full mb-4">
      <div class="text-sm font-medium text-gray-700 mb-2">
        Khóa học
      </div>
      <a-select
        v-model:value="selectedCourseId"
        size="large"
        class="w-full"
        placeholder="Chọn khóa học"
        show-search
        :loading="coursesLoading"
        :filter-option="(input: string, option: any) => (option?.label || '').toLowerCase().includes(input.toLowerCase())"
        :options="courses.map(c => ({ value: c.id, label: c.title }))"
      />
    </div>

    <!-- Select existing classroom -->
    <div v-if="props.mode === 'select_or_create' && !isCreateNew" class="w-full">
      <div class="text-sm text-gray-600 mb-3">
        Chọn lớp học có sẵn để tiếp tục.
      </div>
      <div class="text-sm font-medium text-gray-700 mb-2">
        Lớp học
      </div>
      <a-select
        v-model:value="selectedClassroomId"
        size="large"
        class="w-full"
        placeholder="Chọn lớp học"
        show-search
        :loading="classroomsLoading"
        :disabled="!effectiveCourseId"
        :filter-option="(input: string, option: any) => (option?.label || '').toLowerCase().includes(input.toLowerCase())"
        :options="classrooms.map(c => ({ value: c.id, label: c.title }))"
      />

      <div class="mt-4">
        <div class="text-sm font-medium text-gray-700 mb-2">
          Số buổi cần tạo
        </div>
        <a-input-number
          v-model:value="bulkNumberOfSessions"
          size="large"
          class="w-full"
          :min="1"
          placeholder="Ví dụ: 10"
        />
        <div class="text-xs text-gray-500 mt-1">
          Hệ thống sẽ tạo thêm số buổi này theo lịch (slot) của lớp.
        </div>
      </div>
    </div>

    <!-- Create new classroom (legacy form) -->
    <a-form
      v-else
      ref="formRef"
      :model="formState"
      name="basic"
      autocomplete="off"
      layout="vertical"
      class="flex items-start flex-col w-full"
    >
      <a-form-item
        :label="$t('admin.classroom.form.classroomTitle')"
        name="title"
        class="w-full"
        :rules="[{ required: true, message: t('admin.classroom.form.classroomTitleRequired') }]"
      >
        <a-input
          v-model:value="formState.title"
          size="large"
          :placeholder="$t('admin.classroom.form.classroomTitlePlaceholder')"
        />
      </a-form-item>

      <a-form-item
        :label="$t('admin.classroom.form.studentCount')"
        name="student_count"
        class="w-full"
        :rules="[
          { required: true, message: t('admin.classroom.form.studentCountRequired') },
          { type: 'number', min: 1, message: t('admin.classroom.form.studentCountMin') },
        ]"
      >
        <a-input-number
          v-model:value="formState.student_count"
          size="large"
          :placeholder="$t('admin.classroom.form.studentCountPlaceholder')"
          :min="1"
          class="w-full"
        />
      </a-form-item>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <a-form-item
          label="Ngày bắt đầu"
          name="start_date"
          class="w-full"
          :rules="[{ required: true, message: 'Vui lòng chọn ngày bắt đầu' }]"
        >
          <a-date-picker
            v-model:value="formState.start_date"
            size="large"
            placeholder="Chọn ngày bắt đầu"
            class="w-full"
            format="YYYY-MM-DD"
          />
        </a-form-item>

        <a-form-item
          label="Tổng số buổi học"
          name="number_of_sessions"
          class="w-full"
          :rules="[
            { required: true, message: 'Vui lòng nhập tổng số buổi học' },
            { type: 'number', min: 1, message: 'Tổng số buổi học phải >= 1' },
          ]"
        >
          <a-input-number
            v-model:value="formState.number_of_sessions"
            size="large"
            placeholder="Ví dụ: 10"
            :min="1"
            class="w-full"
          />
        </a-form-item>
      </div>

      <a-form-item
        :label="$t('admin.classroom.form.schedule')"
        name="schedule"
        class="w-full"
        :rules="[{ required: true, message: t('admin.classroom.form.scheduleRequired') }]"
      >
        <div class="flex flex-col gap-4 w-full">
          <div
            v-for="(item, index) in formState.schedule"
            :key="index"
            class="flex flex-col gap-3 p-4 border border-gray-200 rounded-lg"
          >
            <div class="flex items-center gap-2 w-full">
              <a-select
                v-model:value="item.day"
                :placeholder="$t('admin.classroom.form.selectDay')"
                class="h-10 w-1/3"
                :rules="[{ required: true, message: t('admin.classroom.form.selectDayRequired') }]"
              >
                <a-select-option
                  v-for="day in daysOfWeek"
                  :key="day.value"
                  :value="day.value"
                >
                  {{ day.label }}
                </a-select-option>
              </a-select>

              <a-time-picker
                v-model:value="item.start"
                :allow-clear="false"
                format="HH:mm"
                :minute-step="30"
                :placeholder="$t('admin.classroom.form.startTime')"
                size="large"
                class="w-full"
              />

              <a-time-picker
                v-model:value="item.end"
                format="HH:mm"
                :minute-step="30"
                size="large"
                class="w-full"
                :placeholder="$t('admin.classroom.form.endTime')"
              />

              <div class="">
                <Icon
                  v-if="index > 0"
                  name="i-material-symbols-delete-outline"
                  class="text-[16px] text-red-500 cursor-pointer"
                  @click="removeScheduleItem(index)"
                />
              </div>
            </div>
          </div>

          <a-button
            type="primary"
            class="!h-10 !mt-2 !flex !items-center !gap-2 w-[118px]"
            @click="addScheduleItem"
          >
            {{ t('admin.classroom.form.addMore') }}
            <Icon name="i-material-symbols-add-2-rounded" class="text-[16px] text-white" />
          </a-button>
        </div>
      </a-form-item>

      <!-- Pricing Section -->
      <div class="w-full border-t border-gray-200 pt-4 mt-4">
        <h3 class="text-base font-semibold text-gray-900 mb-4">
          Giá cả
        </h3>

        <div class="grid grid-cols-2 gap-4">
          <!-- Price -->
          <a-form-item
            label="Giá gốc"
            name="price"
            class="w-full"
            :rules="[{ required: true, validator: validatePrice, trigger: 'change' }]"
          >
            <a-input-number
              v-model:value="formState.price"
              size="large"
              placeholder="Nhập giá gốc"
              :min="0"
              :step="0.01"
              :precision="2"
              class="w-full"
            >
              <template #prefix>
                <span class="text-gray-500">€</span>
              </template>
            </a-input-number>
            <div class="text-xs text-gray-500 mt-1">
              Giá gốc của lớp học (bắt buộc)
            </div>
          </a-form-item>

          <!-- Discount Price -->
          <a-form-item
            label="Giá khuyến mãi"
            name="discount_price"
            class="w-full"
            :rules="[{ validator: validateDiscountPrice, trigger: 'change' }]"
          >
            <a-input-number
              v-model:value="formState.discount_price"
              size="large"
              placeholder="Nhập giá khuyến mãi (tùy chọn)"
              :min="0"
              :step="0.01"
              :precision="2"
              class="w-full"
            >
              <template #prefix>
                <span class="text-gray-500">€</span>
              </template>
            </a-input-number>
            <div class="text-xs text-gray-500 mt-1">
              Giá khuyến mãi (nếu có). Phải nhỏ hơn giá gốc.
            </div>
          </a-form-item>
        </div>

        <!-- Effective Price Display (Read-only) -->
        <div v-if="formState.price" class="mb-4 p-3 bg-gray-50 rounded-lg">
          <div class="text-sm text-gray-600 mb-1">
            Giá hiệu lực:
          </div>
          <div class="text-lg font-semibold text-green-600">
            €{{ (formState.discount_price && formState.discount_price < formState.price
              ? formState.discount_price
              : formState.price).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          </div>
        </div>
      </div>

      <!-- Background Color Section -->
      <div class="w-full border-t border-gray-200 pt-4 mt-4">
        <h3 class="text-base font-semibold text-gray-900 mb-4">
          Màu nền cho lịch học
        </h3>

        <a-form-item
          label="Màu nền"
          name="background_color"
          class="w-full"
        >
          <div class="flex flex-wrap gap-2">
            <div
              v-for="color in BACKGROUND_COLORS"
              :key="color"
              class="w-10 h-10 rounded-lg cursor-pointer border-2 transition-all"
              :class="formState.background_color === color ? 'border-gray-900 scale-110' : 'border-gray-300 hover:border-gray-500'"
              :style="{ backgroundColor: color }"
              @click="formState.background_color = color"
            />
          </div>
        </a-form-item>
        <div class="text-xs text-gray-500 mt-1">
          Chọn màu nền để hiển thị trên lịch học
        </div>
      </div>
    </a-form>
  </a-modal>
</template>
