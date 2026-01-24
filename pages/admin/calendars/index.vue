<script setup lang="ts">
import type { Course } from '~/types/course.type'
import { notification } from 'ant-design-vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { VueCal } from 'vue-cal'
import CreateClassroomDialog from '~/components/admin/course/classroom/CreateClassroomDialog.vue'
import SessionDetailDialog from '~/components/admin/course/classroom/SessionDetailDialog.vue'
import { useClassroomApi } from '~/composables/api/useClassroomApi'
import { useCourseApi } from '~/composables/api/useCourseApi'
import { useGeneralSessionsApi } from '~/composables/api/useGeneralSessionsApi'
import 'vue-cal/style'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

useHead({
  title: 'General Calendar - Admin Panel',
})

dayjs.extend(utc)

interface CalendarEvent {
  start: string | Date
  end: string | Date
  title: string
  id?: string
  sessionId?: string
  classroomId?: string
  description?: string
  courseTitle?: string
  topic?: string
  background?: string
  limit?: number
  draggable?: boolean
  resizable?: boolean
}

const DEFAULT_BACKGROUND_COLOR = '#268100'

function formatEventTime(dateTime: any): string {
  if (!dateTime)
    return ''
  return dayjs(dateTime).format('HH:mm')
}

const { getSessions, getSessionDetail, rescheduleSession } = useGeneralSessionsApi()
const { getCourses } = useCourseApi()
const { createClassroomSession } = useClassroomApi()

// Create classroom (needs course context)
const openCoursePicker = ref(false)
const createDialogOpen = ref(false)
const coursesLoading = ref(false)
const courses = ref<Course[]>([])
const selectedCourseIdForCreate = ref<string | null>(null)

// VueCal editable events (create)
const showCreationDialog = ref(false)
const createEventFn = ref<null | ((value: any) => void)>(null)
const newEvent = ref<any>(null)
const showPickClassroomDialog = ref(false)
const pickedForNewEvent = ref<{ courseId: string, classroomId: string, classroomTitle?: string } | null>(null)
const creationForm = ref({
  title: '',
  class: '',
  background: false,
})

const isUpdatingSessionTime = ref(false)

