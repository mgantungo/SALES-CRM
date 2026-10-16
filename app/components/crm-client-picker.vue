<script setup lang="ts">
/** One tap on a recent client, or type two letters to search every client. */
const model = defineModel<string | null>({ default: null })
const props = defineProps<{ label?: string; allowAll?: boolean }>()
const emit = defineEmits<{ picked: [client: any] }>()
const api = useCrmApi()
const mine = ref<any[]>([])
const q = ref('')
const found = ref<any[]>([])
const picked = ref<any>(null)

onMounted(async () => {
  const r = await api.get('/clients', { scope: 'mine', limit: 30 }).catch(() => ({ items: [] }))
  mine.value = [...r.items].sort((a: any, b: any) => (a.last_contact_days ?? 999) - (b.last_contact_days ?? 999))
  if (model.value) picked.value = mine.value.find((c) => c.id === model.value) || null
  if (model.value && !picked.value) {
    const c = await api.get(`/clients/${model.value}`).catch(() => null)
    if (c) picked.value = { id: c.client.id, company_name: c.client.company_name }
  }
})
let t: any
watch(q, (v) => {
  clearTimeout(t)
  if (v.trim().length < 2) { found.value = []; return }
  t = setTimeout(async () => {
    const r = await api.get(props.allowAll ? '/clients/directory' : '/clients', { q: v.trim(), limit: 10 }).catch(() => ({ items: [] }))
    found.value = r.items
  }, 250)
})
const choose = (c: any) => { picked.value = c; model.value = c.id; q.value = ''; found.value = []; emit('picked', c) }
const clear = () => { picked.value = null; model.value = null }
</script>

<template>
  <div class="stack" style="gap: 10px">
    <div v-if="picked" class="card row" style="padding: 12px 14px">
      <span class="av av-sm" :style="{ background: crmColor(picked.company_name) }">{{ crmInitials(picked.company_name) }}</span>
      <div class="grow"><strong>{{ picked.company_name }}</strong><div v-if="picked.contact_person" class="muted">with {{ picked.contact_person }}</div></div>
      <button class="btn btn-ghost" @click="clear">Change</button>
    </div>
    <template v-else>
      <div class="label">{{ props.label || 'Which client?' }}</div>
      <div class="row-wrap">
        <button v-for="c in mine.slice(0, 6)" :key="c.id" class="pick" @click="choose(c)">{{ c.company_name }}</button>
      </div>
      <label class="sr" for="cp-q">Search clients</label>
      <input id="cp-q" v-model="q" class="search" :placeholder="props.allowAll ? 'Search all clients…' : 'Search your clients…'" autocomplete="off">
      <div v-if="found.length" class="card" style="padding: 4px 14px">
        <button v-for="c in found" :key="c.id" class="list-row click" style="width: 100%; border-left: 0; border-right: 0; border-bottom: 0; background: none; text-align: left" @click="choose(c)">
          <span class="grow"><strong>{{ c.company_name }}</strong><span v-if="c.lead" class="muted"> · {{ c.lead.name }}</span></span>
          <span v-if="c.in_my_list === false" class="chip">Other team</span>
        </button>
      </div>
    </template>
  </div>
</template>
