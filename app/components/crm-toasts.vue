<script setup lang="ts">
const toast = useCrmToast()
</script>

<template>
  <div class="crm-toasts" role="status" aria-live="polite">
    <button v-for="t in toast.items.value" :key="t.id" class="crm-toast" :class="`t-${t.kind}`" @click="toast.dismiss(t.id)">
      <CrmIcon :name="t.kind === 'error' ? 'warn' : 'check'" :size="18" />
      <span>{{ t.text }}</span>
    </button>
  </div>
</template>

<style scoped>
.crm-toasts { position: fixed; left: 50%; transform: translateX(-50%); top: 14px; z-index: 80; display: flex; flex-direction: column; gap: 8px; width: min(560px, calc(100vw - 24px)); pointer-events: none; }
.crm-toast { pointer-events: auto; display: flex; gap: 10px; align-items: center; text-align: left; border: 0; border-radius: 12px; padding: 12px 16px; font-weight: 600; box-shadow: var(--shadow); cursor: pointer; }
.t-ok { background: var(--green-soft); color: var(--green-ink); }
.t-error { background: var(--ink); color: #fff; }
.t-info { background: var(--panel); color: var(--ink); }
</style>
