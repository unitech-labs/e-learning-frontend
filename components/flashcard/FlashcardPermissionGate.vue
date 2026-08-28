<script setup lang="ts">
import type { FlashcardAccess } from '~/types/flashcard.type'

interface Props {
  access: FlashcardAccess
  sending?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  request: [reason: string]
}>()

const reason = ref('')

const status = computed(() => props.access.request?.status ?? null)

/** Bốn trạng thái người dùng có thể rơi vào khi chưa có quyền. */
const view = computed(() => {
  if (status.value === 'pending')
    return 'pending'
  if (status.value === 'rejected')
    return 'rejected'
  return 'idle'
})

const canSubmit = computed(() => props.access.can_request && !props.sending)
</script>

<template>
  <section class="mx-auto max-w-xl">
    <div class="relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-10">
      <div class="flex h-1.5 w-full" aria-hidden="true">
        <span class="flex-1 bg-[#1B8A3C]" />
        <span class="flex-1 bg-white" />
        <span class="flex-1 bg-[#CE2B37]" />
      </div>

      <div
        class="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-2xl"
        :class="view === 'rejected' ? 'bg-[#FDF2F3]' : 'bg-[#F1F9F3]'"
      >
        <Icon
          :name="view === 'pending' ? 'tabler:clock-hour-4' : view === 'rejected' ? 'tabler:circle-x' : 'tabler:lock'"
          class="text-3xl"
          :class="view === 'rejected' ? 'text-[#CE2B37]' : 'text-[#1B8A3C]'"
        />
      </div>

      <!-- Chưa gửi yêu cầu -->
      <template v-if="view === 'idle'">
        <h1 class="mt-5 text-xl font-bold text-gray-900 sm:text-2xl">
          Flashcard AI dành cho học viên
        </h1>
        <p class="mx-auto mt-2 max-w-md text-sm text-gray-600 sm:text-base">
          Bạn chưa có khoá học nào nên chưa dùng được tính năng này. Đăng ký một khoá học
          để mở khoá ngay, hoặc gửi yêu cầu để giáo viên cấp quyền dùng thử.
        </p>

        <div class="mt-6 text-left">
          <label for="fc-reason" class="text-xs font-semibold tracking-wide text-gray-500">
            LÝ DO (không bắt buộc)
          </label>
          <textarea
            id="fc-reason"
            v-model="reason"
            rows="3"
            maxlength="1000"
            placeholder="Ví dụ: Em đang tìm hiểu trước khi đăng ký khoá A1."
            class="mt-1.5 w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#1B8A3C]"
          />
        </div>

        <button
          type="button"
          :disabled="!canSubmit"
          class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1B8A3C] px-6 py-3 text-sm font-bold tracking-wide text-white transition-colors hover:bg-[#157031] disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
          @click="emit('request', reason)"
        >
          <Icon :name="sending ? 'tabler:loader-2' : 'tabler:send'" :class="sending ? 'animate-spin text-lg' : 'text-lg'" />
          {{ sending ? 'ĐANG GỬI...' : 'YÊU CẦU QUYỀN SỬ DỤNG' }}
        </button>
      </template>

      <!-- Đã gửi, đang chờ duyệt -->
      <template v-else-if="view === 'pending'">
        <h1 class="mt-5 text-xl font-bold text-gray-900 sm:text-2xl">
          Yêu cầu đang chờ duyệt
        </h1>
        <p class="mx-auto mt-2 max-w-md text-sm text-gray-600 sm:text-base">
          Giáo viên đã nhận được yêu cầu của bạn. Bạn sẽ nhận thông báo ngay khi được cấp quyền.
        </p>
        <p v-if="access.request?.reason" class="mx-auto mt-4 max-w-md rounded-2xl bg-gray-50 px-4 py-3 text-left text-sm italic text-gray-500">
          “{{ access.request.reason }}”
        </p>
      </template>

      <!-- Bị từ chối -->
      <template v-else>
        <h1 class="mt-5 text-xl font-bold text-gray-900 sm:text-2xl">
          Yêu cầu chưa được duyệt
        </h1>
        <p class="mx-auto mt-2 max-w-md text-sm text-gray-600 sm:text-base">
          Giáo viên chưa cấp quyền dùng thử cho tài khoản này. Bạn vẫn có thể mở khoá tính năng
          bằng cách đăng ký một khoá học.
        </p>
        <p v-if="access.request?.admin_note" class="mx-auto mt-4 max-w-md rounded-2xl border border-[#F0CDD0] bg-[#FDF2F3] px-4 py-3 text-left text-sm text-gray-700">
          <span class="font-bold text-[#CE2B37]">Ghi chú:&nbsp;</span>{{ access.request.admin_note }}
        </p>

        <button
          v-if="access.can_request"
          type="button"
          :disabled="sending"
          class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-[#1B8A3C] hover:text-[#1B8A3C] disabled:opacity-60"
          @click="emit('request', reason)"
        >
          <Icon name="tabler:refresh" class="text-lg" />
          Gửi lại yêu cầu
        </button>
      </template>

      <NuxtLink
        to="/courses"
        class="mt-4 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-[#CE2B37] transition-colors hover:underline"
      >
        Xem các khoá học
        <Icon name="tabler:arrow-right" class="text-base" />
      </NuxtLink>
    </div>
  </section>
</template>
