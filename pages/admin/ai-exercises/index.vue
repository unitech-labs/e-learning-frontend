<script setup lang="ts">
import type { AdminAIExerciseListItem, ExerciseReviewStatus, ExerciseType } from '~/types/ai-exercise.type'
import { message } from 'ant-design-vue'
import AIExerciseReviewDrawer from '~/components/admin/ai-exercise/AIExerciseReviewDrawer.vue'
import ExerciseTopicManager from '~/components/admin/ai-exercise/ExerciseTopicManager.vue'
import { parseExerciseError, useAIExerciseApi } from '~/composables/api/useAIExerciseApi'
import { EXERCISE_TYPE_META, REVIEW_STATUS_META } from '~/utils/exercise'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

useHead({ title: 'Duyệt bài tập AI' })

const api = useAIExerciseApi()
const route = useRoute()
const router = useRouter()

const activeTab = ref(route.query.tab === 'topics' ? 'topics' : 'exercises')

// ─── Hàng chờ duyệt ──────────────────────────────────────────────
const PAGE_SIZE = 15
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const rows = ref<AdminAIExerciseListItem[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(1)
const filters = reactive({
  review_status: 'pending' as ExerciseReviewStatus | '',
  exercise_type: '' as ExerciseType | '',
  level: '',
  search: '',
})

const statusOptions = [
  { label: 'Tất cả trạng thái', value: '' },
  ...Object.entries(REVIEW_STATUS_META).map(([value, meta]) => ({ label: meta.label, value })),
]
const typeOptions = [
  { label: 'Tất cả dạng bài', value: '' },
  ...Object.entries(EXERCISE_TYPE_META)
    .filter(([value]) => value !== 'listening')
    .map(([value, meta]) => ({ label: meta.label, value })),
]
const levelOptions = [{ label: 'Tất cả trình độ', value: '' }, ...LEVELS.map(code => ({ label: code, value: code }))]

const columns = [
  { title: 'Bài tập', key: 'title', width: 240 },
  { title: 'Học viên', key: 'requested_by' },
  { title: 'Số câu', dataIndex: 'question_count', key: 'question_count', width: 80 },
  { title: 'Lượt làm', dataIndex: 'attempts_count', key: 'attempts_count', width: 90 },
  { title: 'Trạng thái', key: 'review_status', width: 130 },
  { title: 'Ngày tạo', key: 'created_at', width: 150 },
  { title: '', key: 'actions', width: 80 },
]

async function load() {
  loading.value = true
  try {
    const res = await api.adminList({
      ...filters,
      search: filters.search.trim() || undefined,
      limit: PAGE_SIZE,
      offset: (page.value - 1) * PAGE_SIZE,
    })
    rows.value = res.results
    total.value = res.count
  }
  catch (error) {
    message.error(parseExerciseError(error).message)
  }
  finally {
    loading.value = false
  }
}

function applyFilters() {
  page.value = 1
  load()
}

// ─── Drawer xem / duyệt: deep-link ?id= (bấm từ notification) ───
const selectedId = ref<string | null>(route.query.id ? String(route.query.id) : null)

// Bấm thông báo khi đang ở sẵn trang này: trang không mount lại, chỉ đổi ?id= -> tự mở/đóng drawer theo query
watch(() => route.query.id, (id) => {
  selectedId.value = id ? String(id) : null
})

function openExercise(id: string) {
  selectedId.value = id
  router.replace({ query: { ...route.query, id } })
}

function closeExercise() {
  selectedId.value = null
  const { id: _id, ...query } = route.query
  router.replace({ query })
}

function handleReviewed() {
  load()
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

watch(activeTab, (tab) => {
  router.replace({ query: { ...route.query, tab: tab === 'topics' ? 'topics' : undefined } })
})

onMounted(load)
</script>

<template>
  <div class="p-3 sm:p-6">
    <div class="mb-4 flex items-center gap-2">
      <Icon name="tabler:sparkles" class="text-2xl text-[#1B8A3C]" />
      <h1 class="text-xl font-bold text-gray-900">
        Bài tập AI
      </h1>
    </div>

    <a-tabs v-model:active-key="activeTab">
      <a-tab-pane key="exercises" tab="Duyệt bài">
        <div class="mb-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <a-select v-model:value="filters.review_status" class="col-span-2 sm:col-span-1 sm:!w-[170px]" :options="statusOptions" @change="applyFilters" />
          <a-select v-model:value="filters.exercise_type" class="sm:!w-[160px]" :options="typeOptions" @change="applyFilters" />
          <a-select v-model:value="filters.level" class="sm:!w-[140px]" :options="levelOptions" @change="applyFilters" />
          <a-input-search
            v-model:value="filters.search"
            placeholder="Tìm theo tiêu đề / email học viên…"
            class="col-span-2 sm:col-span-1 sm:!w-[260px]"
            allow-clear
            @search="applyFilters"
          />
        </div>

        <!-- Màn nhỏ: danh sách thẻ thay cho bảng 7 cột -->
        <div class="space-y-2 lg:hidden">
          <div v-if="loading" class="flex justify-center py-10">
            <a-spin />
          </div>
          <a-empty v-else-if="!rows.length" description="Không có bài nào" class="py-6" />
          <template v-else>
            <button
              v-for="row in rows"
              :key="row.id"
              type="button"
              class="w-full cursor-pointer rounded-xl border border-gray-200 bg-white p-3 text-left transition-colors active:bg-gray-50"
              @click="openExercise(row.id)"
            >
              <div class="flex items-start justify-between gap-2">
                <p class="font-medium text-gray-900">
                  {{ row.title }}
                </p>
                <a-tag class="!mr-0 shrink-0" :color="REVIEW_STATUS_META[row.review_status]?.color">
                  {{ REVIEW_STATUS_META[row.review_status]?.label }}
                </a-tag>
              </div>
              <p class="mt-1 truncate text-xs text-gray-500">
                {{ row.requested_by_name || '—' }}<template v-if="row.requested_by_email">
                  · {{ row.requested_by_email }}
                </template>
              </p>
              <p class="mt-0.5 text-xs text-gray-500">
                {{ row.question_count }} câu · {{ row.attempts_count }} lượt làm · {{ formatDate(row.created_at) }}
              </p>
            </button>
          </template>
          <div v-if="total > PAGE_SIZE" class="flex justify-center pt-2">
            <a-pagination
              size="small"
              :current="page"
              :page-size="PAGE_SIZE"
              :total="total"
              @change="(p: number) => { page = p; load() }"
            />
          </div>
        </div>

        <a-table
          class="hidden lg:block"
          :columns="columns"
          :data-source="rows"
          :loading="loading"
          :scroll="{ x: 880 }"
          row-key="id"
          :custom-row="(record: AdminAIExerciseListItem) => ({ onClick: () => openExercise(record.id), style: 'cursor: pointer' })"
          :pagination="{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            onChange: (p: number) => { page = p; load() },
          }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'title'">
              <p class="font-medium text-gray-900">
                {{ record.title }}
              </p>
            </template>
            <template v-else-if="column.key === 'requested_by'">
              <p class="text-gray-900">
                {{ record.requested_by_name || '—' }}
              </p>
              <p class="text-xs text-gray-500">
                {{ record.requested_by_email }}
              </p>
            </template>
            <template v-else-if="column.key === 'review_status'">
              <a-tag :color="REVIEW_STATUS_META[record.review_status as ExerciseReviewStatus]?.color">
                {{ REVIEW_STATUS_META[record.review_status as ExerciseReviewStatus]?.label }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'created_at'">
              {{ formatDate(record.created_at) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-button size="small" @click.stop="openExercise(record.id)">
                Xem
              </a-button>
            </template>
          </template>
        </a-table>

        <p class="mt-3 text-xs text-gray-400">
          Bài nghe do giáo viên soạn ở mục Quản lý Quiz (chọn dạng bài "Nghe hiểu"), không qua hàng chờ duyệt.
        </p>
      </a-tab-pane>

      <a-tab-pane key="topics" tab="Chủ đề">
        <ExerciseTopicManager />
      </a-tab-pane>
    </a-tabs>

    <AIExerciseReviewDrawer
      :exercise-id="selectedId"
      @close="closeExercise"
      @reviewed="handleReviewed"
    />
  </div>
</template>
