<script setup lang="ts">
import { message, notification } from 'ant-design-vue'
import ListeningEditor from '~/components/admin/listening/ListeningEditor.vue'
import { useNewQuizApi } from '~/composables/api/useNewQuizApi'

definePageMeta({
  layout: 'admin',
})

useHead({ title: 'Sửa bài nghe' })

const route = useRoute()
const router = useRouter()
const { updateQuiz } = useNewQuizApi()
const quizId = computed(() => route.params.id as string)
const saving = ref(false)

async function handleSubmit(payload: Record<string, unknown>) {
  saving.value = true
  try {
    await updateQuiz(quizId.value, payload as any)
    message.success('Đã lưu bài nghe')
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
  <ListeningEditor mode="edit" :quiz-id="quizId" :saving="saving" @back="router.push('/admin/listening')" @submit="handleSubmit" />
</template>
