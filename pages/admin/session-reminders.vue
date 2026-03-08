<script setup lang="ts">
import type { SessionReminder, ReminderConfig, ReminderRunLog } from '~/composables/api/useReminderApi'
import { useReminderApi } from '~/composables/api/useReminderApi'
import { notification } from 'ant-design-vue'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
})

useHead({
  title: 'Nhắc nhở buổi học',
})

const { getConfig, updateConfig, getReminders, getRunLogs } = useReminderApi()

// Active tab
const activeTab = ref<'logs' | 'reminders'>('logs')

// Config state
const config = ref<ReminderConfig | null>(null)
const configLoading = ref(false)
const configSaving = ref(false)

// Run logs state
const runLogs = ref<ReminderRunLog[]>([])
const runLogsTotal = ref(0)
const runLogsLoading = ref(false)
const runLogsPage = ref(1)
const runLogsPageSize = ref(20)
const expandedLogId = ref<string | null>(null)
const logStatusFilter = ref('')

// Reminder list state
const reminders = ref<SessionReminder[]>([])
const totalCount = ref(0)
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)

// Filters
const filterDateFrom = ref('')
const filterDateTo = ref('')

// Load config
async function loadConfig() {
  try {
    configLoading.value = true
    config.value = await getConfig()
  }
  catch (e) {
    console.error('Load reminder config:', e)
  }
  finally {
    configLoading.value = false
  }
}

// Toggle reminder on/off
async function toggleEnabled() {
  if (!config.value) return
  try {
    configSaving.value = true
    const newValue = !config.value.is_enabled
    config.value = await updateConfig({ is_enabled: newValue })
    notification.success({
      message: newValue ? 'Đã bật nhắc nhở' : 'Đã tắt nhắc nhở',
    })
  }
  catch (e) {
    console.error('Toggle reminder:', e)
    notification.error({ message: 'Không thể cập nhật cấu hình' })
  }
  finally {
    configSaving.value = false
  }
}

// Save config (minutes before + run frequency)
async function saveConfig() {
  if (!config.value) return
  try {
    configSaving.value = true
    config.value = await updateConfig({
      reminder_minutes_before: config.value.reminder_minutes_before,
      run_every_minutes: config.value.run_every_minutes,
    })
    notification.success({ message: 'Đã lưu cấu hình' })
  }
  catch (e) {
    console.error('Save config:', e)
    notification.error({ message: 'Không thể lưu cấu hình' })
  }
  finally {
    configSaving.value = false
  }
}

// Load run logs
async function loadRunLogs() {
  try {
    runLogsLoading.value = true
    const offset = (runLogsPage.value - 1) * runLogsPageSize.value
    const res = await getRunLogs({
      status: logStatusFilter.value || undefined,
      limit: runLogsPageSize.value,
      offset,
    })
    runLogs.value = res.results || []
    runLogsTotal.value = res.count || 0
  }
  catch (e) {
    console.error('Load run logs:', e)
    runLogs.value = []
    runLogsTotal.value = 0
  }
  finally {
    runLogsLoading.value = false
  }
}

function onRunLogsPageChange(page: number) {
  runLogsPage.value = page
  loadRunLogs()
}

function toggleExpandLog(id: string) {
  expandedLogId.value = expandedLogId.value === id ? null : id
}

function filterLogsByStatus(status: string) {
  logStatusFilter.value = status
  runLogsPage.value = 1
  loadRunLogs()
}

// Load reminders list
async function loadReminders() {
  try {
    loading.value = true
    const offset = (currentPage.value - 1) * pageSize.value
    const res = await getReminders({
      date_from: filterDateFrom.value || undefined,
      date_to: filterDateTo.value || undefined,
      limit: pageSize.value,
      offset,
    })
    reminders.value = res.results || []
    totalCount.value = res.count || 0
  }
  catch (e) {
    console.error('Load reminders:', e)
    reminders.value = []
    totalCount.value = 0
  }
  finally {
    loading.value = false
  }
}

function onPageChange(page: number) {
  currentPage.value = page
  loadReminders()
}

function applyFilters() {
  currentPage.value = 1
  loadReminders()
}

function clearFilters() {
  filterDateFrom.value = ''
  filterDateTo.value = ''
  currentPage.value = 1
  loadReminders()
}

// Format datetime for display
function formatDateTime(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
}

function statusLabel(status: string) {
  if (status === 'success') return 'Thành công'
  if (status === 'skipped') return 'Bỏ qua'
  if (status === 'error') return 'Lỗi'
  return status
}

function statusColor(status: string) {
  if (status === 'success') return 'bg-green-100 text-green-700'
  if (status === 'skipped') return 'bg-yellow-100 text-yellow-700'
  if (status === 'error') return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-700'
}

