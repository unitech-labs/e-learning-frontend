<script setup lang="ts">
import type { Course } from '~/types/course.type'
import { notification } from 'ant-design-vue'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { VueCal } from 'vue-cal'
import { useI18n } from 'vue-i18n'
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

const { t } = useI18n()

useHead({
  title: `${t('admin.calendars.title')} - Admin Panel`,
})

dayjs.extend(utc)
dayjs.extend(timezone)

// Timezone selector (shared composable, persisted in localStorage)
const { TIMEZONE_OPTIONS, selectedTimezone } = useTimezone()

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
  backgroundColor?: string
  deletable?: boolean
}

const DEFAULT_BACKGROUND_COLOR = '#268100'

function formatEventTime(dateTime: any): string {
  if (!dateTime)
    return ''
  return dayjs(dateTime).format('HH:mm')
}

const { getSessions, getSessionDetail, rescheduleSession, bulkRescheduleSession } = useGeneralSessionsApi()
const { getCourses } = useCourseApi()
const { createClassroomSession } = useClassroomApi()

// Courses for drag-to-create event (used in validateCreation)
const coursesLoading = ref(false)
const courses = ref<Course[]>([])

// VueCal editable events (create)
const showCreationDialog = ref(false)
const createEventFn = ref<null | ((value: any) => void)>(null)
const newEvent = ref<any>(null)
const showPickClassroomDialog = ref(false)
const pickedForNewEvent = ref<{ courseId: string, classroomId: string, classroomTitle?: string } | null>(null)
const showChoiceDialog = ref(false)
const choiceForNewEvent = ref<'new_classroom' | 'existing_classroom' | null>(null)
const creationForm = ref({
  title: '',
  class: '',
  background: false,
})

const isUpdatingSessionTime = ref(false)

// Recurring event edit dialog state
const showRecurringEditDialog = ref(false)
const recurringEditOption = ref<'this_event' | 'all' | 'from_this' | 'same_weekday'>('this_event')
const pendingEventChange = ref<{ sessionId: string, start: any, end: any } | null>(null)

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

function createEvent({ event, resolve }: any) {
  newEvent.value = event
  createEventFn.value = resolve
  choiceForNewEvent.value = null
  showChoiceDialog.value = true
}

function handleChoiceSelected(choice: 'new_classroom' | 'existing_classroom') {
  choiceForNewEvent.value = choice
  showChoiceDialog.value = false
  openPickClassroomDialog()
}

function openPickClassroomDialog() {
  pickedForNewEvent.value = null
  showPickClassroomDialog.value = true
}

function handlePickedClassroom(payload: { courseId: string, classroomId: string, classroomTitle?: string }) {
  // Only handle when selecting existing classroom (not creating new one)
  if (choiceForNewEvent.value === 'new_classroom') {
    // Creating new classroom is handled by handleClassroomCreatedFromDialog
    return
  }

  // This handler is only used when selecting existing classroom for creating session
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

function handleClassroomCreatedFromDialog() {
  // When a new classroom is created from drag event, cancel the dragged event
  // because sessions will be auto-generated and shown after reload
  if (createEventFn.value) {
    createEventFn.value(false) // Cancel the dragged event
    createEventFn.value = null
  }

  // Clean up state - close all dialogs
  showPickClassroomDialog.value = false
  showCreationDialog.value = false
  showChoiceDialog.value = false
  newEvent.value = null
  pickedForNewEvent.value = null
  choiceForNewEvent.value = null

  // Reload calendar to show auto-generated sessions
  loadSessionsForCurrentView()
}

function handleSessionCreatedFromDialog(payload: { courseId: string, classroomId: string, session: any }) {
  // If user created a session directly in CreateClassroomDialog, resolve the dragged vue-cal event immediately.
  if (!createEventFn.value || !newEvent.value) {
    // No pending create in vue-cal: just reload list.
    loadSessionsForCurrentView()
    return
  }

  const session = payload.session
  const resolvedEvent: CalendarEvent = {
    id: session?.id,
    sessionId: session?.id,
    classroomId: payload.classroomId,
    title: session?.classroom_title || session?.topic || 'Buổi học',
    courseTitle: session?.course_title,
    start: new Date(session.start_time.replace('Z', '')),
    end: new Date(session.end_time.replace('Z', '')),
    backgroundColor: session?.background_color || DEFAULT_BACKGROUND_COLOR,
    limit: session?.limit,
    draggable: true,
    resizable: true,
    deletable: true,
  }

  createEventFn.value(resolvedEvent as any)
  createEventFn.value = null
  showPickClassroomDialog.value = false
  showCreationDialog.value = false
  newEvent.value = null
  pickedForNewEvent.value = null
}

function cancelCreation() {
  createEventFn.value?.(false)
  createEventFn.value = null
  showCreationDialog.value = false
  showPickClassroomDialog.value = false
  showChoiceDialog.value = false
  newEvent.value = null
  pickedForNewEvent.value = null
  choiceForNewEvent.value = null
}

// If user closes the "pick classroom" dialog without selecting, cancel creation.
watch(showPickClassroomDialog, (isOpen) => {
  if (!isOpen && newEvent.value && !pickedForNewEvent.value && !showCreationDialog.value && !showChoiceDialog.value) {
    cancelCreation()
  }
})

// If user closes the "choice" dialog without selecting, cancel creation.
watch(showChoiceDialog, (isOpen) => {
  if (!isOpen && newEvent.value && !choiceForNewEvent.value) {
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
      message: t('admin.calendars.notifications.selectClassroomRequired'),
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
      message: t('admin.calendars.notifications.createSessionSuccess'),
      duration: 3,
    })

    loadSessionsForCurrentView()
  }
  catch (err: any) {
    console.error('Error creating session from calendar:', err)
    notification.error({
      message: t('admin.calendars.notifications.createSessionFailed'),
      description: err?.message || err?.data?.detail || t('common.tryAgain'),
      duration: 5,
    })
  }
}

