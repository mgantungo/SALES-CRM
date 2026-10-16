<script setup lang="ts">
const open = defineModel<boolean>({ default: false })
defineProps<{ title: string; wide?: boolean }>()
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="m-bg" @click.self="open = false">
      <div class="m-panel" :class="{ wide }" role="dialog" :aria-label="title">
        <div class="between" style="align-items: center">
          <h2>{{ title }}</h2>
          <button class="btn btn-ghost btn-icon" aria-label="Close" @click="open = false"><CrmIcon name="close" /></button>
        </div>
        <slot />
        <div v-if="$slots.footer" class="row-wrap" style="justify-content: flex-end; margin-top: 4px"><slot name="footer" /></div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.m-bg { position: fixed; inset: 0; background: rgba(22, 24, 29, .45); z-index: 60; display: flex; align-items: flex-end; justify-content: center; }
.m-panel { background: var(--panel); width: 100%; max-height: 92vh; overflow-y: auto; border-radius: 20px 20px 0 0; padding: 18px 18px calc(22px + var(--safe-bottom)); display: flex; flex-direction: column; gap: 14px; }
@media (min-width: 700px) {
  .m-bg { align-items: center; }
  .m-panel { width: 520px; border-radius: 16px; padding: 22px; }
  .m-panel.wide { width: 760px; }
}
</style>