function durationMs(startedAt: string, finishedAt: string) {
  if (!startedAt || !finishedAt) return ''
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime()
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// Init
onMounted(() => {
  loadConfig()
  loadRunLogs()
})
</script>

<template>
  <div class="session-reminders-page">
    <!-- Page Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">
        Nhắc nhở buổi học
      </h1>
      <p class="mt-2 text-gray-600">
        Cấu hình gửi email nhắc nhở tự động cho học sinh trước khi buổi học bắt đầu
      </p>
    </div>

    <!-- Config Section -->
    <div class="bg-white rounded-lg shadow p-6 mb-8">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">
        Cấu hình cronjob
      </h2>

      <div v-if="configLoading" class="flex justify-center py-8">
        <a-spin />
      </div>

      <div v-else-if="config" class="space-y-6">
        <!-- Toggle on/off -->
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-medium text-gray-900">
              Bật nhắc nhở tự động
            </h3>
            <p class="text-sm text-gray-500">
              Khi bật, hệ thống sẽ tự động gửi email nhắc nhở cho học sinh trước giờ học
            </p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              :checked="config.is_enabled"
              class="sr-only peer"
              :disabled="configSaving"
              @change="toggleEnabled"
            >
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
          </label>
        </div>

        <!-- Minutes before -->
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Gửi nhắc nhở trước (phút)
            </label>
            <input
              v-model.number="config.reminder_minutes_before"
              type="number"
              min="5"
              max="120"
              class="w-full max-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Tần suất kiểm tra (phút)
            </label>
            <p class="text-sm text-gray-500 mb-1">
              Cronjob sẽ chạy mỗi bao nhiêu phút để kiểm tra và gửi nhắc nhở
            </p>
            <input
              v-model.number="config.run_every_minutes"
              type="number"
              min="1"
              max="60"
              class="w-full max-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
          </div>
          <div>
            <button
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              :disabled="configSaving"
              @click="saveConfig"
            >
              Lưu cấu hình
            </button>
          </div>
        </div>

        <!-- Status info -->
        <div class="p-4 rounded-lg" :class="config.is_enabled ? 'bg-green-50' : 'bg-gray-50'">
          <div class="flex items-center gap-2">
            <div
              class="w-2 h-2 rounded-full"
              :class="config.is_enabled ? 'bg-green-500' : 'bg-gray-400'"
            />
            <span class="text-sm font-medium" :class="config.is_enabled ? 'text-green-700' : 'text-gray-600'">
              {{ config.is_enabled ? 'Đang hoạt động' : 'Đã tắt' }}
            </span>
          </div>
          <p v-if="config.updated_at" class="text-xs text-gray-500 mt-1">
            Cập nhật lần cuối: {{ formatDateTime(config.updated_at) }}
            <span v-if="config.updated_by_email"> bởi {{ config.updated_by_email }}</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="flex gap-1 mb-6 border-b border-gray-200">
      <button
        class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
        :class="activeTab === 'logs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
        @click="activeTab = 'logs'; loadRunLogs()"
      >
        Log chạy cronjob
      </button>
      <button
        class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
        :class="activeTab === 'reminders' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
        @click="activeTab = 'reminders'; loadReminders()"
      >
        Lịch sử nhắc nhở đã gửi
      </button>
    </div>

    <!-- Run Logs Tab -->
    <div v-if="activeTab === 'logs'" class="bg-white rounded-lg shadow">
      <div class="p-6 border-b border-gray-200">
        <h2 class="text-xl font-semibold text-gray-900">
          Log chạy cronjob
        </h2>
        <p class="text-sm text-gray-500 mt-1">
          Mỗi lần cronjob thực thi sẽ được ghi lại ở đây
        </p>

        <!-- Status filter -->
        <div class="mt-4 flex flex-wrap gap-2">
          <button
            class="px-3 py-1.5 rounded-lg text-sm transition-colors"
            :class="logStatusFilter === '' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
            @click="filterLogsByStatus('')"
          >
            Tất cả
          </button>
          <button
            class="px-3 py-1.5 rounded-lg text-sm transition-colors"
            :class="logStatusFilter === 'success' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
            @click="filterLogsByStatus('success')"
          >
            Thành công
          </button>
          <button
            class="px-3 py-1.5 rounded-lg text-sm transition-colors"
            :class="logStatusFilter === 'skipped' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
            @click="filterLogsByStatus('skipped')"
          >
            Bỏ qua
          </button>
          <button
            class="px-3 py-1.5 rounded-lg text-sm transition-colors"
            :class="logStatusFilter === 'error' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
            @click="filterLogsByStatus('error')"
          >
            Lỗi
          </button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <div v-if="runLogsLoading" class="flex justify-center py-12">
          <a-spin />
        </div>

        <div v-else-if="runLogs.length > 0">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th class="px-6 py-3 text-left w-8" />
                <th class="px-6 py-3 text-left">Thời gian chạy</th>
                <th class="px-6 py-3 text-left">Trạng thái</th>
                <th class="px-6 py-3 text-left">Session quét</th>
                <th class="px-6 py-3 text-left">Session khớp</th>
                <th class="px-6 py-3 text-left">Email gửi</th>
                <th class="px-6 py-3 text-left">Thời lượng</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <template v-for="log in runLogs" :key="log.id">
                <tr
                  class="hover:bg-gray-50 cursor-pointer"
                  @click="toggleExpandLog(log.id)"
                >
                  <td class="px-6 py-4">
                    <Icon
                      name="i-heroicons-chevron-right"
                      class="w-4 h-4 text-gray-400 transition-transform"
                      :class="{ 'rotate-90': expandedLogId === log.id }"
                    />
                  </td>
                  <td class="px-6 py-4 text-gray-900">
                    {{ formatDateTime(log.started_at) }}
                  </td>
                  <td class="px-6 py-4">
                    <span
                      class="px-2 py-0.5 rounded-full text-xs font-medium"
                      :class="statusColor(log.status)"
                    >
                      {{ statusLabel(log.status) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-gray-700">
                    {{ log.sessions_scanned.length }}
                  </td>
                  <td class="px-6 py-4 text-gray-700">
                    {{ log.sessions_matched.length }}
                  </td>
                  <td class="px-6 py-4 text-gray-700 font-medium">
                    {{ log.emails_queued_count }}
                  </td>
                  <td class="px-6 py-4 text-gray-500">
                    {{ durationMs(log.started_at, log.finished_at) }}
                  </td>
                </tr>

                <!-- Expanded detail row -->
                <tr v-if="expandedLogId === log.id">
                  <td colspan="7" class="px-6 py-4 bg-gray-50">
                    <div class="space-y-4">
                      <!-- Error message -->
                      <div v-if="log.error_message" class="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p class="text-sm font-medium text-red-700">Lỗi:</p>
                        <p class="text-sm text-red-600 mt-1">
                          {{ log.error_message }}
                        </p>
                      </div>

                      <!-- Sessions scanned -->
                      <div v-if="log.sessions_scanned.length > 0">
                        <h4 class="text-sm font-semibold text-gray-700 mb-2">
                          Session đã quét ({{ log.sessions_scanned.length }})
                        </h4>
                        <div class="overflow-x-auto">
                          <table class="w-full text-xs border border-gray-200 rounded">
                            <thead class="bg-gray-100">
                              <tr>
                                <th class="px-3 py-2 text-left">Buổi học</th>
                                <th class="px-3 py-2 text-left">Lớp</th>
                                <th class="px-3 py-2 text-left">Giờ học</th>
                              </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">
                              <tr v-for="s in log.sessions_scanned" :key="s.session_id">
                                <td class="px-3 py-2">{{ s.topic }}</td>
                                <td class="px-3 py-2">{{ s.classroom }}</td>
                                <td class="px-3 py-2">{{ s.start_time }}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <!-- Sessions matched -->
                      <div v-if="log.sessions_matched.length > 0">
                        <h4 class="text-sm font-semibold text-gray-700 mb-2">
                          Session thoả điều kiện gửi ({{ log.sessions_matched.length }})
                        </h4>
                        <div class="overflow-x-auto">
                          <table class="w-full text-xs border border-gray-200 rounded">
                            <thead class="bg-gray-100">
                              <tr>
                                <th class="px-3 py-2 text-left">Buổi học</th>
                                <th class="px-3 py-2 text-left">Lớp</th>
                                <th class="px-3 py-2 text-left">Giờ học</th>
                                <th class="px-3 py-2 text-left">Số email</th>
                              </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">
                              <tr v-for="s in log.sessions_matched" :key="s.session_id">
                                <td class="px-3 py-2">{{ s.topic }}</td>
                                <td class="px-3 py-2">{{ s.classroom }}</td>
                                <td class="px-3 py-2">{{ s.start_time }}</td>
                                <td class="px-3 py-2 font-medium">{{ s.emails_count }}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <!-- Emails queued -->
                      <div v-if="log.emails_queued.length > 0">
                        <h4 class="text-sm font-semibold text-gray-700 mb-2">
                          Danh sách email đã gửi ({{ log.emails_queued.length }})
                        </h4>
                        <div class="overflow-x-auto">
                          <table class="w-full text-xs border border-gray-200 rounded">
                            <thead class="bg-gray-100">
                              <tr>
                                <th class="px-3 py-2 text-left">Email</th>
                                <th class="px-3 py-2 text-left">Tài khoản</th>
                                <th class="px-3 py-2 text-left">Buổi học</th>
                              </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">
                              <tr v-for="(e, idx) in log.emails_queued" :key="idx">
                                <td class="px-3 py-2">{{ e.email }}</td>
                                <td class="px-3 py-2">{{ e.username }}</td>
                                <td class="px-3 py-2">{{ e.session_topic }}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <!-- No data message -->
                      <div v-if="log.sessions_scanned.length === 0 && log.sessions_matched.length === 0 && !log.error_message" class="text-sm text-gray-500">
                        Không có session nào trong khung thời gian kiểm tra
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div v-else class="text-center py-12 text-gray-500">
          Chưa có log nào
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="runLogsTotal > runLogsPageSize" class="flex items-center justify-between px-6 py-4 border-t border-gray-200">
        <span class="text-sm text-gray-600">
          Tổng {{ runLogsTotal }} log
        </span>
        <div class="flex gap-2">
          <button
            class="px-3 py-1 rounded border text-sm disabled:opacity-50"
            :disabled="runLogsPage <= 1"
            @click="onRunLogsPageChange(runLogsPage - 1)"
          >
            Trước
          </button>
          <span class="px-3 py-1 text-sm text-gray-600">
            Trang {{ runLogsPage }} / {{ Math.ceil(runLogsTotal / runLogsPageSize) }}
          </span>
          <button
            class="px-3 py-1 rounded border text-sm disabled:opacity-50"
            :disabled="runLogsPage >= Math.ceil(runLogsTotal / runLogsPageSize)"
            @click="onRunLogsPageChange(runLogsPage + 1)"
          >
            Sau
          </button>
        </div>
      </div>
    </div>

    <!-- Reminders List Tab -->
    <div v-if="activeTab === 'reminders'" class="bg-white rounded-lg shadow">
      <div class="p-6 border-b border-gray-200">
        <h2 class="text-xl font-semibold text-gray-900">
          Lịch sử nhắc nhở đã gửi
        </h2>

        <!-- Filters -->
        <div class="mt-4 flex flex-wrap items-end gap-4">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Từ ngày</label>
            <input
              v-model="filterDateFrom"
              type="date"
              class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Đến ngày</label>
            <input
              v-model="filterDateTo"
              type="date"
              class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
          </div>
          <button
            class="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            @click="applyFilters"
          >
            Lọc
          </button>
          <button
            class="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
            @click="clearFilters"
          >
            Xoá bộ lọc
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <div v-if="loading" class="flex justify-center py-12">
          <a-spin />
        </div>

        <table v-else-if="reminders.length > 0" class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th class="px-6 py-3 text-left">Học sinh</th>
              <th class="px-6 py-3 text-left">Email gửi đến</th>
              <th class="px-6 py-3 text-left">Buổi học</th>
              <th class="px-6 py-3 text-left">Lớp</th>
              <th class="px-6 py-3 text-left">Giờ học</th>
              <th class="px-6 py-3 text-left">Gửi lúc</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="r in reminders" :key="r.id" class="hover:bg-gray-50">
              <td class="px-6 py-4">
                <div class="font-medium text-gray-900">
                  {{ r.user.username }}
                </div>
                <div class="text-xs text-gray-500">
                  {{ r.user.email }}
                </div>
              </td>
              <td class="px-6 py-4 text-gray-700">
                {{ r.email_sent_to }}
              </td>
              <td class="px-6 py-4 text-gray-900">
                {{ r.session.topic }}
              </td>
              <td class="px-6 py-4 text-gray-700">
                {{ r.classroom.title }}
              </td>
              <td class="px-6 py-4 text-gray-700">
                {{ formatDateTime(r.session.start_time) }}
              </td>
              <td class="px-6 py-4 text-gray-500">
                {{ formatDateTime(r.sent_at) }}
              </td>
            </tr>
          </tbody>
        </table>

        <div v-else class="text-center py-12 text-gray-500">
          Chưa có nhắc nhở nào được gửi
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalCount > pageSize" class="flex items-center justify-between px-6 py-4 border-t border-gray-200">
        <span class="text-sm text-gray-600">
          Tổng {{ totalCount }} nhắc nhở
        </span>
        <div class="flex gap-2">
          <button
            class="px-3 py-1 rounded border text-sm disabled:opacity-50"
            :disabled="currentPage <= 1"
            @click="onPageChange(currentPage - 1)"
          >
            Trước
          </button>
          <span class="px-3 py-1 text-sm text-gray-600">
            Trang {{ currentPage }} / {{ Math.ceil(totalCount / pageSize) }}
          </span>
          <button
            class="px-3 py-1 rounded border text-sm disabled:opacity-50"
            :disabled="currentPage >= Math.ceil(totalCount / pageSize)"
            @click="onPageChange(currentPage + 1)"
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
