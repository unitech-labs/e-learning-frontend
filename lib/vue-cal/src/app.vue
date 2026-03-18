<script setup>
import { inject, onMounted } from 'vue'
import { useAppStore } from '@/store'

const $waveui = inject('$waveui')
const store = useAppStore()
const isProduction = import.meta.env.PROD

onMounted(() => store.applyTheme(localStorage.theme || $waveui.preferredTheme))
</script>

<template lang="pug">
documentation(:class="{ prod: isProduction }")
</template>
