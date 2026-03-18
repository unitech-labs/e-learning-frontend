<script setup lang="ts">
import type { Notification } from '~/composables/api/useNotificationApi'
import { useNotificationApi } from '~/composables/api/useNotificationApi'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'onboarding'],
})

const { t } = useI18n()
const router = useRouter()
const notifApi = useNotificationApi()

const notifications = ref<Notification[]>([])
const totalCount = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const isMarkingAll = ref(false)
const unreadCount = ref(0)
const PAGE_SIZE = 20

const hasMore = computed(() => notifications.value.length < totalCount.value)

async function fetchUnreadCount() {
  try {
    const res = await notifApi.getUnreadCount()
    unreadCount.value = res.unread_count
  }
  catch {}
}

async function loadNotifications(append = false) {
  try {
    if (append) {
      loadingMore.value = true
    }
    else {
      loading.value = true
    }

    const offset = append ? notifications.value.length : 0
    const res = await notifApi.getNotifications({ limit: PAGE_SIZE, offset })

    if (append) {
      notifications.value = [...notifications.value, ...res.results]
    }
    else {
      notifications.value = res.results
    }
    totalCount.value = res.count
  }
  catch {
    // Error handled silently or could add toast
  }
  finally {
    loading.value = false
    loadingMore.value = false
  }
}

async function handleNotificationClick(notif: Notification) {
  if (!notif.is_read) {
    try {
      await notifApi.markAsRead(notif.id)
      notif.is_read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
    catch {}
  }
  if (notif.notification_type === 'order' && notif.order?.id) {
    router.push('/admin/orders/')
  }
  else if (notif.notification_type === 'homework_assigned' || notif.notification_type === 'homework_graded') {
    router.push('/homeworks')
  }
  else if (notif.comment?.course_id && notif.comment?.lesson_id) {
    router.push(`/learning/${notif.comment.course_id}?lessonId=${notif.comment.lesson_id}&tab=comments`)
  }
}

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

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)
    return t('notificationBell.justNow')
  if (mins < 60)
    return t('notificationBell.minutesAgo', { n: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24)
    return t('notificationBell.hoursAgo', { n: hours })
  const days = Math.floor(hours / 24)
  if (days < 7)
    return t('notificationBell.daysAgo', { n: days })
  return new Date(isoDate).toLocaleDateString('vi-VN')
}

function orderStatusLabel(status: string): string {
  if (status === 'complete')
    return t('notificationBell.statusComplete')
  if (status === 'cancel')
    return t('notificationBell.statusCancel')
  return t('notificationBell.statusPending')
}

function orderStatusClass(status: string): string {
  if (status === 'complete')
    return 'text-green-600'
  if (status === 'cancel')
    return 'text-red-500'
  return 'text-yellow-600'
}

onMounted(async () => {
  await Promise.all([loadNotifications(), fetchUnreadCount()])
})

