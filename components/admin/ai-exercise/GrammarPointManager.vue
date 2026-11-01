<script setup lang="ts">
import type { ExerciseLevel, GrammarPointAdmin } from '~/types/ai-exercise.type'
import { message, Modal } from 'ant-design-vue'
import { parseExerciseError, useAIExerciseApi } from '~/composables/api/useAIExerciseApi'

/** Chủ điểm ngữ pháp học viên chọn sau trình độ khi tạo bài tập AI (bắt buộc). */
const api = useAIExerciseApi()

const LEVELS: ExerciseLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const points = ref<GrammarPointAdmin[]>([])
const loading = ref(false)
const levelFilter = ref<ExerciseLevel | ''>('')

const editing = ref<Partial<GrammarPointAdmin> | null>(null)
const saving = ref(false)

const levelFilterOptions = [
  { label: 'Tất cả trình độ', value: '' },
  ...LEVELS.map(code => ({ label: code, value: code })),
]

const visiblePoints = computed(() =>
  levelFilter.value ? points.value.filter(p => p.levels.includes(levelFilter.value as ExerciseLevel)) : points.value,
)

// Trình độ chưa có chủ điểm nào đang bật -> học viên không tạo được bài AI ở trình độ đó.
const uncoveredLevels = computed(() =>
  LEVELS.filter(code => !points.value.some(p => p.is_active && p.levels.includes(code))),
)

const columns = [
  { title: 'Chủ điểm', key: 'name', width: 230 },
  { title: 'Trình độ', key: 'levels', width: 150 },
  { title: 'Mô tả cho AI', dataIndex: 'description', key: 'description' },
  { title: 'Thứ tự', dataIndex: 'order', key: 'order', width: 80 },
  { title: 'Hiển thị', key: 'is_active', width: 90 },
  { title: 'Thao tác', key: 'actions', width: 150 },
]

async function load() {
  loading.value = true
  try {
    const res = await api.getGrammarPoints({ limit: 200 })
    points.value = res.results as GrammarPointAdmin[]
  }
  catch (error) {
    message.error(parseExerciseError(error).message)
  }
  finally {
    loading.value = false
  }
}

function openCreate() {
  const nextOrder = Math.max(0, ...points.value.map(p => p.order)) + 1
  editing.value = {
    name: '',
    description: '',
    levels: levelFilter.value ? [levelFilter.value] : [],
    order: nextOrder,
    is_active: true,
  }
}

async function save() {
  const form = editing.value
  if (!form?.name?.trim()) {
    message.warning('Nhập tên chủ điểm')
    return
  }
  if (!form.levels?.length) {
    message.warning('Chọn ít nhất một trình độ')
    return
  }
  if (!form.description?.trim()) {
    message.warning('Viết mô tả để AI biết cần luyện gì')
    return
  }
  saving.value = true
  try {
    const { id, name, description, levels, order, is_active } = form
    const body = { name: (name ?? '').trim(), description: (description ?? '').trim(), levels, order, is_active }
    if (id)
      await api.updateGrammarPoint(id, body)
    else
      await api.createGrammarPoint(body)
    message.success('Đã lưu chủ điểm')
    editing.value = null
    await load()
  }
  catch (error) {
    message.error(parseExerciseError(error).message)
  }
  finally {
    saving.value = false
  }
}

async function toggleActive(point: GrammarPointAdmin, isActive: boolean) {
  try {
    await api.updateGrammarPoint(point.id, { is_active: isActive })
    point.is_active = isActive
  }
  catch (error) {
    message.error(parseExerciseError(error).message)
  }
}

