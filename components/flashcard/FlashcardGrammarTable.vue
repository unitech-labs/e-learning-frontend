<script setup lang="ts">
import type { FlashcardGrammar } from '~/types/flashcard.type'

interface Props {
  grammar: FlashcardGrammar
  /** Dòng cuối bảng (chỉ mặt Việt dùng): TIẾNG Ý -> từ gốc. Bỏ qua = không có dòng này. */
  meaning?: string
  meaningLabel?: string
  /**
   * Ngôn ngữ của mặt đang hiển thị. Mỗi mặt chỉ hiện đúng một ngôn ngữ:
   * mặt Ý — giá trị + nhãn tiếng Ý, kèm hai dòng mạo từ / số nhiều (dạng Ý);
   * mặt Việt — giá trị + nhãn tiếng Việt, ẩn mạo từ / số nhiều vì đó là chữ Ý.
   */
  primary?: 'it' | 'vi'
  /** Đang stream: hiện đủ mọi dòng, giá trị chưa tới hiển thị skeleton. */
  streaming?: boolean
}

const props = withDefaults(defineProps<Props>(), {
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
}

/** Nhãn từng dòng theo ngôn ngữ của mặt — mặt nào thuần ngôn ngữ đó. */
const LABELS: Record<'it' | 'vi', Record<string, string>> = {
  it: { pos: 'TIPO DI PAROLA', gender: 'GENERE', number: 'NUMERO', article: 'ARTICOLO', plural: 'PLURALE' },
  vi: { pos: 'LOẠI TỪ', gender: 'GIỐNG', number: 'SỐ', article: 'MẠO TỪ', plural: 'SỐ NHIỀU' },
}

/**
 * Trường không áp dụng (động từ, trạng từ...) trả chuỗi rỗng.
 * Ẩn nguyên dòng thay vì render ô trống — case điển hình là `mangiare`.
 */
const rows = computed<GrammarRow[]>(() => {
  const { part_of_speech: pos, gender, number, article, plural }
    = props.grammar ?? ({} as Partial<FlashcardGrammar>)

  const lang = props.primary
  const labels = LABELS[lang]

  const genderIcon = (gender?.it ?? '').toLowerCase().startsWith('masch')
    ? 'tabler:gender-male'
    : 'tabler:gender-female'

  const numberIcon = (number?.it ?? '').toLowerCase().startsWith('plur')
    ? 'tabler:circle-number-2'
    : 'tabler:circle-number-1'

  const all: GrammarRow[] = [
    {
      key: 'pos',
      label: labels.pos,
      icon: 'tabler:book-2',
      iconClass: 'text-[#CE2B37]',
      value: (lang === 'it' ? pos?.it : pos?.vi) ?? '',
    },
    {
      key: 'gender',
      label: labels.gender,
      icon: genderIcon,
      iconClass: 'text-[#CE2B37]',
      value: (lang === 'it' ? gender?.it : gender?.vi) ?? '',
    },
    {
      key: 'number',
      label: labels.number,
      icon: numberIcon,
      iconClass: 'text-[#1B8A3C]',
      value: (lang === 'it' ? number?.it : number?.vi) ?? '',
    },
  ]

  // Mạo từ / số nhiều là chữ tiếng Ý -> chỉ mặt Ý mới có.
  if (lang === 'it') {
    all.push(
      {
        key: 'article',
        label: labels.article,
        glyph: 'Aa',
        iconClass: 'text-slate-700',
        highlight: article?.article ?? '',
        value: article?.article ? article.word : '',
      },
      {
        key: 'plural',
        label: labels.plural,
        icon: 'tabler:users',
        iconClass: 'text-[#1B8A3C]',
        highlight: plural?.article ?? '',
        value: plural?.article ? plural.form : '',
      },
    )
  }

  if (props.meaning !== undefined) {
    all.push({
      key: 'meaning',
      label: props.meaningLabel ?? '',
      icon: 'tabler:world',
      iconClass: 'text-[#1B8A3C]',
      value: props.meaning,
    })
  }

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
        </template>
      </dd>
    </div>
  </dl>
</template>
