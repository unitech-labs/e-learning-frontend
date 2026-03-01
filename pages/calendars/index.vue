<script setup lang="ts">
import type { CalendarClassroom } from '~/types/course.type'
import { notification } from 'ant-design-vue'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { VueCal } from 'vue-cal'
import EventDetailDialog from '~/components/calendar/EventDetailDialog.vue'
import { useClassroomApi } from '~/composables/api/useClassroomApi'
import 'vue-cal/style'

// Enable UTC and timezone plugins for dayjs
dayjs.extend(utc)
dayjs.extend(timezone)

// Timezone selector (shared composable, persisted in localStorage)
const { TIMEZONE_OPTIONS, selectedTimezone } = useTimezone()

const { t } = useI18n()

export interface CalendarEvent {
  start: Date
  end: Date
  title: string
  class?: string
  content?: string
  deletable?: boolean
  resizable?: boolean
  schedule?: number
  id?: string
  description?: string
  meeting_link?: string
  classroom_id?: string
  classroom?: CalendarClassroom
  course_title?: string
  backgroundColor?: string
  is_enrolled?: boolean
}

// Default background color if classroom doesn't have background_color
const DEFAULT_BACKGROUND_COLOR = '#268100' // Green

// Format event time (from Date to "HH:mm")
function formatEventTime(dateTime: Date | string): string {
  if (!dateTime)
    return ''
  const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime
  return dayjs(date).format('HH:mm')
}

// Helper function to safely extract time from date string or Date
function extractTimeFromDateString(dateString: Date | string | undefined): string {
  if (!dateString)
    return ''
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return dayjs(date).format('HH:mm')
}

interface DemoExample {
  events: CalendarEvent[]
}

const ready: Ref<boolean> = ref(false)
const loading: Ref<boolean> = ref(false)
const upcomingEvents: Ref<CalendarEvent[]> = ref([])
const isDatePickerOpen: Ref<boolean> = ref(false)

// Join class dialog state
const isJoinClassDialogVisible = ref(false)
const selectedEventForJoin = ref<CalendarEvent | null>(null)
const isJoiningClass = ref(false)
const checkInError = ref<string | null>(null)

// Event detail dialog state
const showEventDetailDialog = ref(false)
const selectedEventForDetail = ref<CalendarEvent | null>(null)

const data: Ref<DemoExample> = ref({
  editable: false,
  events: [],
})

const selectedDate: Ref<Date> = ref(new Date())
const viewDate: Ref<Date> = ref(new Date())
const currentView: Ref<string> = ref('week')

// VueCal template ref
const vueCalRef = ref<any>(null)

// API composable
const { getCalendarData, selfCheckInSession } = useClassroomApi()

function convertSessionTime(isoString: string): Date {
  const raw = isoString.replace('Z', '')
  if (selectedTimezone.value === 'Asia/Ho_Chi_Minh') {
    return new Date(raw)
  }
  const inVietnam = dayjs.tz(raw, 'Asia/Ho_Chi_Minh')
  const inTarget = inVietnam.tz(selectedTimezone.value)
  return new Date(inTarget.format('YYYY-MM-DDTHH:mm:ss'))
}

// Convert session data to calendar events
function convertSessionToEvent(session: any): CalendarEvent {
  return {
    id: session.id,
    start: convertSessionTime(session.start_time),
    end: convertSessionTime(session.end_time),
    title: session.classroom_title || session.topic,
    classroom_id: session.classroom,
    course_title: session.course_title,
    meeting_link: session.meeting_link || '',
    resizable: false,
    schedule: 1,
    // Use background_color from session if available, otherwise default
    backgroundColor: session.background_color || DEFAULT_BACKGROUND_COLOR,
    is_enrolled: session.is_enrolled,
  }
}

// Fetch calendar data
async function fetchCalendarData() {
  if (!vueCalRef.value?.view) {
    return
  }

  try {
    loading.value = true
    data.value.events = []

    const view = vueCalRef.value.view
    let startDate: string | undefined
    let endDate: string | undefined

    if (view && view.cellDates && view.cellDates.length > 0) {
      const firstCell = view.cellDates[0]
      const lastCell = view.cellDates[view.cellDates.length - 1]
      startDate = firstCell.startFormatted // YYYY-MM-DD
      endDate = lastCell.startFormatted // YYYY-MM-DD
    }

    const response = await getCalendarData({
      start_date: startDate,
      end_date: endDate,
    })

    // Convert sessions to calendar events
    const events: CalendarEvent[] = []
    response.results.forEach((session: any) => {
      events.push(convertSessionToEvent(session))
    })

    data.value.events = events

    // Find events happening today
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()) // Start of today
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000) // Start of tomorrow

    const todayEvents = response.results
      .map((session: any) => convertSessionToEvent(session))
      .filter((event: CalendarEvent) => {
        const eventDate = new Date(event.start)
        return eventDate >= today && eventDate < tomorrow
      })
      .sort((a: CalendarEvent, b: CalendarEvent) => new Date(a.start).getTime() - new Date(b.start).getTime())

    upcomingEvents.value = todayEvents
  }
  catch (error) {
    console.error('Error fetching calendar data:', error)
  }
  finally {
    loading.value = false
  }
}