useHead({
  title: () => `${t('notifications.page.title')} - E-Learning`,
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20 lg:pb-8">
    <div class="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-8">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">
            {{ t('notifications.page.title') }}
          </h1>
          <p class="text-gray-500 mt-0.5 text-sm">
            {{ t('notifications.page.description') }}
          </p>
        </div>
        <button
          v-if="unreadCount > 0"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
          :disabled="isMarkingAll"
          @click="handleMarkAllRead"
        >
          <Icon v-if="isMarkingAll" name="svg-spinners:ring-resize" size="16" />
          {{ t('notificationBell.markAllRead') }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-16">
        <a-spin size="large" />
      </div>

      <!-- List -->
      <div v-else-if="notifications.length > 0" class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div
          v-for="notif in notifications"
          :key="notif.id"
          class="flex items-start gap-3 px-4 py-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
          :class="!notif.is_read ? 'bg-blue-50/40' : ''"
          @click="handleNotificationClick(notif)"
        >
          <!-- Icon / Avatar -->
          <div class="flex-shrink-0 mt-0.5">
            <div v-if="notif.notification_type === 'order'" class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <Icon name="solar:bag-heart-bold-duotone" size="20" class="text-orange-500" />
            </div>
            <div v-else-if="notif.notification_type === 'homework_assigned'" class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Icon name="solar:document-text-bold-duotone" size="20" class="text-blue-500" />
            </div>
            <div v-else-if="notif.notification_type === 'homework_graded'" class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Icon name="solar:check-circle-bold-duotone" size="20" class="text-green-500" />
            </div>
            <a-avatar v-else :size="40" :src="notif.sender?.avatar || undefined">
              {{ notif.sender?.full_name?.charAt(0) || '?' }}
            </a-avatar>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
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

            <template v-else-if="notif.notification_type === 'comment'">
              <p class="text-sm text-gray-800 leading-snug">
                <span class="font-semibold">{{ notif.sender?.full_name || t('notificationBell.unknownSender') }}</span>
                {{ ` ${t('notificationBell.commented')} ` }}
                <span class="font-medium text-gray-900">"{{ notif.comment?.course_title }}"</span>
              </p>
              <p v-if="notif.comment?.content" class="text-xs text-gray-500 mt-0.5 line-clamp-2">
                "{{ notif.comment.content }}"
              </p>
            </template>

            <template v-else-if="notif.notification_type === 'homework_assigned'">
              <p class="text-sm text-gray-800 leading-snug">
                {{ t('notificationBell.homeworkAssigned') }}
              </p>
              <p v-if="notif.homework?.title" class="text-xs text-gray-500 mt-0.5 line-clamp-1">
                <span class="font-medium text-gray-700">"{{ notif.homework.title }}"</span>
              </p>
              <p v-if="notif.homework?.due_date" class="text-xs text-gray-500 mt-0.5">
                {{ t('notificationBell.homeworkDue') }} {{ new Date(notif.homework.due_date).toLocaleDateString('vi-VN') }}
              </p>
            </template>

            <template v-else-if="notif.notification_type === 'homework_graded'">
              <p class="text-sm text-gray-800 leading-snug">
                {{ t('notificationBell.homeworkGraded') }}
              </p>
              <p v-if="notif.homework?.title" class="text-xs text-gray-500 mt-0.5 line-clamp-1">
                <span class="font-medium text-gray-700">"{{ notif.homework.title }}"</span>
              </p>
              <p v-if="notif.homework?.grade != null" class="text-xs mt-0.5">
                <span class="font-semibold" :class="notif.homework.grade >= 80 ? 'text-green-600' : notif.homework.grade >= 50 ? 'text-blue-600' : 'text-red-500'">
                  {{ t('notificationBell.homeworkGrade') }} {{ notif.homework.grade }}/100
                </span>
              </p>
            </template>

            <template v-else>
              <p class="text-sm text-gray-800 leading-snug">
                <span class="font-semibold">{{ notif.sender?.full_name || t('notificationBell.unknownSender') }}</span>
                {{ ` ${t('notificationBell.replied')}` }}
              </p>
              <p v-if="notif.comment?.content" class="text-xs text-gray-500 mt-0.5 line-clamp-2">
                "{{ notif.comment.content }}"
              </p>
            </template>

            <p class="text-xs text-gray-400 mt-1">
              {{ relativeTime(notif.created_at) }}
            </p>
          </div>

          <div class="flex-shrink-0 mt-2">
            <span v-if="!notif.is_read" class="block w-2.5 h-2.5 rounded-full bg-blue-500" />
          </div>
        </div>

        <!-- Load More -->
        <div v-if="hasMore" class="p-4 border-t border-gray-100 text-center">
          <button
            class="w-full py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            :disabled="loadingMore"
            @click="loadNotifications(true)"
          >
            <Icon v-if="loadingMore" name="svg-spinners:ring-resize" size="16" />
            {{ loadingMore ? t('notifications.page.loadingMore') : t('notifications.page.loadMore') }}
          </button>
        </div>
      </div>

      <!-- Empty -->
      <div v-else class="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-gray-200">
        <Icon name="solar:bell-off-bold-duotone" size="56" class="text-gray-300 mb-4" />
        <p class="text-gray-500 text-base">
          {{ t('notificationBell.empty') }}
        </p>
      </div>
    </div>
  </div>
</template>
