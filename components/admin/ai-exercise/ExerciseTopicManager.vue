<script setup lang="ts">
import type { ExerciseTopicAdmin } from '~/types/ai-exercise.type'
import { message, Modal } from 'ant-design-vue'
import { parseExerciseError, useAIExerciseApi } from '~/composables/api/useAIExerciseApi'

/** Danh sách chủ đề học viên chọn khi tạo bài tập AI. */
const api = useAIExerciseApi()

const topics = ref<ExerciseTopicAdmin[]>([])
const loading = ref(false)

const editing = ref<Partial<ExerciseTopicAdmin> | null>(null)
const saving = ref(false)

const columns = [
  { title: 'Chủ đề', key: 'name' },
  { title: 'Ngữ cảnh cho AI', dataIndex: 'ai_hint', key: 'ai_hint' },
  { title: 'Thứ tự', dataIndex: 'order', key: 'order', width: 80 },
  { title: 'Hiển thị', key: 'is_active', width: 90 },
  { title: 'Thao tác', key: 'actions', width: 150 },
]

async function load() {
  loading.value = true
  try {
    const res = await api.getTopics({ limit: 100 })
    topics.value = res.results as ExerciseTopicAdmin[]
  }
  catch (error) {
    message.error(parseExerciseError(error).message)
  }
  finally {
    loading.value = false
  }
}

function openCreate() {
  const nextOrder = Math.max(0, ...topics.value.map(t => t.order)) + 1
  editing.value = { name: '', description: '', ai_hint: '', order: nextOrder, is_active: true }
}

async function save() {
  if (!editing.value?.name?.trim()) {
    message.warning('Nhập tên chủ đề')
    return
  }
  saving.value = true
  try {
    const { id, name, description, ai_hint, order, is_active } = editing.value
    const body = { name: (name ?? '').trim(), description, ai_hint, order, is_active }
    if (id)
      await api.updateTopic(id, body)
    else
      await api.createTopic(body)
    message.success('Đã lưu chủ đề')
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

async function toggleActive(topic: ExerciseTopicAdmin, isActive: boolean) {
  try {
    await api.updateTopic(topic.id, { is_active: isActive })
    topic.is_active = isActive
  }
  catch (error) {
    message.error(parseExerciseError(error).message)
  }
}

function confirmDelete(topic: ExerciseTopicAdmin) {
  Modal.confirm({
    title: `Xoá chủ đề "${topic.name}"?`,
    content: 'Bài tập đã gắn chủ đề này vẫn giữ nguyên, chỉ không còn chủ đề. Muốn ẩn tạm thời thì tắt "Hiển thị" thay vì xoá.',
    okText: 'Xoá',
    okType: 'danger',
    cancelText: 'Huỷ',
    onOk: async () => {
      try {
        await api.deleteTopic(topic.id)
        message.success('Đã xoá chủ đề')
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
        "Ngữ cảnh cho AI" mô tả phạm vi chủ đề (từ vựng, tình huống, văn phong) và được đưa vào prompt — học viên không thấy.
      </p>
      <a-button type="primary" class="!flex shrink-0 !items-center !justify-center !gap-1" @click="openCreate">
        <Icon name="tabler:plus" />
        Thêm chủ đề
      </a-button>
    </div>

    <!-- Màn nhỏ: danh sách thẻ thay cho bảng -->
    <div class="space-y-2 md:hidden">
      <div v-if="loading" class="flex justify-center py-10">
        <a-spin />
      </div>
      <template v-else>
        <div
          v-for="topic in topics"
          :key="topic.id"
          class="rounded-xl border border-gray-200 bg-white p-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-medium text-gray-900">
                {{ topic.name }}
              </p>
              <p v-if="topic.description" class="text-xs text-gray-500">
                {{ topic.description }}
              </p>
            </div>
            <a-switch :checked="topic.is_active" size="small" class="shrink-0" @change="(checked: boolean) => toggleActive(topic, checked)" />
          </div>
          <p class="mt-2 line-clamp-3 text-sm text-gray-600">
            {{ topic.ai_hint || '—' }}
          </p>
          <div class="mt-3 flex items-center justify-between">
            <span class="text-xs text-gray-400">Thứ tự {{ topic.order }}</span>
            <div class="flex gap-2">
              <a-button size="small" @click="editing = { ...topic }">
                Sửa
              </a-button>
              <a-button size="small" danger @click="confirmDelete(topic)">
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
      :data-source="topics"
      :loading="loading"
      :pagination="false"
      :scroll="{ x: 720 }"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <p class="font-medium text-gray-900">
            {{ record.name }}
          </p>
          <p v-if="record.description" class="text-xs text-gray-500">
            {{ record.description }}
          </p>
        </template>
        <template v-else-if="column.key === 'ai_hint'">
          <span class="line-clamp-2 text-sm text-gray-600">{{ record.ai_hint || '—' }}</span>
        </template>
        <template v-else-if="column.key === 'is_active'">
          <a-switch :checked="record.is_active" size="small" @change="(checked: boolean) => toggleActive(record, checked)" />
        </template>
        <template v-else-if="column.key === 'actions'">
          <div class="flex gap-2">
            <a-button size="small" @click="editing = { ...record }">
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
      :title="editing?.id ? 'Sửa chủ đề' : 'Thêm chủ đề'"
      :confirm-loading="saving"
      ok-text="Lưu"
      cancel-text="Huỷ"
      @ok="save"
      @cancel="editing = null"
    >
      <a-form v-if="editing" layout="vertical">
        <a-form-item label="Tên chủ đề" required>
          <a-input v-model:value="editing.name" :maxlength="100" placeholder="Ví dụ: Ẩm thực" />
        </a-form-item>
        <a-form-item label="Mô tả (hiển thị cho học viên)">
          <a-input v-model:value="editing.description" />
        </a-form-item>
        <a-form-item label="Ngữ cảnh cho AI">
          <a-textarea
            v-model:value="editing.ai_hint"
            :rows="4"
            placeholder="Ví dụ: Món ăn Ý, nhà hàng, gọi món, công thức nấu ăn, đi chợ"
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