const sessionsData = ref<any[]>([])
const calendarEvents = ref<CalendarEvent[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

const calendarReady = ref(false)
const isLoadingSessions = ref(false)

// Calendar state
const selectedDate = ref()
const viewDate = ref()
const currentView = ref('week')
const vueCalRef = ref<any>(null)

// Detail dialog state (reuse admin SessionDetailDialog like course calendar)
const openSessionDetailDialog = ref(false)
const selectedSessionId = ref<string | null>(null)
const selectedClassroomId = ref<string | null>(null)
const selectedCourseId = ref<string | null>(null)
const isResolvingSessionContext = ref(false)

async function fetchCourses() {
  try {
    coursesLoading.value = true
    const response = await getCourses({ limit: 200 })
    const coursesResponse = response?.results || []
    courses.value = coursesResponse.filter(course => course.course_type === 'course')
  }
  catch (err) {
    console.error('Error fetching courses:', err)
    courses.value = []
  }
  finally {
    coursesLoading.value = false
  }
}

function openCreateClassroomFlow() {
  openCoursePicker.value = true
}

function confirmCourseAndOpenCreateDialog() {
  if (!selectedCourseIdForCreate.value) {
    notification.error({
      message: 'Vui lòng chọn khóa học',
      duration: 3,
    })
    return
  }
  openCoursePicker.value = false
  createDialogOpen.value = true
}

function createEvent({ event, resolve }: any) {
  openPickClassroomDialog({ event, resolve })
}

function openPickClassroomDialog({ event, resolve }: { event: any, resolve: (value: any) => void }) {
  newEvent.value = event
  createEventFn.value = resolve
  pickedForNewEvent.value = null
  showPickClassroomDialog.value = true
}

function handlePickedClassroom(payload: { courseId: string, classroomId: string, classroomTitle?: string }) {
  pickedForNewEvent.value = payload
  showPickClassroomDialog.value = false

  // Now open event detail dialog (title/class/background)
  creationForm.value = {
    title: payload.classroomTitle || '',
    class: '',
    background: false,
  }
  showCreationDialog.value = true
}

function cancelCreation() {
  createEventFn.value?.(false)
  createEventFn.value = null
  showCreationDialog.value = false
  showPickClassroomDialog.value = false
  newEvent.value = null
  pickedForNewEvent.value = null
}

// If user closes the "pick classroom" dialog without selecting, cancel creation.
watch(showPickClassroomDialog, (isOpen) => {
  if (!isOpen && newEvent.value && !pickedForNewEvent.value && !showCreationDialog.value) {
    cancelCreation()
  }
})

function formatDateTimeForApi(value: any): string {
  // We intentionally keep the displayed time as-is and append "Z" (UTC) like other parts of the app.
  // Backend stores and returns exactly what client sends.
  return dayjs(value).format('YYYY-MM-DDTHH:mm:ss.SSS[Z]')
}

async function validateCreation() {
  if (!newEvent.value) {
    cancelCreation()
    return
  }

  const courseId = pickedForNewEvent.value?.courseId
  const classroomId = pickedForNewEvent.value?.classroomId
  const classroomTitle = pickedForNewEvent.value?.classroomTitle
  if (!courseId || !classroomId) {
    notification.error({
      message: 'Vui lòng chọn lớp học',
      duration: 3,
    })
    return
  }

  const course = courses.value.find(c => c.id === courseId)
  const topic = (creationForm.value.title || classroomTitle || 'Buổi học').trim()

  try {
    const startIso = formatDateTimeForApi(newEvent.value.start)
    const endIso = formatDateTimeForApi(newEvent.value.end)

    const created = await createClassroomSession(classroomId, {
      classroom: classroomId,
      topic,
      description: '',
      start_time: startIso,
      end_time: endIso,
      location: '',
      meeting_link: '',
      meeting_id: '',
      meeting_pass: '',
      limit: 1,
    })

    const resolvedEvent: CalendarEvent = {
      id: created?.id,
      sessionId: created?.id,
      classroomId,
      title: classroomTitle || topic,
      courseTitle: course?.title,
      start: dayjs(newEvent.value.start).toDate(),
      end: dayjs(newEvent.value.end).toDate(),
      background: (created as any)?.background_color || DEFAULT_BACKGROUND_COLOR,
      limit: (created as any)?.limit ?? 1,
      draggable: true,
      resizable: true,
    }

    // Let VueCal add it immediately. We'll also reload to stay in sync with backend.
    createEventFn.value?.(resolvedEvent as any)
    createEventFn.value = null
    showCreationDialog.value = false
    newEvent.value = null
    pickedForNewEvent.value = null

    notification.success({
      message: 'Đã tạo buổi học',
      duration: 3,
    })

    loadSessionsForCurrentView()
  }
  catch (err: any) {
    console.error('Error creating session from calendar:', err)
    notification.error({
      message: 'Không thể tạo buổi học',
      description: err?.message || err?.data?.detail || 'Vui lòng thử lại',
      duration: 5,
    })
  }
}

function generateCalendarEventsFromSessions(sessions: any[]): CalendarEvent[] {
  return sessions.map((session) => {
    return {
      id: session.id,
      start: new Date(session.start_time.replace('Z', '')),
      end: new Date(session.end_time.replace('Z', '')),
      title: session.classroom_title,
      sessionId: session.id,
      classroomId: session.classroom,
      description: session.description,
      courseTitle: session.course_title,
      topic: session.topic,
      backgroundColor: session.background_color || DEFAULT_BACKGROUND_COLOR,
      limit: session.limit,
      resizable: true,
      draggable: true,
      deletable: true,

    // start: new Date(session.start_time.replace('Z', '')),
    // end: new Date(session.end_time.replace('Z', '')),
    // title: session.classroom_title,
    // content: session.description,
    // // class: session.classroom,
    // deletable: true,
    // resizable: true,
    // draggable: true
    }
  })
}

async function loadSessionsForCurrentView() {
  if (isLoadingSessions.value) {
    return
  }

  try {
    isLoadingSessions.value = true
    isLoading.value = true
    error.value = null

    const view = vueCalRef.value?.view
    let startDate: string | undefined
    let endDate: string | undefined

    if (view && view.cellDates && view.cellDates.length > 0) {
      const firstCell = view.cellDates[0]
      const lastCell = view.cellDates[view.cellDates.length - 1]
      startDate = firstCell.startFormatted // YYYY-MM-DD
      endDate = lastCell.startFormatted // YYYY-MM-DD
    }

    const response = await getSessions({
      start_date: startDate,
      end_date: endDate,
      page: 1,
      page_size: 500,
    })

    sessionsData.value = response.results || []
    calendarEvents.value = generateCalendarEventsFromSessions(sessionsData.value)
  }
  catch (err: any) {
    console.error('Error loading sessions:', err)
    error.value = err?.message || err?.data?.detail || 'Có lỗi xảy ra khi tải lịch tổng'
    sessionsData.value = []
    calendarEvents.value = []
  }
  finally {
    isLoading.value = false
    isLoadingSessions.value = false
  }
}

function handleCalendarReady({ view }: any) {
  view.scrollToCurrentTime()
  if (!calendarReady.value && !isLoadingSessions.value) {
    calendarReady.value = true
    nextTick(() => {
      loadSessionsForCurrentView()
    })
  }
}

function handlePreviousClick() {
  if (vueCalRef.value?.view && !isLoadingSessions.value) {
    vueCalRef.value.view.previous()
    nextTick(() => {
      loadSessionsForCurrentView()
    })
  }
}

function handleNextClick() {
  if (vueCalRef.value?.view && !isLoadingSessions.value) {
    vueCalRef.value.view.next()
    nextTick(() => {
      loadSessionsForCurrentView()
    })
  }
}

function handleTodayClick() {
  if (vueCalRef.value?.view && !isLoadingSessions.value) {
    vueCalRef.value.view.goToToday()

    const today = new Date()
    viewDate.value = today
    selectedDate.value = today

    nextTick(() => {
      loadSessionsForCurrentView()
    })
  }
}

// Keep selectedDate aligned with week start
watch(viewDate, (newViewDate) => {
  if (currentView.value === 'week') {
    const firstDayOfWeek = new Date(newViewDate)
    const dayOfWeek = firstDayOfWeek.getDay()
    const diff = firstDayOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    firstDayOfWeek.setDate(diff)
    selectedDate.value = firstDayOfWeek
  }
})

function handleEventClick(event: any) {
  const calendarEvent = event.event as CalendarEvent
  if (calendarEvent.sessionId) {
    resolveSessionContextAndOpen(calendarEvent.sessionId)
  }
}

async function resolveSessionContextAndOpen(sessionId: string) {
  if (isResolvingSessionContext.value)
    return

  try {
    isResolvingSessionContext.value = true

    // Need courseId + classroomId for SessionDetailDialog
    const detail = await getSessionDetail(sessionId)
    const courseId = detail?.course?.id
    const classroomId = detail?.classroom?.id

    if (!courseId || !classroomId) {
      notification.error({
        message: 'Không thể mở chi tiết buổi học',
        description: 'Thiếu courseId/classroomId từ API session detail.',
        duration: 5,
      })
      return
    }

    selectedSessionId.value = sessionId
    selectedCourseId.value = courseId
    selectedClassroomId.value = classroomId
    openSessionDetailDialog.value = true
  }
  catch (err: any) {
    console.error('Error resolving session context:', err)
    notification.error({
      message: 'Không thể tải chi tiết buổi học',
      description: err?.message || err?.data?.detail || 'Vui lòng thử lại',
      duration: 5,
    })
  }
  finally {
    isResolvingSessionContext.value = false
  }
}

async function handleEventChange(payload: any) {
  // VueCal (v5) emits different shapes; handle both { event } and direct event object.
  const event = payload?.event || payload
  const sessionId = event?.sessionId || event?.id
  if (!sessionId)
    return
  if (isUpdatingSessionTime.value)
    return

  try {
    isUpdatingSessionTime.value = true

    const startDate = dayjs(event.start)
    const endDate = dayjs(event.end)

    await rescheduleSession(sessionId, {
      start_date: startDate.format('YYYY-MM-DD'),
      start_time: startDate.format('HH:mm'),
      end_date: endDate.format('YYYY-MM-DD'),
      end_time: endDate.format('HH:mm'),
    })

    notification.success({
      message: 'Đã cập nhật thời gian buổi học',
      duration: 2,
    })
  }
  catch (err: any) {
    console.error('Error updating session time:', err)
    notification.error({
      message: 'Không thể cập nhật thời gian',
      description: err?.message || err?.data?.detail || 'Vui lòng thử lại',
      duration: 5,
    })

    // On error, reload to revert UI to backend truth.
    loadSessionsForCurrentView()
  }
  finally {
    isUpdatingSessionTime.value = false
  }
}

function handleStudentChanged() {
  // Reload sessions to update attendance count / any changes
  loadSessionsForCurrentView()
}

async function handleClassroomDeleted() {
  await loadSessionsForCurrentView()
}

onMounted(() => {
  fetchCourses()
})
</script>

<template>
  <div class="relative">
    <div class="bg-white rounded-lg border border-gray-200 p-6">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-4">
          <h2 class="font-bold text-2xl flex items-center gap-3">
            <Icon name="solar:calendar-bold" size="28" class="text-green-600" />
            {{ $t('adminMenu.generalCalendar') }}
          </h2>
          <a-button
            type="primary"
            class="!px-6 !h-10 rounded-lg text-sm !font-semibold !flex !items-center !justify-center gap-1 !bg-[#548A1D]"
            @click="openCreateClassroomFlow"
          >
            {{ $t('admin.classroom.addNewClassroom') }}
            <Icon name="i-material-symbols-add-2-rounded" class="text-[16px] text-white" />
          </a-button>
          <a-button
            type="default"
            class="!px-4 !h-10 rounded-lg text-sm !font-semibold !flex !items-center !justify-center gap-1 !border-[#548A1D] !text-[#548A1D] hover:!bg-[#548A1D] hover:!text-white"
            :loading="isLoading"
            @click="loadSessionsForCurrentView"
          >
            Tải lại
            <Icon name="i-heroicons-arrow-path" class="text-[16px]" />
          </a-button>
        </div>

        <div
          class="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-500"
        >
          <Icon name="i-heroicons-list-bullet" class="h-5 w-5 text-gray-300" />
          {{ calendarEvents.length }} buổi học
        </div>
      </div>

      <div class="flex flex-col overflow-auto rounded-xl border border-gray-200 bg-white shadow-sm relative">
        <div
          v-if="isLoading"
          class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50 rounded-xl"
        >
          <a-spin size="large" />
        </div>

        <div
          v-if="error && !isLoading"
          class="absolute inset-0 bg-white bg-opacity-95 flex flex-col items-center justify-center z-50 rounded-xl p-8"
        >
          <p class="text-red-500 mb-4 text-center">
            {{ error }}
          </p>
          <a-button @click="loadSessionsForCurrentView">
            {{ $t('common.tryAgain') }}
          </a-button>
        </div>

        <VueCal
          ref="vueCalRef"
          v-model:selected-date="selectedDate"
          v-model:view-date="viewDate"
          v-model:view="currentView"
          editable-events
          :views-bar="false"
          class="custom-theme calendar w-full !h-auto"
          :time-from="1 * 60"
          :time-step="60"
          :time-to="24 * 60"
          :time-cell-height="72"
          :events="calendarEvents"
          :views="['week']"
          time-at-cursor
          @ready="handleCalendarReady"
          @event-create="createEvent"
          @event-click="handleEventClick"
          @event-drag-end="handleEventChange"
          @event-resize-end="handleEventChange"
        >
          <template #event="{ event }">
            <div
              class="flex flex-col gap-1 text-white p-1 px-2 rounded-[5px] h-full"
              :style="{ backgroundColor: event.backgroundColor || 'DEFAULT_BACKGROUND_COLOR' }"
            >
              <div class="text-sm font-medium text-white leading-tight">
                {{ event.title }}
              </div>
              <div v-if="event.courseTitle" class="text-[11px] font-semibold text-white opacity-90 line-clamp-1">
                {{ event.courseTitle }}
              </div>
              <div v-if="event.start && event.end" class="text-xs font-semibold text-white opacity-90">
                {{ formatEventTime(event.start) }} - {{ formatEventTime(event.end) }}
              </div>
              <div v-if="event.limit" class="text-xs font-semibold text-white opacity-90">
                Tối đa {{ event.limit }} học viên
              </div>
            </div>
          </template>

          <template #previous-button>
            <button
              class="!text-gray-500 cursor-pointer hover:!text-gray-700 transition-colors"
              @click.stop.prevent="handlePreviousClick"
            >
              <Icon name="i-heroicons-chevron-left" class="text-[26px]" />
            </button>
          </template>

          <template #next-button>
            <button
              class="!text-gray-500 cursor-pointer hover:!text-gray-700 transition-colors"
              @click.stop.prevent="handleNextClick"
            >
              <Icon name="i-heroicons-chevron-right" class="text-[26px]" />
            </button>
          </template>

          <template #today-button>
            <button
              class="!text-gray-500 cursor-pointer hover:!text-gray-700 transition-colors"
              @click.stop.prevent="handleTodayClick"
            >
              Hôm nay
            </button>
          </template>
        </VueCal>
      </div>
    </div>

    <SessionDetailDialog
      v-model:open="openSessionDetailDialog"
      :course-id="selectedCourseId || ''"
      :session-id="selectedSessionId"
      :classroom-id="selectedClassroomId"
      @student-added="handleStudentChanged"
      @student-removed="handleStudentChanged"
      @session-updated="handleStudentChanged"
      @classroom-deleted="handleClassroomDeleted"
    />

    <!-- Pick course before creating classroom -->
    <a-modal
      v-model:open="openCoursePicker"
      title="Chọn khóa học"
      :ok-button-props="{ disabled: !selectedCourseIdForCreate }"
      ok-text="Tiếp tục"
      cancel-text="Hủy"
      @ok="confirmCourseAndOpenCreateDialog"
      @cancel="openCoursePicker = false"
    >
      <div class="space-y-2">
        <div class="text-sm text-gray-600">
          Vì đây là lịch tổng, hãy chọn khóa học bạn muốn tạo lớp.
        </div>
        <a-select
          v-model:value="selectedCourseIdForCreate"
          class="w-full"
          size="large"
          placeholder="Chọn khóa học"
          show-search
          :loading="coursesLoading"
          :filter-option="(input: string, option: any) => (option?.label || '').toLowerCase().includes(input.toLowerCase())"
          :options="courses.map(c => ({ value: c.id, label: c.title }))"
        />
      </div>
    </a-modal>

    <CreateClassroomDialog
      v-model:open="createDialogOpen"
      :course-id="selectedCourseIdForCreate || undefined"
      @success="loadSessionsForCurrentView"
    />

    <!-- Reuse CreateClassroomDialog for editable event: pick or create classroom -->
    <CreateClassroomDialog
      v-model:open="showPickClassroomDialog"
      mode="select_or_create"
      @selected="handlePickedClassroom"
    />

    <!-- VueCal editable-event creation dialog -->
    <a-modal
      v-model:open="showCreationDialog"
      title="Tạo buổi học"
      ok-text="OK"
      cancel-text="Cancel"
      @ok="validateCreation"
      @cancel="cancelCreation"
    >
      <div v-if="newEvent" class="space-y-4">
        <div class="text-xs text-gray-500">
          {{ dayjs(newEvent.start).format('DD/MM/YYYY HH:mm') }} → {{ dayjs(newEvent.end).format('DD/MM/YYYY HH:mm') }}
        </div>

        <div>
          <div class="text-xs text-gray-600 mb-1">
            Tiêu đề buổi học
          </div>
          <a-input v-model:value="creationForm.title" placeholder="Event Title" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div class="text-xs text-gray-600 mb-1">
              Event Class (optional)
            </div>
            <a-input v-model:value="creationForm.class" placeholder="Event Class" />
          </div>
          <div class="flex items-center gap-3 pt-5">
            <a-switch v-model:checked="creationForm.background" />
            <span class="text-sm text-gray-700">Background</span>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
/* Vue-cal theme customization (reuse from other calendar pages) */
:deep(.vuecal.custom-theme) {
  --vuecal-primary-color: #fff;
  --vuecal-secondary-color: #fafbfc;
  --vuecal-base-color: #0f172a;
  --vuecal-contrast-color: #ffffff;
  --vuecal-time-cell-height: 50px !important;
}

:deep(.vuecal__header) {
  color: var(--vuecal-base-color) !important;
  background: #fafbfc;
  border: 1px solid #f1f5f9;
  border-bottom: none;
}

:deep(.vuecal__event) {
  color: var(--vuecal-base-color) !important;
  border-color: rgba(203, 213, 225, 0.25) !important;
}

:deep(.vuecal__today-btn) {
  color: var(--vuecal-base-color) !important;
}

:deep(.vuecal--default-theme .vuecal__event) {
  color: #ffffff;
  border: 1px solid rgba(203, 213, 225, 0.35);
  padding: 0;
  border-radius: 10px;
  box-shadow: none;
  background: transparent !important;
}

:deep(.vuecal--default-theme .vuecal__event:hover) {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}

:deep(.calendar .vuecal__title-bar button) {
  height: 36px;
  border-radius: 10px;
  font-weight: 600;
}

:deep(.calendar .vuecal__nav--today) {
  margin-left: 3px;
}

:deep(.vuecal__event .vuecal__event-title),
:deep(.calendar .vuecal__event-time) {
  font-size: 14px;
  color: #ffffff;
  font-weight: 700;
}

:deep(.vuecal__event .vuecal__event-time) {
  margin-top: 4px;
  font-size: 12px;
  color: #ffffff;
  font-weight: 600;
}

:deep(.vuecal--default-theme .vuecal__time-cell) {
  border-color: #e2e8f0;
}

:deep(.vuecal--default-theme .vuecal__time-cell--now) {
  background: #fef9c3;
  border-color: #fbbf24;
}

:deep(.vuecal__weekday.vuecal__weekday--today .vuecal__weekday-date) {
  background: #15803d;
  color: #fff;
}

.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
