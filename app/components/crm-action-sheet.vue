<script setup lang="ts">
const open = defineModel<boolean>({ default: false })
const go = (to: string) => { open.value = false; navigateTo(to) }
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') open.value = false }
watch(open, (v) => {
  if (!import.meta.client) return
  if (v) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
})
onBeforeUnmount(() => { if (import.meta.client) window.removeEventListener('keydown', onKey) })
const ACTIONS = [
  { to: '/crm/log', icon: 'log', label: 'Log a visit or call', hint: 'Takes about 20 seconds', primary: true },
  { to: '/crm/quote', icon: 'quote', label: 'Send a quote', hint: 'Pick products, set a discount, send' },
  { to: '/crm/deals/new', icon: 'plus', label: 'New deal', hint: 'Track a new sales opportunity' },
  { to: '/crm/lpo', icon: 'camera', label: 'Snap an LPO or contract', hint: 'Photo or PDF from the client' },
]
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="s-bg" @click.self="open = false">
      <div class="s-panel" role="dialog" aria-modal="true" aria-label="What do you want to do?">
        <div class="grip" />
        <div class="s-head hide-mobile"><h2>What do you want to do?</h2><button class="btn btn-ghost btn-icon" aria-label="Close" @click="open = false"><CrmIcon name="close" :size="18" /></button></div>
        <button v-for="(a, i) in ACTIONS" :key="a.to" class="big" :class="{ 'big-p': a.primary }" :autofocus="i === 0" @click="go(a.to)">
          <span class="ic"><CrmIcon :name="a.icon" /></span>
          <span class="grow"><span class="t">{{ a.label }}</span><span class="h hide-mobile">{{ a.hint }}</span></span>
        </button>
        <button class="btn btn-ghost hide-desk" @click="open = false">Cancel</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.s-bg { position: fixed; inset: 0; z-index: 70; background: rgba(22, 24, 29, .45); display: flex; flex-direction: column; justify-content: flex-end; align-items: center; }
.s-panel { width: 100%; max-width: 520px; background: var(--panel); border-radius: 20px 20px 0 0; padding: 10px 16px calc(24px + var(--safe-bottom)); display: flex; flex-direction: column; gap: 10px; }
.grip { width: 40px; height: 4px; border-radius: 2px; background: var(--field); align-self: center; margin-bottom: 6px; }
.big { min-height: 58px; border-radius: 14px; border: 1.5px solid var(--field); background: var(--panel); font-weight: 700; font-size: 16px; display: flex; align-items: center; gap: 12px; padding: 0 16px; cursor: pointer; text-align: left; }
.big:hover { border-color: #9DB4F0; background: #F6F8FE; }
.big-p { background: var(--blue); border-color: var(--blue); color: #fff; }
.big-p:hover { background: var(--blue-dark); border-color: var(--blue-dark); }
.ic { display: flex; }
.t { display: block; }
.h { display: block; font-weight: 500; font-size: 12.5px; opacity: .75; }
.s-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
@media (min-width: 700px) { .s-bg { justify-content: center; } .s-panel { border-radius: 16px; } }
@media (min-width: 900px) {
  .s-panel { max-width: 440px; padding: 16px 18px 18px; gap: 8px; box-shadow: var(--shadow); }
  .grip { display: none; }
  .big { min-height: 56px; font-size: 14px; border-radius: 10px; padding: 0 14px; }
  .ic { width: 32px; height: 32px; border-radius: 8px; align-items: center; justify-content: center; background: var(--soft); color: var(--ink-2); }
  .big-p .ic { background: rgba(255, 255, 255, .16); color: #fff; }
}
</style>