function convertSessionTime(isoString: string): Date {
  // Backend stores times as Vietnam local time with 'Z' suffix.
  // Strip 'Z' and parse as Vietnam time, then convert to selected timezone.
  const raw = isoString.replace('Z', '')
  if (selectedTimezone.value === 'Asia/Ho_Chi_Minh') {
    // Default: render as-is (current behavior)
    return new Date(raw)
  }
  // Convert: parse as Vietnam time → convert to target timezone → extract local time
  const inVietnam = dayjs.tz(raw, 'Asia/Ho_Chi_Minh')
  const inTarget = inVietnam.tz(selectedTimezone.value)
  // Create a Date using the target timezone's local values so VueCal renders at correct position
  return new Date(inTarget.format('YYYY-MM-DDTHH:mm:ss'))
}

function generateCalendarEventsFromSessions(sessions: any[]): CalendarEvent[] {
  return sessions.map((session) => {
    return {
      id: session.id,
      start: convertSessionTime(session.start_time),
      end: convertSessionTime(session.end_time),
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
      limit: 500,
    })

    sessionsData.value = response.results || []
    calendarEvents.value = generateCalendarEventsFromSessions(sessionsData.value)
  }
  catch (err: any) {
    console.error('Error loading sessions:', err)
    error.value = err?.message || err?.data?.detail || t('admin.calendars.notifications.loadSessionsError')
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
        message: t('admin.calendars.notifications.openSessionDetailError'),
        description: t('admin.calendars.notifications.openSessionDetailErrorDesc'),
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
      message: t('admin.calendars.notifications.loadSessionDetailError'),
      description: err?.message || err?.data?.detail || t('common.tryAgain'),
      duration: 5,
    })
  }
  finally {
    isResolvingSessionContext.value = false
  }
}

function handleEventChange(payload: any) {
  // VueCal (v5) emits different shapes; handle both { event } and direct event object.
  const event = payload?.event || payload
  const sessionId = event?.sessionId || event?.id
  if (!sessionId)
    return

  // Store pending change and show recurring edit dialog
  pendingEventChange.value = {
    sessionId,
    start: event.start,
    end: event.end,
  }
  recurringEditOption.value = 'this_event'
  showRecurringEditDialog.value = true
}

