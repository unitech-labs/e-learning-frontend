<script lang="ts" setup>
import type { Course } from '~/types/course.type'
import { notification } from 'ant-design-vue'
import dayjs from 'dayjs'
import { useClassroomApi } from '~/composables/api/useClassroomApi'
import { useCourseApi } from '~/composables/api/useCourseApi'

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  mode: 'create',
})
const emit = defineEmits<Emits>()
const { t } = useI18n()
const { createClassroom, createClassroomSession } = useClassroomApi()
const { getCourses, getDetailCourses } = useCourseApi()

interface Props {
  open: boolean
  // When provided (course page), course is fixed and selector is hidden.
  courseId?: string
  // Optional: prefill create-classroom form based on a dragged event time range.
  // Used when creating classroom from calendar drag-to-create.
  prefillRange?: { start: string | Date, end: string | Date } | null
  loading?: boolean
  // create: legacy behavior (create only)
  // select_or_create: allow selecting existing classroom OR creating new classroom
  mode?: 'create' | 'select_or_create'
  // When provided, sets initial value of isCreateNew and hides the switch
  initialCreateNew?: boolean
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'success'): void
  (e: 'selected', payload: { courseId: string, classroomId: string, classroomTitle?: string }): void
  (e: 'sessionCreated', payload: { courseId: string, classroomId: string, session: any }): void
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
const prefillApplied = ref(false)

const daysOfWeek = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
]

interface ScheduleItem {
  day: string | null
  start: any | null
  end: any | null
}

interface CreateClassroomFormState {
  title: string
  student_count: number | null
  number_of_sessions: number | null
  start_date: any
  schedule: ScheduleItem[]
  price: number | null
  background_color: string
}

interface CreateSessionFormState {
  topic: string
  start_time: any
  end_time: any
  meeting_link: string
  meeting_id: string
  meeting_pass: string
}

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

const formState = ref<CreateClassroomFormState>({
  title: '',
  student_count: null as number | null,
  number_of_sessions: null as number | null,
  start_date: null as any,
  schedule: [
    { day: null, start: null, end: null },
  ],
  // Pricing fields
  price: null as number | null,
  background_color: BACKGROUND_COLORS[0], // Default to first color
})

const sessionFormState = ref<CreateSessionFormState>({
  topic: '',
  start_time: null,
  end_time: null,
  meeting_link: '',
  meeting_id: '',
  meeting_pass: '',
})

// Computed for dialog visibility
const dialogVisible = computed({
  get: () => props.open,
  set: (value: boolean) => {
    emit('update:open', value)
  },
})

const effectiveCourseId = computed(() => props.courseId || selectedCourseId.value)

function dayOfWeekValueFromDayjs(d: dayjs.Dayjs): string {
  // dayjs: 0=Sunday ... 6=Saturday
  const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return map[d.day()] || 'monday'
}

function applyPrefillFromRangeIfNeeded() {
  if (prefillApplied.value)
    return
  if (!props.prefillRange)
    return
  if (!isCreateNew.value)
    return

  const start = dayjs(props.prefillRange.start)
  const end = dayjs(props.prefillRange.end)

  // Prefill start_date
  formState.value.start_date = start

  // Prefill number of sessions if empty (common when creating from a single dragged slot)
  if (!formState.value.number_of_sessions) {
    formState.value.number_of_sessions = 1
  }

  // Prefill first schedule slot: day + start/end time
  const startTime = dayjs().hour(start.hour()).minute(start.minute()).second(0)
  const endTime = dayjs().hour(end.hour()).minute(end.minute()).second(0)

  formState.value.schedule = [
    {
      day: dayOfWeekValueFromDayjs(start),
      start: startTime,
      end: endTime,
    },
  ]

  prefillApplied.value = true
}

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
function validatePrice(_rule: any, value: any) {
  return new Promise<void>((resolve, reject) => {
    if (!value || value <= 0) {
      reject(new Error(t('admin.classroom.dialog.priceRequired')))
      return
    }
    resolve()
  })
}

function applySessionPrefillFromRangeIfNeeded() {
  if (!props.prefillRange)
    return
  if (isCreateNew.value)
    return
  const start = dayjs(props.prefillRange.start)
  const end = dayjs(props.prefillRange.end)
  sessionFormState.value.start_time = start
  sessionFormState.value.end_time = end
}

function formatDateTimeForApi(value: any): string {
  // Keep local time, append Z (same convention used elsewhere in this project).
  return dayjs(value).format('YYYY-MM-DDTHH:mm:ss.SSS[Z]')
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

  sessionFormState.value = {
    topic: '',
    start_time: null,
    end_time: null,
    meeting_link: '',
    meeting_id: '',
    meeting_pass: '',
  }
}

