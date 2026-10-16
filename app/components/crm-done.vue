<script setup lang="ts">
defineProps<{ message: string; message2?: string | null; tone?: 'ok' | 'wait' }>()
</script>

<template>
  <div class="done stack-lg">
    <div class="done-check" :class="{ wait: tone === 'wait' }"><CrmIcon :name="tone === 'wait' ? 'approvals' : 'check'" :size="44" /></div>
    <h1>{{ message }}</h1>
    <p v-if="message2" style="margin: 0; color: var(--ink-2); max-width: 380px">{{ message2 }}</p>
    <div class="stack" style="width: 100%; max-width: 380px; margin-top: 8px"><slot /></div>
  </div>
</template>

<style scoped>
.done { align-items: center; text-align: center; padding: 40px 20px; }
.done-check { width: 88px; height: 88px; border-radius: 50%; background: var(--green-soft); color: var(--green-ink); display: flex; align-items: center; justify-content: center; }
.done-check.wait { background: var(--blue-soft); color: var(--blue-ink); }
</style>