async function handleRecurringEditSave() {
  if (!pendingEventChange.value)
    return
  if (isUpdatingSessionTime.value)
    return

  const { sessionId, start, end } = pendingEventChange.value
  const option = recurringEditOption.value

  // "Chỉ sự kiện này" — just close dialog (single reschedule already applied by VueCal drag/resize)
  if (option === 'this_event') {
    try {
      isUpdatingSessionTime.value = true
      const startDate = dayjs(start)
      const endDate = dayjs(end)

      await rescheduleSession(sessionId, {
        start_date: startDate.format('YYYY-MM-DD'),
        start_time: startDate.format('HH:mm'),
        end_date: endDate.format('YYYY-MM-DD'),
        end_time: endDate.format('HH:mm'),
      })

      notification.success({
        message: t('admin.calendars.notifications.updateSessionTimeSuccess'),
        duration: 2,
      })
    }
    catch (err: any) {
      console.error('Error updating session time:', err)
      notification.error({
        message: t('admin.calendars.notifications.updateSessionTimeFailed'),
        description: err?.message || err?.data?.detail || t('common.tryAgain'),
        duration: 5,
      })
      loadSessionsForCurrentView()
    }
    finally {
      isUpdatingSessionTime.value = false
    }

    showRecurringEditDialog.value = false
    pendingEventChange.value = null
    return
  }

  // Bulk reschedule for the other 3 options
  try {
    isUpdatingSessionTime.value = true
    const startTime = dayjs(start).format('HH:mm')
    const endTime = dayjs(end).format('HH:mm')

    const result = await bulkRescheduleSession(sessionId, {
      start_time: startTime,
      end_time: endTime,
      option: option as 'all' | 'from_this' | 'same_weekday',
    })

    notification.success({
      message: t('admin.calendars.notifications.bulkRescheduleSuccess', { count: result.updated_count }),
      duration: 3,
    })

    loadSessionsForCurrentView()
  }
  catch (err: any) {
    console.error('Error bulk rescheduling sessions:', err)
    notification.error({
      message: t('admin.calendars.notifications.bulkRescheduleFailed'),
      description: err?.message || err?.data?.detail || t('common.tryAgain'),
      duration: 5,
    })
    loadSessionsForCurrentView()
  }
  finally {
    isUpdatingSessionTime.value = false
  }

  showRecurringEditDialog.value = false
  pendingEventChange.value = null
}

function handleRecurringEditCancel() {
  showRecurringEditDialog.value = false
  pendingEventChange.value = null
  // Revert UI to backend truth since user cancelled
  loadSessionsForCurrentView()
}

function handleStudentChanged() {
  // Reload sessions to update attendance count / any changes
  loadSessionsForCurrentView()
}

async function handleClassroomDeleted() {
  // Close dialog and reset selected session state immediately
  openSessionDetailDialog.value = false
  selectedSessionId.value = null
  selectedCourseId.value = null
  selectedClassroomId.value = null

  // Then reload sessions
  await loadSessionsForCurrentView()
}

// Re-render calendar events when timezone changes
watch(selectedTimezone, () => {
  if (sessionsData.value.length > 0) {
    calendarEvents.value = generateCalendarEventsFromSessions(sessionsData.value)
  }
})

onMounted(() => {
  fetchCourses()
})
</script>

