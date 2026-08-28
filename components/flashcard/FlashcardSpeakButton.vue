<script setup lang="ts">
interface Props {
  text: string
  speaking?: boolean
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Màu theo design: xanh cho câu ví dụ, đỏ cho nút phát âm chính. */
  tone?: 'green' | 'red'
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  tone: 'green',
})

const emit = defineEmits<{
  speak: [text: string]
}>()

const sizeClass = computed(() => ({
  sm: 'w-8 h-8 text-base',
  md: 'w-10 h-10 text-lg',
  lg: 'w-12 h-12 text-xl',
  xl: 'w-14 h-14 text-2xl sm:w-16 sm:h-16 sm:text-3xl',
}[props.size]))

const toneClass = computed(() => ({
  green: 'border-[#CFE7D4] bg-white text-[#1B8A3C] hover:bg-[#F1F9F3] hover:border-[#1B8A3C]',
  red: 'border-[#F0CDD0] bg-white text-[#CE2B37] hover:bg-[#FDF2F3] hover:border-[#CE2B37]',
}[props.tone]))

const ringClass = computed(() => (props.tone === 'red' ? 'ring-[#CE2B37]' : 'ring-[#1B8A3C]'))
</script>

<template>
  <button
    type="button"
    :disabled="disabled"
    :aria-label="label || `Nghe phát âm: ${text}`"
    :title="label || 'Nghe phát âm'"
    class="inline-flex shrink-0 items-center justify-center rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    :class="[
      sizeClass,
      disabled
        ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
        : `cursor-pointer ${toneClass}`,
      ringClass,
      speaking && !disabled ? 'ring-2 ring-offset-1' : '',
    ]"
    @click.stop="emit('speak', text)"
  >
    <Icon :name="speaking ? 'tabler:volume' : 'tabler:volume-2'" :class="speaking ? 'animate-pulse' : ''" />
  </button>
</template>
