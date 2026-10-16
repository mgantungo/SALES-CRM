<script setup lang="ts">
/** The 4 plain steps salespeople see instead of 15 pipeline stages. */
const props = defineProps<{ step?: { step: string; index: number } | null; labels?: boolean }>()
const STEPS = ['Talking', 'Quoting', 'Waiting', 'Won']
const segs = computed(() => STEPS.map((label, i) => {
  const idx = props.step?.index ?? 0
  const won = props.step?.step === 'won'
  return { label, cls: props.step?.step === 'lost' ? '' : i <= idx ? (won ? 'won' : 'on') : '', current: i === idx }
}))
</script>

<template>
  <div v-if="props.step?.step === 'lost'" class="chip c-bad">Lost</div>
  <div v-else-if="labels" class="steps-l" role="img" :aria-label="`Step ${(props.step?.index ?? 0) + 1} of 4: ${STEPS[props.step?.index ?? 0]}`">
    <div v-for="s in segs" :key="s.label" class="stack" style="gap: 6px">
      <span class="seg" :class="s.cls" />
      <span class="small" :style="{ fontWeight: s.current ? 700 : 500, color: s.cls ? 'var(--ink)' : 'var(--muted)' }">{{ s.label }}</span>
    </div>
  </div>
  <div v-else class="segs" role="img" :aria-label="`${STEPS[props.step?.index ?? 0]}`">
    <span v-for="s in segs" :key="s.label" class="seg" :class="s.cls" />
  </div>
</template>

<style scoped>
.steps-l { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
</style>
