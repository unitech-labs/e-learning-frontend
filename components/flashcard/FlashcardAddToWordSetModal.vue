<script setup lang="ts">
import type { WordSet } from '~/types/flashcard.type'
import { message } from 'ant-design-vue'
import { parseFlashcardError, useFlashcardApi } from '~/composables/api/useFlashcardApi'

interface Props {
  open: boolean
  flashcardId: string
  word: string
  /** Các bộ từ đang chứa thẻ này, dùng để tick sẵn checkbox. */
  wordSetIds: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  /** Danh sách bộ từ mới sau khi thêm/gỡ, để page đồng bộ lại `word_set_ids`. */
  'changed': [wordSetIds: string[]]
}>()

const { getWordSets, createWordSet, addToWordSet, removeFromWordSet } = useFlashcardApi()

const sets = ref<WordSet[]>([])
const loading = ref(false)
const pendingSetId = ref<string | null>(null)
const selectedIds = ref<string[]>([])

const creating = ref(false)
const showCreateForm = ref(false)
const newSetName = ref('')
const newSetDescription = ref('')

const isOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value),
})

async function loadSets() {
  loading.value = true
  try {
    const response = await getWordSets()
    sets.value = Array.isArray(response) ? response : response.results
  }
  catch (error) {
    message.error(parseFlashcardError(error).message)
  }
  finally {
    loading.value = false
  }
}

async function toggleSet(set: WordSet) {
  if (pendingSetId.value)
    return

  const isSelected = selectedIds.value.includes(set.id)
  pendingSetId.value = set.id

  try {
    if (isSelected) {
      await removeFromWordSet(set.id, props.flashcardId)
      selectedIds.value = selectedIds.value.filter(id => id !== set.id)
      set.item_count = Math.max(0, set.item_count - 1)
      message.success(`Đã gỡ "${props.word}" khỏi ${set.name}`)
    }
    else {
      // Backend trả về nguyên bộ từ đã cập nhật, không cần gọi lại GET.
      const updated = await addToWordSet(set.id, props.flashcardId)
      selectedIds.value = [...selectedIds.value, set.id]
      set.item_count = updated?.item_count ?? set.item_count + 1
      message.success(`Đã thêm "${props.word}" vào ${set.name}`)
    }
    emit('changed', [...selectedIds.value])
  }
  catch (error) {
    message.error(parseFlashcardError(error).message)
  }
  finally {
    pendingSetId.value = null
  }
}

async function handleCreateSet() {
  const name = newSetName.value.trim()
  if (!name) {
    message.warning('Nhập tên bộ từ')
    return
  }

  creating.value = true
  try {
    const created = await createWordSet({
      name,
      description: newSetDescription.value.trim(),
    })
    sets.value = [created, ...sets.value]
    newSetName.value = ''
    newSetDescription.value = ''
    showCreateForm.value = false
    // Tạo xong thì thêm luôn thẻ hiện tại vào bộ mới.
    await toggleSet(created)
  }
  catch (error) {
    // Trùng tên trả 400 kèm details.name, parseFlashcardError đã bóc sẵn.
    message.error(parseFlashcardError(error).message)
  }
  finally {
    creating.value = false
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open)
      return
    selectedIds.value = [...props.wordSetIds]
    showCreateForm.value = false
    loadSets()
  },
  { immediate: true },
)
</script>

<template>
  <a-modal
    v-model:open="isOpen"
    :footer="null"
    :width="480"
    class="word-set-modal"
  >
    <template #title>
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
          <Icon name="tabler:cards" class="text-xl text-green-600" />
        </div>
        <div>
          <p class="font-semibold text-gray-900">
            Thêm vào bộ từ
          </p>
          <p class="text-xs font-normal text-gray-500">
            {{ word }}
          </p>
        </div>
      </div>
    </template>

    <div class="mt-2">
      <div v-if="loading" class="space-y-2">
        <a-skeleton active :paragraph="{ rows: 3 }" :title="false" />
      </div>

      <div v-else>
        <p v-if="!sets.length && !showCreateForm" class="rounded-2xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
          Bạn chưa có bộ từ nào. Tạo bộ đầu tiên để lưu từ theo chủ đề.
        </p>

        <ul v-else class="max-h-72 space-y-2 overflow-y-auto pr-1">
          <li v-for="set in sets" :key="set.id">
            <button
              type="button"
              :disabled="pendingSetId === set.id"
              class="flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200"
              :class="[
                selectedIds.includes(set.id)
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-green-200 hover:bg-green-50/50',
                pendingSetId === set.id ? 'cursor-wait opacity-60' : 'cursor-pointer',
              ]"
              @click="toggleSet(set)"
            >
              <span
                class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors"
                :class="selectedIds.includes(set.id) ? 'border-green-600 bg-green-600' : 'border-gray-300'"
              >
                <Icon v-if="selectedIds.includes(set.id)" name="tabler:check" class="text-xs text-white" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium text-gray-900">{{ set.name }}</span>
                <span v-if="set.description" class="block truncate text-xs text-gray-500">{{ set.description }}</span>
              </span>
              <span class="shrink-0 text-xs text-gray-400">{{ set.item_count }} từ</span>
            </button>
          </li>
        </ul>

        <div v-if="showCreateForm" class="mt-3 space-y-2 rounded-2xl border border-dashed border-green-300 bg-green-50/50 p-4">
          <a-input v-model:value="newSetName" placeholder="Tên bộ từ" :maxlength="100" @press-enter="handleCreateSet" />
          <a-input v-model:value="newSetDescription" placeholder="Mô tả (không bắt buộc)" :maxlength="255" />
          <div class="flex justify-end gap-2">
            <a-button size="small" @click="showCreateForm = false">
              Huỷ
            </a-button>
            <a-button type="primary" size="small" :loading="creating" @click="handleCreateSet">
              Tạo bộ
            </a-button>
          </div>
        </div>

        <button
          v-else
          type="button"
          class="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-green-300 hover:text-green-700"
          @click="showCreateForm = true"
        >
          <Icon name="tabler:plus" />
          Tạo bộ từ mới
        </button>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.word-set-modal :deep(.ant-modal-content) {
  border-radius: 16px;
  overflow: hidden;
}
</style>
