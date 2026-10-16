<script setup lang="ts">
const open = defineModel<boolean>({ default: false })
const go = (to: string) => { open.value = false; navigateTo(to) }
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="s-bg" @click.self="open = false">
      <div class="s-panel" role="dialog" aria-label="What do you want to do?">
        <div class="grip" />
        <button class="big big-p" @click="go('/crm/log')"><CrmIcon name="log" />Log a visit or call</button>
        <button class="big" @click="go('/crm/quote')"><CrmIcon name="quote" />Send a quote</button>
        <button class="big" @click="go('/crm/deals/new')"><CrmIcon name="plus" />New deal</button>
        <button class="big" @click="go('/crm/lpo')"><CrmIcon name="camera" />Snap an LPO or contract</button>
        <button class="btn btn-ghost" @click="open = false">Cancel</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.s-bg { position: fixed; inset: 0; z-index: 70; background: rgba(22, 24, 29, .45); display: flex; flex-direction: column; justify-content: flex-end; align-items: center; }
.s-panel { width: 100%; max-width: 520px; background: var(--panel); border-radius: 20px 20px 0 0; padding: 10px 16px calc(24px + var(--safe-bottom)); display: flex; flex-direction: column; gap: 10px; }
.grip { width: 40px; height: 4px; border-radius: 2px; background: var(--field); align-self: center; margin-bottom: 6px; }
.big { min-height: 58px; border-radius: 14px; border: 1.5px solid var(--field); background: var(--panel); font-weight: 700; font-size: 16px; display: flex; align-items: center; gap: 12px; padding: 0 16px; cursor: pointer; text-align: left; }
.big-p { background: var(--blue); border-color: var(--blue); color: #fff; }
@media (min-width: 700px) { .s-bg { justify-content: center; } .s-panel { border-radius: 18px; } }
</style>