// Handle OK button
async function handleOk() {
  // Select existing classroom mode
  if (props.mode === 'select_or_create' && !isCreateNew.value) {
    const courseId = effectiveCourseId.value
    const classroomId = selectedClassroomId.value
    const _classroomTitle = classrooms.value.find(c => c.id === classroomId)?.title

    if (!courseId) {
      notification.error({
        message: 'Vui lòng chọn khóa học',
        duration: 3,
      })
      return
    }
    if (!classroomId) {
      notification.error({
        message: t('admin.classroom.dialog.selectClassroomRequired'),
        duration: 3,
      })
      return
    }

    if (!sessionFormState.value.topic?.trim()) {
      notification.error({
        message: t('admin.classroom.dialog.sessionTitleRequired'),
        duration: 3,
      })
      return
    }

    if (!sessionFormState.value.start_time || !sessionFormState.value.end_time) {
      notification.error({
        message: t('admin.classroom.dialog.startEndTimeRequired'),
        duration: 3,
      })
      return
    }

    const start = dayjs(sessionFormState.value.start_time)
    const end = dayjs(sessionFormState.value.end_time)
    if (!start.isValid() || !end.isValid() || !end.isAfter(start)) {
      notification.error({
        message: t('admin.classroom.dialog.endTimeAfterStartTime'),
        duration: 3,
      })
      return
    }

    try {
      confirmLoading.value = true
      const created = await createClassroomSession(classroomId, {
        classroom: classroomId,
        topic: sessionFormState.value.topic,
        start_time: formatDateTimeForApi(sessionFormState.value.start_time),
        end_time: formatDateTimeForApi(sessionFormState.value.end_time),
        meeting_link: sessionFormState.value.meeting_link,
        meeting_id: sessionFormState.value.meeting_id,
        meeting_pass: sessionFormState.value.meeting_pass,
      })

      notification.success({
        message: t('admin.classroom.dialog.createSessionSuccess'),
        duration: 3,
      })

      emit('sessionCreated', { courseId, classroomId, session: created })
      emit('success')

      dialogVisible.value = false
      await nextTick()
      resetForm()

      return
    }
    catch (err: any) {
      console.error('Error creating session:', err)
      notification.error({
        message: t('admin.classroom.dialog.createSessionFailed'),
        description: err?.message || err?.data?.detail || t('common.tryAgain'),
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
    // Only emit 'selected' if not in select_or_create mode (to avoid triggering handlePickedClassroom)
    // When creating new classroom in select_or_create mode, the parent handles it via 'success' event
    if (created?.id && props.mode !== 'select_or_create') {
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
    prefillApplied.value = false
    classrooms.value = []
    if (!props.courseId) {
      selectedCourseId.value = null
      courses.value = []
    }
    resetForm()
  }
  else {
    // When dialog opens, apply initialCreateNew if provided
    if (props.mode === 'select_or_create' && props.initialCreateNew !== undefined) {
      isCreateNew.value = props.initialCreateNew
    }
    prefillApplied.value = false
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

watch(isCreateNew, () => {
  // When toggling to "create new", apply prefill (if provided).
  applyPrefillFromRangeIfNeeded()
  applySessionPrefillFromRangeIfNeeded()
})

watch(() => props.prefillRange, () => {
  // If range changes while dialog open, allow applying once.
  prefillApplied.value = false
  applyPrefillFromRangeIfNeeded()
  applySessionPrefillFromRangeIfNeeded()
})
</script>

<template>
  <a-modal
    v-model:open="dialogVisible"
    :confirm-loading="confirmLoading"
    :ok-text="props.mode === 'select_or_create' && !isCreateNew ? t('admin.classroom.dialog.createSession') : undefined"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <div v-if="props.mode === 'select_or_create' && props.initialCreateNew === undefined" class="w-fit mb-4 mt-6">
      <div class="text-sm font-medium text-gray-800">
        {{ t('admin.classroom.dialog.createNewClassroom') }}
      </div>
      <a-switch v-model:checked="isCreateNew" />
    </div>

    <!-- Course selector (only when not fixed by prop) -->
    <div v-if="!props.courseId" class="w-full mb-4">
      <div class="text-sm font-medium text-gray-700 mb-2">
        {{ t('admin.classroom.dialog.selectCourse') }}
      </div>
      <a-select
        v-model:value="selectedCourseId"
        size="large"
        class="w-full"
        :placeholder="t('admin.classroom.dialog.selectCoursePlaceholder')"
        show-search
        :loading="coursesLoading"
        :filter-option="(input: string, option: any) => (option?.label || '').toLowerCase().includes(input.toLowerCase())"
        :options="courses.map(c => ({ value: c.id, label: c.title }))"
      />
    </div>

    <!-- Select existing classroom -->
    <div v-if="props.mode === 'select_or_create' && !isCreateNew" class="w-full">
      <div class="text-sm text-gray-600 mb-3">
        {{ t('admin.classroom.dialog.selectExistingClassroom') }}
      </div>
      <div class="text-sm font-medium text-gray-700 mb-2">
        {{ t('admin.classroom.dialog.selectClassroom') }}
      </div>
      <a-select
        v-model:value="selectedClassroomId"
        size="large"
        class="w-full"
        :placeholder="t('admin.classroom.dialog.selectClassroomPlaceholder')"
        show-search
        :loading="classroomsLoading"
        :disabled="!effectiveCourseId"
        :filter-option="(input: string, option: any) => (option?.label || '').toLowerCase().includes(input.toLowerCase())"
        :options="classrooms.map(c => ({ value: c.id, label: c.title }))"
      />

      <div class="mt-4">
        <div class="text-sm font-medium text-gray-700 mb-2">
          {{ t('admin.classroom.dialog.createSession') }}
        </div>

        <div class="space-y-3">
          <div>
            <div class="text-xs text-gray-600 mb-1">
              {{ t('admin.classroom.dialog.sessionTitle') }}
            </div>
            <a-input v-model:value="sessionFormState.topic" :placeholder="t('admin.classroom.dialog.sessionTitlePlaceholder')" />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div class="text-xs text-gray-600 mb-1">
                {{ t('admin.classroom.dialog.startTime') }}
              </div>
              <a-date-picker
                v-model:value="sessionFormState.start_time"
                show-time
                format="YYYY-MM-DD HH:mm"
                class="w-full"
                :placeholder="t('admin.classroom.dialog.startTimePlaceholder')"
              />
            </div>
            <div>
              <div class="text-xs text-gray-600 mb-1">
                {{ t('admin.classroom.dialog.endTime') }}
              </div>
              <a-date-picker
                v-model:value="sessionFormState.end_time"
                show-time
                format="YYYY-MM-DD HH:mm"
                class="w-full"
                :placeholder="t('admin.classroom.dialog.endTimePlaceholder')"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div class="text-xs text-gray-600 mb-1">
                {{ t('admin.classroom.dialog.meetingLink') }}
              </div>
              <a-input v-model:value="sessionFormState.meeting_link" :placeholder="t('admin.classroom.dialog.meetingLinkPlaceholder')" />
            </div>
            <div>
              <div class="text-xs text-gray-600 mb-1">
                {{ t('admin.classroom.dialog.meetingId') }}
              </div>
              <a-input v-model:value="sessionFormState.meeting_id" :placeholder="t('admin.classroom.dialog.meetingIdPlaceholder')" />
            </div>
          </div>

          <div>
            <div class="text-xs text-gray-600 mb-1">
              {{ t('admin.classroom.dialog.meetingPass') }}
            </div>
            <a-input v-model:value="sessionFormState.meeting_pass" :placeholder="t('admin.classroom.dialog.meetingPassPlaceholder')" />
          </div>
        </div>
      </div>
    </div>

    <!-- Create new classroom (legacy form) -->
    <a-form
      v-if="props.mode === 'create' || (props.mode === 'select_or_create' && isCreateNew)"
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
          :label="t('admin.classroom.dialog.startDate')"
          name="start_date"
          class="w-full"
          :rules="[{ required: true, message: t('admin.classroom.form.startDateRequired') }]"
        >
          <a-date-picker
            v-model:value="formState.start_date"
            size="large"
            :placeholder="t('admin.classroom.dialog.startDatePlaceholder')"
            class="w-full"
            format="YYYY-MM-DD"
          />
        </a-form-item>

        <a-form-item
          :label="t('admin.classroom.dialog.numberOfSessions')"
          name="number_of_sessions"
          class="w-full"
          :rules="[
            { required: true, message: t('admin.classroom.dialog.numberOfSessionsRequired') },
            { type: 'number', min: 1, message: t('admin.classroom.dialog.numberOfSessionsMin') },
          ]"
        >
          <a-input-number
            v-model:value="formState.number_of_sessions"
            size="large"
            :placeholder="t('admin.classroom.dialog.numberOfSessionsPlaceholder')"
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
          {{ t('admin.classroom.dialog.pricing') }}
        </h3>

        <a-form-item
          :label="t('admin.classroom.dialog.originalPrice')"
          name="price"
          class="w-full"
          :rules="[{ required: true, validator: validatePrice, trigger: 'change' }]"
        >
          <a-input-number
            v-model:value="formState.price"
            size="large"
            :placeholder="t('admin.classroom.dialog.originalPricePlaceholder')"
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
            {{ t('admin.classroom.dialog.originalPriceDescription') }}
          </div>
        </a-form-item>
      </div>

      <!-- Background Color Section -->
      <div class="w-full border-t border-gray-200 pt-4 mt-4">
        <h3 class="text-base font-semibold text-gray-900 mb-4">
          {{ t('admin.classroom.dialog.backgroundColor') }}
        </h3>

        <a-form-item
          :label="t('admin.classroom.dialog.backgroundColorLabel')"
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
          {{ t('admin.classroom.dialog.backgroundColorDescription') }}
        </div>
      </div>
    </a-form>
  </a-modal>
</template>
