<script setup lang="ts">
const { isLoggedIn } = useAuth()
</script>

<template>
  <div class="min-h-screen bg-white flex flex-col">
    <layout-auth-header />
    <main class="flex-1">
      <slot />
    </main>
    <LayoutBottomBar v-if="isLoggedIn" />

    <layout-footer />
  </div>
</template>