function confirmDelete(point: GrammarPointAdmin) {
  Modal.confirm({
    title: `Xoá chủ điểm "${point.name}"?`,
    content: 'Bài tập đã tạo theo chủ điểm này vẫn giữ nguyên. Muốn ẩn tạm thời thì tắt "Hiển thị" thay vì xoá.',
    okText: 'Xoá',
    okType: 'danger',
    cancelText: 'Huỷ',
    onOk: async () => {
      try {
        await api.deleteGrammarPoint(point.id)
        message.success('Đã xoá chủ điểm')
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
  <div>
    <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-gray-500">
        Học viên chọn trình độ rồi bắt buộc chọn một chủ điểm. "Mô tả cho AI" được đưa vào prompt (cấu trúc, cách dùng, lỗi hay gặp) — học viên không thấy.
      </p>
      <div class="flex shrink-0 gap-2">
        <a-select v-model:value="levelFilter" class="!w-[150px]" :options="levelFilterOptions" />
        <a-button type="primary" class="!flex !items-center !justify-center !gap-1" @click="openCreate">
          <Icon name="tabler:plus" />
          Thêm chủ điểm
        </a-button>
      </div>
    </div>

    <a-alert
      v-if="!loading && uncoveredLevels.length"
      type="warning"
      show-icon
      class="!mb-3"
      :message="`Trình độ ${uncoveredLevels.join(', ')} chưa có chủ điểm nào đang hiển thị — học viên chưa tạo được bài AI ở trình độ này.`"
    />

    <!-- Màn nhỏ: danh sách thẻ thay cho bảng -->
    <div class="space-y-2 md:hidden">
      <div v-if="loading" class="flex justify-center py-10">
        <a-spin />
      </div>
      <a-empty v-else-if="!visiblePoints.length" description="Chưa có chủ điểm nào" class="py-6" />
      <template v-else>
        <div
          v-for="point in visiblePoints"
          :key="point.id"
          class="rounded-xl border border-gray-200 bg-white p-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-medium text-gray-900">
                {{ point.name }}
              </p>
              <div class="mt-1 flex flex-wrap gap-1">
                <a-tag v-for="code in point.levels" :key="code" color="green" class="!mr-0">
                  {{ code }}
                </a-tag>
              </div>
            </div>
            <a-switch :checked="point.is_active" size="small" class="shrink-0" @change="(checked: boolean) => toggleActive(point, checked)" />
          </div>
          <p class="mt-2 line-clamp-3 text-sm text-gray-600">
            {{ point.description }}
          </p>
          <div class="mt-3 flex items-center justify-between">
            <span class="text-xs text-gray-400">Thứ tự {{ point.order }}</span>
            <div class="flex gap-2">
              <a-button size="small" @click="editing = { ...point, levels: [...point.levels] }">
                Sửa
              </a-button>
              <a-button size="small" danger @click="confirmDelete(point)">
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
      :data-source="visiblePoints"
      :loading="loading"
      :pagination="false"
      :scroll="{ x: 900 }"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <p class="font-medium text-gray-900">
            {{ record.name }}
          </p>
        </template>
        <template v-else-if="column.key === 'levels'">
          <div class="flex flex-wrap gap-1">
            <a-tag v-for="code in record.levels" :key="code" color="green" class="!mr-0">
              {{ code }}
            </a-tag>
          </div>
        </template>
        <template v-else-if="column.key === 'description'">
          <span class="line-clamp-2 text-sm text-gray-600">{{ record.description }}</span>
        </template>
        <template v-else-if="column.key === 'is_active'">
          <a-switch :checked="record.is_active" size="small" @change="(checked: boolean) => toggleActive(record, checked)" />
        </template>
        <template v-else-if="column.key === 'actions'">
          <div class="flex gap-2">
            <a-button size="small" @click="editing = { ...record, levels: [...record.levels] }">
              Sửa
            </a-button>
            <a-button size="small" danger @click="confirmDelete(record)">
              Xoá
            </a-button>
          </div>
        </template>
      </template>
    </a-table>

    <a-modal
      :open="!!editing"
      :title="editing?.id ? 'Sửa chủ điểm ngữ pháp' : 'Thêm chủ điểm ngữ pháp'"
      :confirm-loading="saving"
      ok-text="Lưu"
      cancel-text="Huỷ"
      @ok="save"
      @cancel="editing = null"
    >
      <a-form v-if="editing" layout="vertical">
        <a-form-item label="Tên chủ điểm (học viên thấy)" required>
          <a-input v-model:value="editing.name" :maxlength="150" placeholder="Ví dụ: Passato prossimo, Câu phức với sebbene" />
        </a-form-item>
        <a-form-item label="Trình độ áp dụng" required>
          <a-checkbox-group v-model:value="editing.levels" :options="LEVELS" />
        </a-form-item>
        <a-form-item label="Mô tả cho AI" required extra="Viết rõ cấu trúc cần luyện, cách dùng, ví dụ và lỗi người học hay mắc — AI dựa vào đây để soạn đúng trọng tâm.">
          <a-textarea
            v-model:value="editing.description"
            :rows="6"
            placeholder="Ví dụ: Trợ động từ avere/essere + participio passato. Chọn đúng trợ động từ (động từ di chuyển, phản thân dùng essere), hoà hợp participio khi dùng essere, participio bất quy tắc (fatto, detto, preso...)."
          />
        </a-form-item>
        <div class="flex flex-wrap gap-4">
          <a-form-item label="Thứ tự">
            <a-input-number v-model:value="editing.order" :min="0" />
          </a-form-item>
          <a-form-item label="Hiển thị">
            <a-switch v-model:checked="editing.is_active" />
          </a-form-item>
        </div>
      </a-form>
    </a-modal>
  </div>
</template>
