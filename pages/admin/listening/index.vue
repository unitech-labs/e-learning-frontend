<script setup lang="ts">
import type { NewQuiz, NewQuizLevel } from '~/composables/api/useNewQuizApi'
import { message, Modal } from 'ant-design-vue'
import { parseExerciseError } from '~/composables/api/useAIExerciseApi'
import { useNewQuizApi } from '~/composables/api/useNewQuizApi'

/**
 * Bài nghe giáo viên soạn (đề PDF + audio). Học viên chọn "Nghe hiểu" ở trang
 * Bài tập sẽ nhận một bài đã xuất bản đúng trình độ, ưu tiên cùng chủ đề.
 */
definePageMeta({
  layout: 'admin',
})

useHead({ title: 'Bài nghe' })

const { getQuizzes, getLevels, publishQuiz, unpublishQuiz, deleteQuiz } = useNewQuizApi()

const quizzes = ref<NewQuiz[]>([])
const levels = ref<NewQuizLevel[]>([])
const loading = ref(false)
const toggling = ref<string | null>(null)

const levelFilter = ref('')
const statusFilter = ref<'' | 'published' | 'draft'>('')
const search = ref('')

const levelOptions = computed(() => [
  { label: 'Tất cả trình độ', value: '' },
  ...levels.value.map(level => ({ label: level.code, value: level.id })),
])
const statusOptions = [
  { label: 'Mọi trạng thái', value: '' },
  { label: 'Đã xuất bản', value: 'published' },
  { label: 'Bản nháp', value: 'draft' },
]

const visibleQuizzes = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return quizzes.value.filter(quiz =>
    (!levelFilter.value || quiz.level === levelFilter.value)
    && (!statusFilter.value || quiz.is_published === (statusFilter.value === 'published'))
    && (!keyword || quiz.title.toLowerCase().includes(keyword) || quiz.topic_name?.toLowerCase().includes(keyword)),
  )
})

// Trình độ chưa có bài nghe nào xuất bản -> học viên chọn Nghe hiểu ở đó sẽ không nhận được bài.
const uncoveredLevels = computed(() =>
  levels.value
    .filter(level => !quizzes.value.some(quiz => quiz.is_published && quiz.level === level.id))
    .map(level => level.code),
)

const columns = [
  { title: 'Bài nghe', key: 'title' },
  { title: 'Trình độ', key: 'level', width: 100 },
  { title: 'Số câu', dataIndex: 'total_questions', key: 'total_questions', width: 90 },
  { title: 'Xuất bản', key: 'is_published', width: 100 },
  { title: 'Cập nhật', key: 'updated_at', width: 120 },
  { title: 'Thao tác', key: 'actions', width: 150 },
]

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('vi-VN')
}

async function load() {
  loading.value = true
  try {
    const [quizRes, levelRes] = await Promise.all([
      getQuizzes({ exercise_type: 'listening', source: 'manual', ordering: '-updated_at', limit: 200 }),
      getLevels({ is_active: true, ordering: 'order,code' }),
    ])
    quizzes.value = quizRes.results
    levels.value = levelRes.results
  }
  catch (error) {
    message.error(parseExerciseError(error).message)
  }
  finally {
    loading.value = false
  }
}

async function togglePublished(quiz: NewQuiz, published: boolean) {
  toggling.value = quiz.id
  try {
    if (published)
      await publishQuiz(quiz.id)
    else
      await unpublishQuiz(quiz.id)
    quiz.is_published = published
    message.success(published ? 'Đã xuất bản — học viên có thể nhận bài này' : 'Đã chuyển về bản nháp')
  }
  catch (error) {
    message.error(parseExerciseError(error).message)
  }
  finally {
    toggling.value = null
  }
}

function confirmDelete(quiz: NewQuiz) {
  Modal.confirm({
    title: `Xoá bài nghe "${quiz.title}"?`,
    content: 'Bài làm của học viên với bài này cũng bị xoá. Muốn ẩn tạm thời thì tắt "Xuất bản" thay vì xoá.',
    okText: 'Xoá',
    okType: 'danger',
    cancelText: 'Huỷ',
    onOk: async () => {
      try {
        await deleteQuiz(quiz.id)
        message.success('Đã xoá bài nghe')
        await load()
      }
      catch (error) {
        message.error(parseExerciseError(error).message)
      }
    },
  })
}

onMounted(load)
</script>