// Watch for view date changes (week changes)
watch(viewDate, (newViewDate) => {
  // Update selectedDate to the first day of the week when navigating
  if (currentView.value === 'week') {
    const firstDayOfWeek = new Date(newViewDate)
    const dayOfWeek = firstDayOfWeek.getDay()
    const diff = firstDayOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust for Monday start
    firstDayOfWeek.setDate(diff)
    selectedDate.value = firstDayOfWeek
  }
  // Fetch calendar data when view date changes
  nextTick(() => {
    fetchCalendarData()
  })
})

// Handle previous button click
function handlePreviousClick() {
  if (vueCalRef.value?.view) {
    vueCalRef.value.view.previous()

    // Wait for view to update, then reload data for new week
    nextTick(() => {
      fetchCalendarData()
    })
  }
}

// Handle next button click
function handleNextClick() {
  if (vueCalRef.value?.view) {
    vueCalRef.value.view.next()

    // Wait for view to update, then reload data for new week
    nextTick(() => {
      fetchCalendarData()
    })
  }
}

// Handle today button click
function handleTodayClick() {
  if (vueCalRef.value?.view) {
    vueCalRef.value.view.goToToday()

    // Update viewDate and selectedDate to today
    const today = new Date()
    viewDate.value = today
    selectedDate.value = today

    // Wait for view to update, then reload data
    nextTick(() => {
      fetchCalendarData()
    })
  }
}

// Watch for selected date changes
// watch(selectedDate, async () => {
//   await fetchCalendarData()
// })

// Watch for view changes
// watch(currentView, async () => {
//   await fetchCalendarData()
// })

// Handle event click to show detail dialog
function openEventDetail(event: any) {
  if (!event.event.is_enrolled) {
    // show toast bạn không thuộc lớp này
    notification.error({
      message: t('calendar.notInClass'),
      description: t('calendar.notInClass'),
      duration: 5,
    })
    return
  }
  const calendarEvent = event.event as CalendarEvent
  selectedEventForDetail.value = calendarEvent
  showEventDetailDialog.value = true
}

// Handle join class
function startJoinClass(event: CalendarEvent) {
  // close event detail dialog
  selectedEventForJoin.value = event
  checkInError.value = null // Reset error when opening dialog
  isJoinClassDialogVisible.value = true
}

// Confirm join class
async function confirmJoinClass() {
  if (!selectedEventForJoin.value?.id || !selectedEventForJoin.value?.classroom_id || !selectedEventForJoin.value?.meeting_link) {
    return
  }

  try {
    isJoiningClass.value = true
    checkInError.value = null

    // Call self check-in API
    await selfCheckInSession(selectedEventForJoin.value.id, selectedEventForJoin.value.classroom_id)

    // Open meeting link in new tab only if check-in succeeds
    if (selectedEventForJoin.value.meeting_link) {
      window.open(selectedEventForJoin.value.meeting_link, '_blank')
    }

    // Close dialog and reset state
    isJoinClassDialogVisible.value = false
    selectedEventForJoin.value = null
  }
  catch (error: any) {
    console.error('Error checking in to session:', error)

    if (error?.data?.attendance?.status === 'present') {
      if (selectedEventForJoin.value?.meeting_link) {
        window.open(selectedEventForJoin.value?.meeting_link, '_blank')
      }
      return
    }
    // Handle check-in availability error
    if (error?.data?.detail) {
      const errorMessage = error.data.detail

      // Check if it's a "check-in not yet available" error
      if (errorMessage.includes('Check-in not yet available')) {
        checkInError.value = 'checkInTooEarly'
      }
      else {
        // Use the backend message as i18n key for other errors
        checkInError.value = errorMessage
      }
    }
    else {
      checkInError.value = 'checkInFailed'
    }

    // Don't open meeting link if check-in fails
  }
  finally {
    isJoiningClass.value = false
  }
}

// Check if event has ended
function isEventEnded(event: CalendarEvent): boolean {
  const now = new Date()
  const eventEndTime = new Date(event.end)
  return eventEndTime < now
}

// Cancel join class
function cancelJoinClass() {
  isJoinClassDialogVisible.value = false
  selectedEventForJoin.value = null
  checkInError.value = null
}

