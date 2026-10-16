<script setup lang="ts">
defineProps<{ text: string }>()
</script>

<template>
  <div class="card pad" style="text-align: center; color: var(--muted); display: flex; flex-direction: column; gap: 10px; align-items: center">
    <span>{{ text }}</span>
    <slot />
  </div>
</template>
