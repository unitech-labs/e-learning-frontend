<script setup lang="ts">
import type { Notification } from '~/composables/api/useNotificationApi'
import { useNotificationApi } from '~/composables/api/useNotificationApi'

const { t } = useI18n()
const router = useRouter()
const notifApi = useNotificationApi()
const auth = useAuth()

const open = ref(false)
const notifications = ref<Notification[]>([])
const unreadCount = ref(0)
const isLoading = ref(false)
const isMarkingAll = ref(false)

// ─── Fetch unread count ───────────────────────────────────────────
async function fetchUnreadCount() {
  if (!auth.isLoggedIn.value) return
  try {
    const res = await notifApi.getUnreadCount()
    unreadCount.value = res.unread_count
  }
  catch {}
}

// ─── Fetch notification list ──────────────────────────────────────
async function fetchNotifications() {
  if (!auth.isLoggedIn.value) return
  try {
    isLoading.value = true
    const res = await notifApi.getNotifications({ limit: 15 })
    notifications.value = res.results
  }
  catch {}
  finally {
    isLoading.value = false
  }
}

// ─── Open/close dropdown ──────────────────────────────────────────
async function handleOpenChange(visible: boolean) {
  open.value = visible
  if (visible) {
    await fetchNotifications()
  }
}

// ─── Click on a notification ─────────────────────────────────────
async function handleNotificationClick(notif: Notification) {
  if (!notif.is_read) {
    try {
      await notifApi.markAsRead(notif.id)
      notif.is_read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
    catch {}
  }
  open.value = false
  if (notif.notification_type === 'order' && notif.order?.id) {
    router.push(`/admin/orders/`)
  }
  else if (notif.comment?.course_id && notif.comment?.lesson_id) {
    router.push(`/learning/${notif.comment.course_id}?lessonId=${notif.comment.lesson_id}&tab=comments`)
  }
}

// ─── Mark all as read ─────────────────────────────────────────────
async function handleMarkAllRead() {
  try {
    isMarkingAll.value = true
    await notifApi.markAllAsRead()
    notifications.value.forEach(n => (n.is_read = true))
    unreadCount.value = 0
  }
  catch {}
  finally {
    isMarkingAll.value = false
  }
}

// ─── Relative time ────────────────────────────────────────────────
function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return t('notificationBell.justNow')
  if (mins < 60) return t('notificationBell.minutesAgo', { n: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t('notificationBell.hoursAgo', { n: hours })
  const days = Math.floor(hours / 24)
  if (days < 7) return t('notificationBell.daysAgo', { n: days })
  return new Date(isoDate).toLocaleDateString('vi-VN')
}

// ─── Order status label ───────────────────────────────────────────
function orderStatusLabel(status: string): string {
  if (status === 'complete') return t('notificationBell.statusComplete')
  if (status === 'cancel') return t('notificationBell.statusCancel')
  return t('notificationBell.statusPending')
}

function orderStatusClass(status: string): string {
  if (status === 'complete') return 'text-green-600'
  if (status === 'cancel') return 'text-red-500'
  return 'text-yellow-600'
}

// ─── Poll unread count every 60s ─────────────────────────────────
let pollTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  fetchUnreadCount()
  pollTimer = setInterval(fetchUnreadCount, 60000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
  <a-dropdown
    :open="open"
    :trigger="['click']"
    placement="bottomRight"
    overlay-class-name="notification-dropdown"
    @open-change="handleOpenChange"
  >
    <!-- Bell button -->
    <button
      class="relative size-10 flex items-center justify-center hover:bg-gray-100 rounded-md transition-colors"
      :aria-label="t('notificationBell.ariaLabel')"
    >
      <Icon name="solar:bell-bold" size="24" class="text-gray-600" />
      <span
        v-if="unreadCount > 0"
        class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-semibold px-1 leading-none"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <!-- Dropdown panel -->
    <template #overlay>
      <div class="bg-white rounded-xl shadow-xl border border-gray-200 w-[360px] max-h-[520px] flex flex-col overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 class="font-semibold text-gray-900 text-base">
            {{ t('notificationBell.title') }}
            <span v-if="unreadCount > 0" class="ml-1.5 text-xs bg-red-100 text-red-600 rounded-full px-2 py-0.5 font-medium">
              {{ t('notificationBell.newCount', { count: unreadCount }) }}
            </span>
          </h3>
          <button
            v-if="unreadCount > 0"
            class="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 disabled:opacity-50"
            :disabled="isMarkingAll"
            @click.stop="handleMarkAllRead"
          >
            <Icon v-if="isMarkingAll" name="svg-spinners:ring-resize" size="12" />
            {{ t('notificationBell.markAllRead') }}
          </button>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="flex justify-center items-center py-10">
          <a-spin size="small" />
        </div>

        <!-- Notification list -->
        <div v-else-if="notifications.length > 0" class="overflow-y-auto flex-1">
          <div
            v-for="notif in notifications"
            :key="notif.id"
            class="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
            :class="!notif.is_read ? 'bg-blue-50/40' : ''"
            @click="handleNotificationClick(notif)"
          >
            <!-- Icon / Avatar -->
            <div class="flex-shrink-0 mt-0.5">
              <div v-if="notif.notification_type === 'order'" class="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center">
                <Icon name="solar:bag-heart-bold-duotone" size="18" class="text-orange-500" />
              </div>
              <a-avatar
                v-else
                :size="36"
                :src="notif.sender?.avatar || undefined"
              >
                {{ notif.sender?.full_name?.charAt(0) || '?' }}
              </a-avatar>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <!-- Order notification -->
              <template v-if="notif.notification_type === 'order'">
                <p class="text-sm text-gray-800 leading-snug">
                  <span class="font-semibold">{{ notif.sender?.full_name || t('notificationBell.unknownSender') }}</span>
                  {{ ` ${t('notificationBell.orderRegistered')} ` }}
                  <span class="font-medium text-gray-900">"{{ notif.order?.course_title }}"</span>
                </p>
                <p v-if="notif.order?.invoice_code" class="text-xs text-gray-500 mt-0.5">
                  {{ t('notificationBell.invoiceCode') }} <span class="font-mono font-medium">{{ notif.order.invoice_code }}</span>
                  <span class="ml-2" :class="orderStatusClass(notif.order.status)">
                    {{ orderStatusLabel(notif.order.status) }}
                  </span>
                </p>
              </template>

              <!-- Comment notification -->
              <template v-else-if="notif.notification_type === 'comment'">
                <p class="text-sm text-gray-800 leading-snug">
                  <span class="font-semibold">{{ notif.sender?.full_name || t('notificationBell.unknownSender') }}</span>
                  {{ ` ${t('notificationBell.commented')} ` }}
                  <span class="font-medium text-gray-900">"{{ notif.comment?.course_title }}"</span>
                </p>
                <p v-if="notif.comment?.content" class="text-xs text-gray-500 mt-0.5 line-clamp-1">
                  "{{ notif.comment.content }}"
                </p>
              </template>

              <!-- Reply notification -->
              <template v-else>
                <p class="text-sm text-gray-800 leading-snug">
                  <span class="font-semibold">{{ notif.sender?.full_name || t('notificationBell.unknownSender') }}</span>
                  {{ ` ${t('notificationBell.replied')}` }}
                </p>
                <p v-if="notif.comment?.content" class="text-xs text-gray-500 mt-0.5 line-clamp-1">
                  "{{ notif.comment.content }}"
                </p>
              </template>

              <p class="text-xs text-gray-400 mt-1">
                {{ relativeTime(notif.created_at) }}
              </p>
            </div>

            <!-- Unread dot -->
            <div class="flex-shrink-0 mt-2">
              <span v-if="!notif.is_read" class="block w-2 h-2 rounded-full bg-blue-500" />
            </div>
          </div>
        </div>

        <!-- Empty -->
        <div v-else class="flex flex-col items-center justify-center py-12 text-center">
          <Icon name="solar:bell-off-bold-duotone" size="40" class="text-gray-300 mb-3" />
          <p class="text-sm text-gray-500">
            {{ t('notificationBell.empty') }}
          </p>
        </div>
      </div>
    </template>
  </a-dropdown>
</template>
