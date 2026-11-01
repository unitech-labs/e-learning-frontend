<script setup lang="ts">
import { message, notification } from 'ant-design-vue'
import ListeningEditor from '~/components/admin/listening/ListeningEditor.vue'
import { useNewQuizApi } from '~/composables/api/useNewQuizApi'

definePageMeta({
  layout: 'admin',
})

useHead({ title: 'Tạo bài nghe' })

const router = useRouter()
const { createQuiz } = useNewQuizApi()
const saving = ref(false)

async function handleSubmit(payload: Record<string, unknown>) {
  saving.value = true
  try {
    await createQuiz(payload as any)
    message.success(payload.is_published ? 'Đã lưu và xuất bản bài nghe' : 'Đã lưu bài nghe (bản nháp)')
    router.push('/admin/listening')
  }
  catch (err: any) {
    notification.error({ message: 'Không lưu được bài nghe', description: err.message, duration: 4.5 })
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <ListeningEditor mode="create" :saving="saving" @back="router.push('/admin/listening')" @submit="handleSubmit" />
</template>