<template>
  <div class="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
          <Icon name="tabler:headphones" class="text-2xl text-white" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">
            Bài nghe
          </h1>
          <p class="text-sm text-gray-600">
            Đề nghe (CILS, CELI…) cho học viên luyện ở trang Bài tập → Nghe hiểu.
          </p>
        </div>
      </div>
      <NuxtLink to="/admin/listening/create">
        <a-button type="primary" size="large" class="!flex w-full !items-center !justify-center !gap-1 sm:w-auto">
          <Icon name="tabler:plus" />
          Tạo bài nghe
        </a-button>
      </NuxtLink>
    </div>

    <a-alert
      v-if="!loading && levels.length && uncoveredLevels.length"
      type="warning"
      show-icon
      class="!mb-4"
      :message="`Trình độ ${uncoveredLevels.join(', ')} chưa có bài nghe nào được xuất bản — học viên chọn Nghe hiểu ở trình độ này sẽ chưa nhận được bài.`"
    />

    <div class="mb-4 flex flex-col gap-2 sm:flex-row">
      <a-input v-model:value="search" allow-clear placeholder="Tìm theo tên bài, chủ đề" class="sm:!max-w-xs">
        <template #prefix>
          <Icon name="tabler:search" class="text-gray-400" />
        </template>
      </a-input>
      <a-select v-model:value="levelFilter" :options="levelOptions" class="sm:!w-[170px]" />
      <a-select v-model:value="statusFilter" :options="statusOptions" class="sm:!w-[170px]" />
    </div>

    <!-- Màn nhỏ: thẻ thay cho bảng -->
    <div class="space-y-2 md:hidden">
      <div v-if="loading" class="flex justify-center py-10">
        <a-spin />
      </div>
      <a-empty v-else-if="!visibleQuizzes.length" description="Chưa có bài nghe nào" class="py-6" />
      <template v-else>
        <div v-for="quiz in visibleQuizzes" :key="quiz.id" class="rounded-xl border border-gray-200 bg-white p-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-medium text-gray-900">
                {{ quiz.title }}
              </p>
              <p class="mt-0.5 text-xs text-gray-500">
                <a-tag color="green" class="!mr-1">
                  {{ quiz.level_code }}
                </a-tag>
                {{ quiz.topic_name || 'Không chủ đề' }} · {{ quiz.total_questions }} câu
              </p>
            </div>
            <a-switch
              :checked="quiz.is_published"
              :loading="toggling === quiz.id"
              size="small"
              class="shrink-0"
              @change="(checked: boolean) => togglePublished(quiz, checked)"
            />
          </div>
          <div class="mt-3 flex items-center justify-between">
            <span class="text-xs text-gray-400">Cập nhật {{ formatDate(quiz.updated_at) }}</span>
            <div class="flex gap-2">
              <NuxtLink :to="`/admin/listening/${quiz.id}`">
                <a-button size="small">
                  Sửa
                </a-button>
              </NuxtLink>
              <a-button size="small" danger @click="confirmDelete(quiz)">
                Xoá
              </a-button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <a-table
      class="hidden md:block"
      :columns="columns"
      :data-source="visibleQuizzes"
      :loading="loading"
      :pagination="visibleQuizzes.length > 20 ? { pageSize: 20 } : false"
      row-key="id"
    >
      <template #emptyText>
        <a-empty description="Chưa có bài nghe nào" />
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'title'">
          <NuxtLink :to="`/admin/listening/${record.id}`" class="font-medium !text-gray-900 hover:!text-green-700">
            {{ record.title }}
          </NuxtLink>
          <p class="text-xs text-gray-500">
            {{ record.topic_name || 'Không chủ đề' }}
            <template v-if="record.created_by_name">
              · {{ record.created_by_name }}
            </template>
          </p>
        </template>
        <template v-else-if="column.key === 'level'">
          <a-tag color="green">
            {{ record.level_code }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'is_published'">
          <a-switch
            :checked="record.is_published"
            :loading="toggling === record.id"
            size="small"
            @change="(checked: boolean) => togglePublished(record as NewQuiz, checked)"
          />
        </template>
        <template v-else-if="column.key === 'updated_at'">
          <span class="text-sm text-gray-600">{{ formatDate(record.updated_at) }}</span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <div class="flex gap-2">
            <NuxtLink :to="`/admin/listening/${record.id}`">
              <a-button size="small">
                Sửa
              </a-button>
            </NuxtLink>
            <a-button size="small" danger @click="confirmDelete(record as NewQuiz)">
              Xoá
            </a-button>
          </div>
        </template>
      </template>
    </a-table>
  </div>
</template>
