<script setup lang="ts">
import type { FlashcardGrammar } from '~/types/flashcard.type'

interface Props {
  grammar: FlashcardGrammar
  /** Dòng cuối bảng: mặt Ý là NGHĨA (tiếng Việt), mặt Việt là TIẾNG Ý (từ gốc). */
  meaning?: string
  meaningLabel?: string
  /**
   * Ngôn ngữ chính của mặt đang hiển thị: giá trị đậm là ngôn ngữ này,
   * chú thích trong ngoặc là ngôn ngữ còn lại. Mạo từ / số nhiều là dạng
   * tiếng Ý nên giữ nguyên ở cả hai mặt.
   */
  primary?: 'it' | 'vi'
  /** Đang stream: hiện đủ mọi dòng, giá trị chưa tới hiển thị skeleton. */
  streaming?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  meaningLabel: 'NGHĨA',
  primary: 'it',
})

interface GrammarRow {
  key: string
  label: string
  icon?: string
  glyph?: string
  iconClass: string
  /** Phần tô đỏ (mạo từ) đứng trước phần chữ thường. */
  highlight?: string
  value: string
  /** Chú thích tiếng Việt trong ngoặc, theo đúng design: Nome (Danh từ). */
  hint?: string
}

/**
 * Trường không áp dụng (động từ, trạng từ...) trả chuỗi rỗng.
 * Ẩn nguyên dòng thay vì render ô trống — case điển hình là `mangiare`.
 */
const rows = computed<GrammarRow[]>(() => {
  const { part_of_speech: pos, gender, number, article, plural }
    = props.grammar ?? ({} as Partial<FlashcardGrammar>)

  const genderIcon = (gender?.it ?? '').toLowerCase().startsWith('masch')
    ? 'tabler:gender-male'
    : 'tabler:gender-female'

  const numberIcon = (number?.it ?? '').toLowerCase().startsWith('plur')
    ? 'tabler:circle-number-2'
    : 'tabler:circle-number-1'

  const all: GrammarRow[] = [
    {
      key: 'pos',
      label: 'LOẠI TỪ',
      icon: 'tabler:book-2',
      iconClass: 'text-[#CE2B37]',
      value: (props.primary === 'it' ? pos?.it : pos?.vi) ?? '',
      hint: (props.primary === 'it' ? pos?.vi : pos?.it) ?? '',
    },
    {
      key: 'gender',
      label: 'GIỐNG',
      icon: genderIcon,
      iconClass: 'text-[#CE2B37]',
      value: (props.primary === 'it' ? gender?.it : gender?.vi) ?? '',
      hint: (props.primary === 'it' ? gender?.vi : gender?.it) ?? '',
    },
    {
      key: 'number',
      label: 'SỐ',
      icon: numberIcon,
      iconClass: 'text-[#1B8A3C]',
      value: (props.primary === 'it' ? number?.it : number?.vi) ?? '',
      hint: (props.primary === 'it' ? number?.vi : number?.it) ?? '',
    },
    {
      key: 'article',
      label: 'MẠO TỪ',
      glyph: 'Aa',
      iconClass: 'text-slate-700',
      highlight: article?.article ?? '',
      value: article?.article ? article.word : '',
    },
    {
      key: 'plural',
      label: 'SỐ NHIỀU',
      icon: 'tabler:users',
      iconClass: 'text-[#1B8A3C]',
      highlight: plural?.article ?? '',
      value: plural?.article ? plural.form : '',
    },
    {
      key: 'meaning',
      label: props.meaningLabel,
      icon: 'tabler:world',
      iconClass: 'text-[#1B8A3C]',
      value: props.meaning ?? '',
    },
  ]

  if (props.streaming)
    return all
  return all.filter(row => row.value.trim() !== '' || (row.highlight ?? '').trim() !== '')
})
</script>

<template>
  <dl
    v-if="rows.length"
    class="divide-y divide-[#DCEEDF] overflow-hidden rounded-2xl border border-[#CFE7D4] bg-white"
  >
    <div
      v-for="row in rows"
      :key="row.key"
      class="grid grid-cols-[1.75rem_5.5rem_1fr] items-start gap-x-2 px-3 py-2.5 sm:grid-cols-[2rem_6.5rem_1fr] sm:gap-x-3 sm:px-4 sm:py-3"
    >
      <span class="flex items-center justify-center">
        <Icon v-if="row.icon" :name="row.icon" class="text-lg" :class="[row.iconClass]" />
        <span v-else class="text-base font-bold" :class="[row.iconClass]">{{ row.glyph }}</span>
      </span>

      <dt class="text-[11px] font-bold leading-5 tracking-wide text-[#CE2B37] sm:text-xs">
        {{ row.label }}:
      </dt>

      <dd class="min-w-0 break-words text-sm leading-5 text-gray-900 sm:text-base">
        <span
          v-if="streaming && !row.value && !row.highlight"
          class="inline-block h-4 w-24 animate-pulse rounded bg-gray-200 align-middle"
        />
        <template v-else>
          <span v-if="row.highlight" class="font-bold text-[#CE2B37]">{{ row.highlight }}&nbsp;</span>
          <span :class="row.key === 'meaning' ? '' : 'font-bold'">{{ row.value }}</span>
          <span v-if="row.hint" class="ml-1.5 font-normal text-gray-500">({{ row.hint }})</span>
        </template>
      </dd>
    </div>
  </dl>
</template>