function handleCalendarReady({ view }: any) {
  view.scrollToCurrentTime()
  if (!ready.value) {
    nextTick(() => {
      fetchCalendarData()
    })
  }
}

// Re-render calendar events when timezone changes
watch(selectedTimezone, () => {
  fetchCalendarData()
})

onMounted(async () => {
  setTimeout(() => {
    ready.value = true
  }, 400)
})
</script>

<template>
  <div class="min-h-screen bg-slate-100">
    <main class="mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <div class="max-md:flex-col flex items-stretch gap-8">
        <section class="flex w-full md:max-w-[300px] flex-col gap-6 max-md:flex-row">
          <div class="max-md:flex-1 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div
              class="border-b border-slate-200 px-6 py-4 cursor-pointer hover:bg-slate-50 rounded-xl transition-colors"
              @click="isDatePickerOpen = !isDatePickerOpen"
            >
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-base font-semibold text-slate-900">
                    {{ $t('calendar.datePicker.title') }}
                  </h3>
                  <p class="mt-1 text-sm text-slate-500">
                    {{ $t('calendar.datePicker.description') }}
                  </p>
                </div>
                <Icon
                  :name="isDatePickerOpen ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                  class="h-5 w-5 text-slate-400 transition-transform"
                />
              </div>
            </div>
            <div
              v-show="isDatePickerOpen"
              class="px-4 py-4 transition-all duration-200"
            >
              <VueCal
                v-model:selected-date="selectedDate"
                class="!w-full custom-theme date-picker"
                date-picker
                view="month"
                :view-date="viewDate"
                :views-bar="false"
                style="height: 320px"
                @update:selected-date="viewDate = $event"
              />
            </div>
          </div>

          <div class="max-md:flex-1 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 class="text-base font-semibold text-slate-900">
                {{ $t('calendar.upcomingEvents.title') }}
              </h3>
              <span class="text-xs font-medium uppercase tracking-wide text-slate-500">
                {{ upcomingEvents.length > 0 ? $t('calendar.upcomingEvents.hasEvents') : $t('calendar.upcomingEvents.noEvents') }}
              </span>
            </div>
            <div class="px-6 py-5">
              <div v-if="loading" class="flex flex-col items-center justify-center gap-3 py-8">
                <div class="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-300" />
                <span class="text-sm font-medium text-slate-400">{{ $t('calendar.loading') }}</span>
              </div>
              <div v-else-if="upcomingEvents.length > 0" class="space-y-3">
                <div
                  v-for="event in upcomingEvents"
                  :key="event.id"
                  class="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex-1 min-w-0">
                      <h4 class="text-base font-semibold text-slate-900 line-clamp-2">
                        {{ event.title }}
                      </h4>
                      <div class="mt-2 flex flex-col items-start gap-2 text-sm text-slate-600">
                        <div class="flex items-center gap-1.5 max-w-full">
                          <Icon name="i-heroicons-clock" size="16" class="h-4 w-4 text-slate-400" />
                          <span class="font-medium">{{ extractTimeFromDateString(event.start) }} - {{ extractTimeFromDateString(event.end) }}</span>
                        </div>
                        <div class="flex items-center gap-1.5 max-w-full">
                          <Icon name="i-heroicons-academic-cap" size="16" class="h-4 w-4 text-slate-400" />
                          <span class="truncate">{{ event.course_title || $t('calendar.event.noInfo') }}</span>
                        </div>
                      </div>
                    </div>
                    <div v-if="isEventEnded(event)" class="flex-shrink-0">
                      <span class="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {{ $t('calendar.event.ended') }}
                      </span>
                    </div>
                  </div>
                  <div class="mt-3">
                    <a-button
                      v-if="!isEventEnded(event) && event.meeting_link"
                      type="primary"
                      size="small"
                      class="!h-8 !w-full justify-center !rounded-full !flex !items-center !text-xs !font-semibold"
                      @click="startJoinClass(event)"
                    >
                      <Icon name="i-heroicons-video-camera" size="16" class="h-4 w-4" />
                      <span class="ml-1.5">{{ $t('calendar.joinClass.joinNow') }}</span>
                    </a-button>
                    <div
                      v-else-if="!isEventEnded(event) && !event.meeting_link"
                      class="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-500"
                    >
                      <Icon name="i-heroicons-exclamation-triangle" class="h-3 w-3" />
                      <span>{{ $t('calendar.event.noMeetingLink') }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="flex flex-col items-center gap-3 py-8 text-center text-slate-400">
                <div class="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
                  <Icon name="i-heroicons-calendar-days" class="h-6 w-6" />
                </div>
                <p class="text-sm font-medium">
                  {{ $t('calendar.upcomingEvents.noClassesToday') }}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section class="flex-auto flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div class="p-2 flex items-center gap-2 border-b border-slate-200">
            <span class="text-xs font-medium text-gray-500">Múi giờ:</span>
            <a-segmented
              v-model:value="selectedTimezone"
              :options="TIMEZONE_OPTIONS.map(opt => ({ label: opt.label, value: opt.value }))"
              size="small"
            />
          </div>
          <div class="p-4 flex-auto flex overflow-hidden">
            <VueCal
              ref="vueCalRef"
              v-model:selected-date="selectedDate"
              v-model:view-date="viewDate"
              v-model:view="currentView"
              :views-bar="false"
              class="custom-theme calendar w-full !h-auto"
              :time-from="0 * 60"
              :time-step="60"
              :time-to="24 * 60"
              :time-cell-height="72"
              :events="data.events"
              :views="['week']"
              time-at-cursor
              @ready="handleCalendarReady"
              @event-click="openEventDetail"
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
        </section>
      </div>
    </main>
  </div>

  <a-modal
    v-model:open="isJoinClassDialogVisible"
    :title="null"
    :footer="null"
    width="520px"
    class="join-class-modal"
    @cancel="cancelJoinClass"
  >
    <div class="px-6 py-8 text-center">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon name="i-heroicons-video-camera" class="h-6 w-6" />
      </div>
      <h3 class="mt-6 text-2xl font-semibold text-slate-900">
        {{ $t('calendar.modal.title') }}
      </h3>
      <p class="mt-2 text-sm text-slate-500">
        {{ $t('calendar.modal.confirmation') }}
      </p>

      <div v-if="selectedEventForJoin" class="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-6 text-left">
        <p class="text-base font-semibold text-slate-900">
          {{ selectedEventForJoin.title }}
        </p>
        <dl class="mt-4 space-y-3 text-sm text-slate-600">
          <div class="flex items-center justify-between gap-3">
            <dt v-if="extractTimeFromDateString(selectedEventForJoin.start) && extractTimeFromDateString(selectedEventForJoin.end)" class="flex items-center gap-2 font-medium text-slate-400">
              <Icon name="i-heroicons-clock" class="h-5 w-5 text-slate-300" />
              {{ $t('calendar.event.time') }}
            </dt>
            <dd class="font-semibold text-slate-600">
              {{ extractTimeFromDateString(selectedEventForJoin.start) }} - {{ extractTimeFromDateString(selectedEventForJoin.end) }}
            </dd>
          </div>
          <div class="flex items-center justify-between gap-3">
            <dt class="flex items-center gap-2 font-medium text-slate-400">
              <Icon name="i-heroicons-academic-cap" class="h-5 w-5 text-slate-300" />
              {{ $t('calendar.event.course') }}
            </dt>
            <dd class="flex-1 text-right font-medium text-slate-600">
              {{ selectedEventForJoin.course_title }}
            </dd>
          </div>
        </dl>
      </div>

      <div v-if="checkInError" class="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-left">
        <div class="flex items-start gap-3">
          <Icon name="i-heroicons-exclamation-triangle" class="mt-0.5 h-5 w-5 text-red-500" />
          <div>
            <p class="text-sm font-semibold text-red-700">
              {{ $t('calendar.error.cannotJoinClass') }}
            </p>
            <p class="mt-1 text-sm text-red-600">
              <template v-if="checkInError === 'checkInTooEarly'">
                {{ $t('calendar.error.checkInTooEarly') }}
              </template>
              <template v-else-if="checkInError === 'checkInFailed'">
                {{ $t('calendar.error.checkInFailed') }}
              </template>
              <template v-else>
                {{ checkInError }}
              </template>
            </p>
          </div>
        </div>
      </div>

      <div class="mt-8 flex justify-center gap-4">
        <a-button
          size="large"
          class="!h-11 !rounded-full !border-slate-200 !bg-white !px-7 !text-sm !font-semibold !text-slate-500 hover:!border-slate-300 hover:!text-slate-600"
          @click="cancelJoinClass"
        >
          {{ $t('calendar.modal.cancel') }}
        </a-button>
        <a-button
          type="primary"
          size="large"
          class="!h-11 gap-2 !rounded-full !flex !items-center !px-8 !text-sm !font-semibold"
          :loading="isJoiningClass"
          :disabled="!!checkInError"
          @click="confirmJoinClass"
        >
          <template #icon>
            <Icon name="i-heroicons-video-camera" size="20" class="h-5 w-5" />
          </template>
          {{ isJoiningClass ? $t('calendar.modal.joining') : $t('calendar.modal.joinNow') }}
        </a-button>
      </div>
    </div>
  </a-modal>

  <!-- Event Detail Dialog -->
  <EventDetailDialog
    v-model:visible="showEventDetailDialog"
    :event="selectedEventForDetail"
    @close="selectedEventForDetail = null"
    @join-class="startJoinClass"
  />
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
