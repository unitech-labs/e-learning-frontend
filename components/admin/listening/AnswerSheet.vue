<script setup lang="ts">
import type { DraftQuestion } from '~/types/listening-editor.type'
import { answerMark, hasAnswer, sectionNumbers, shortSection } from '~/utils/listeningDraft'

/**
 * Phiếu đáp án: toàn bộ câu hỏi theo từng phần trên vài dòng, kèm đáp án đang chọn.
 * Câu chưa có đáp án tô vàng; bấm một ô để nhảy tới câu đó.
 */
const props = defineProps<{
  questions: DraftQuestion[]
  /** Câu đang lỗi (thiếu nội dung, lựa chọn trống...) sau khi bấm lưu. */
  problemKeys?: Set<string>
}>()

const emit = defineEmits<{ jump: [key: string] }>()

const collapsed = ref(false)

const rows = computed(() => {
  const numbers = sectionNumbers(props.questions)
  const result: { section: string, items: { key: string, n: number, mark: string, missing: boolean, problem: boolean }[] }[] = []
  props.questions.forEach((question, index) => {
    const item = {
      key: question.key,
      n: numbers[index]!,
      mark: answerMark(question),
      missing: !hasAnswer(question),
      problem: !!props.problemKeys?.has(question.key),
    }
    const last = result.at(-1)
    if (last && last.section === question.section)
      last.items.push(item)
    else
      result.push({ section: question.section, items: [item] })
  })
  return result
})

const missingCount = computed(() => props.questions.filter(question => !hasAnswer(question)).length)
const firstMissing = computed(() => props.questions.find(question => !hasAnswer(question))?.key)
</script>

<template>
  <div class="rounded-xl border border-gray-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
    <div class="flex items-center justify-between gap-3">
      <p class="text-sm font-semibold text-gray-900">
        Phiếu đáp án · {{ questions.length }} câu
        <button
          v-if="missingCount"
          type="button"
          class="ml-1 cursor-pointer rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-200"
          title="Tới câu chưa có đáp án đầu tiên"
          @click="firstMissing && emit('jump', firstMissing)"
        >
          {{ missingCount }} câu chưa có đáp án →
        </button>
        <span v-else-if="questions.length" class="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
          Đủ đáp án
        </span>
      </p>
      <button type="button" class="cursor-pointer text-xs text-gray-500 hover:text-gray-800" @click="collapsed = !collapsed">
        {{ collapsed ? 'Hiện' : 'Thu gọn' }}
        <Icon :name="collapsed ? 'tabler:chevron-down' : 'tabler:chevron-up'" class="align-[-2px]" />
      </button>
    </div>

    <div v-if="!collapsed" class="mt-2 max-h-[30vh] space-y-1.5 overflow-y-auto">
      <div v-for="(row, rowIndex) in rows" :key="rowIndex" class="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
        <p class="w-full shrink-0 truncate pt-1 text-xs font-medium text-gray-500 sm:w-32" :title="row.section">
          {{ row.section ? shortSection(row.section) : 'Câu hỏi' }}
        </p>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="item in row.items"
            :key="item.key"
            type="button"
            class="inline-flex h-7 min-w-[2.6rem] cursor-pointer items-center justify-center gap-0.5 rounded-md border px-1.5 text-xs transition hover:shadow"
            :class="item.problem || item.missing
              ? 'border-amber-300 bg-amber-50 text-amber-800'
              : 'border-green-200 bg-green-50 text-green-800'"
            :title="item.missing ? `Câu ${item.n} chưa có đáp án` : `Câu ${item.n}`"
            @click="emit('jump', item.key)"
          >
            <span class="text-gray-500">{{ item.n }}</span>
            <span class="font-semibold">{{ item.mark }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