<template>
  <div class="relative flex-1 flex h-full">
      <!-- <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-4">
          <h2 class="font-bold text-2xl flex items-center gap-3">
            <Icon name="solar:calendar-bold" size="28" class="text-green-600" />
            {{ t('admin.calendars.title') }}
          </h2>
          <a-button
            type="default"
            class="!px-4 !h-10 rounded-lg text-sm !font-semibold !flex !items-center !justify-center gap-1 !border-[#548A1D] !text-[#548A1D] hover:!bg-[#548A1D] hover:!text-white"
            :loading="isLoading"
            @click="loadSessionsForCurrentView"
          >
            {{ t('admin.calendars.refresh') }}
            <Icon name="i-heroicons-arrow-path" class="text-[16px]" />
          </a-button>
        </div>

        <div
          class="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-500"
        >
          <Icon name="i-heroicons-list-bullet" class="h-5 w-5 text-gray-300" />
          {{ t('admin.calendars.sessionsCount', { count: calendarEvents.length }) }}
        </div>
      </div> -->

      <!-- Timezone selector -->
      
      <div class="w-full rounded-sm border border-gray-200 bg-white relative">
        <div class="p-2 flex items-center gap-2">
          <span class="text-xs font-medium text-gray-500">Múi giờ:</span>
          <a-segmented
            v-model:value="selectedTimezone"
            :options="TIMEZONE_OPTIONS.map(opt => ({ label: opt.label, value: opt.value }))"
            size="small"
          />
        </div>
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
            {{ t('common.tryAgain') }}
          </a-button>
        </div>

        <VueCal
          ref="vueCalRef"
          v-model:selected-date="selectedDate"
          v-model:view-date="viewDate"
          v-model:view="currentView"
          editable-events
          :views-bar="false"
          class="custom-theme calendar w-full !h-[calc(100%-40px)]"
          :time-from="0 * 60"
          :time-step="60"
          :time-cell-height="72"
          :events="calendarEvents"
          :views="['week']"
          time-at-cursor
          :snap-to-interval="15"
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
                {{ t('admin.calendars.eventDisplay.maxStudents', { limit: event.limit }) }}
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
              {{ t('admin.calendars.today') }}
            </button>
          </template>
        </VueCal>
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

    <!-- Choice dialog: new classroom or existing classroom -->
    <a-modal
      v-model:open="showChoiceDialog"
      :title="t('admin.calendars.choiceDialog.title')"
      :footer="null"
      @cancel="cancelCreation"
    >
      <div class="space-y-4 py-4">
        <div class="text-sm text-gray-600 mb-4">
          {{ t('admin.calendars.choiceDialog.message') }}
        </div>
        <div class="flex flex-col gap-3">
          <a-button
            type="primary"
            size="large"
            class="!h-12 !text-base !font-medium"
            @click="handleChoiceSelected('new_classroom')"
          >
            {{ t('admin.calendars.choiceDialog.newClassroom') }}
          </a-button>
          <a-button
            type="default"
            size="large"
            class="!h-12 !text-base !font-medium"
            @click="handleChoiceSelected('existing_classroom')"
          >
            {{ t('admin.calendars.choiceDialog.existingClassroom') }}
          </a-button>
        </div>
      </div>
    </a-modal>

    <!-- Reuse CreateClassroomDialog for editable event: pick or create classroom -->
    <CreateClassroomDialog
      v-model:open="showPickClassroomDialog"
      mode="select_or_create"
      :prefill-range="newEvent ? { start: newEvent.start, end: newEvent.end } : null"
      :initial-create-new="choiceForNewEvent === 'new_classroom'"
      @selected="handlePickedClassroom"
      @session-created="handleSessionCreatedFromDialog"
      @success="handleClassroomCreatedFromDialog"
    />

    <!-- Recurring event edit dialog -->
    <a-modal
      v-model:open="showRecurringEditDialog"
      :title="t('admin.calendars.recurringEditDialog.title')"
      :footer="null"
      :mask-closable="false"
      @cancel="handleRecurringEditCancel"
    >
      <div class="py-4">
        <a-radio-group v-model:value="recurringEditOption" class="flex flex-col gap-3">
          <a-radio value="this_event">
            {{ t('admin.calendars.recurringEditDialog.thisEvent') }}
          </a-radio>
          <a-radio value="all">
            {{ t('admin.calendars.recurringEditDialog.allEvents') }}
          </a-radio>
          <a-radio value="from_this">
            {{ t('admin.calendars.recurringEditDialog.fromThisEvent') }}
          </a-radio>
          <a-radio value="same_weekday">
            {{ t('admin.calendars.recurringEditDialog.sameWeekday') }}
          </a-radio>
        </a-radio-group>

        <div class="flex justify-end gap-2 mt-6">
          <a-button @click="handleRecurringEditCancel">
            {{ t('admin.calendars.recurringEditDialog.cancel') }}
          </a-button>
          <a-button type="primary" :loading="isUpdatingSessionTime" @click="handleRecurringEditSave">
            {{ t('admin.calendars.recurringEditDialog.save') }}
          </a-button>
        </div>
      </div>
    </a-modal>

    <!-- VueCal editable-event creation dialog -->
    <a-modal
      v-model:open="showCreationDialog"
      :title="t('admin.calendars.createSessionDialog.title')"
      :ok-text="t('admin.calendars.createSessionDialog.ok')"
      :cancel-text="t('admin.calendars.createSessionDialog.cancel')"
      @ok="validateCreation"
      @cancel="cancelCreation"
    >
      <div v-if="newEvent" class="space-y-4">
        <div class="text-xs text-gray-500">
          {{ dayjs(newEvent.start).format('DD/MM/YYYY HH:mm') }} → {{ dayjs(newEvent.end).format('DD/MM/YYYY HH:mm') }}
        </div>

        <div>
          <div class="text-xs text-gray-600 mb-1">
            {{ t('admin.calendars.createSessionDialog.sessionTitle') }}
          </div>
          <a-input v-model:value="creationForm.title" :placeholder="t('admin.calendars.createSessionDialog.sessionTitlePlaceholder')" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div class="text-xs text-gray-600 mb-1">
              {{ t('admin.calendars.createSessionDialog.eventClass') }}
            </div>
            <a-input v-model:value="creationForm.class" :placeholder="t('admin.calendars.createSessionDialog.eventClassPlaceholder')" />
          </div>
          <div class="flex items-center gap-3 pt-5">
            <a-switch v-model:checked="creationForm.background" />
            <span class="text-sm text-gray-700">{{ t('admin.calendars.createSessionDialog.background') }}</span>
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
