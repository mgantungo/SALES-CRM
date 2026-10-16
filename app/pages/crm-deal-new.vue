<script setup lang="ts">
/** New deal in about four taps: client, what, how big, when they decide. */
definePageMeta({ path: '/crm/deals/new' })
const route = useRoute()
const api = useCrmApi()
const { busy, run } = useCrmAction()
const client = ref<string | null>((route.query.client as string) || null)
const products = ref<any[]>([])
const picked = ref<string[]>([])
const size = ref<string | null>(null)
const decision = ref<string | null>('next_month')
const title = ref('')
const done = ref<any>(null)
onMounted(async () => { products.value = await api.get('/products').catch(() => []) })
const toggle = (id: string) => { picked.value = picked.value.includes(id) ? picked.value.filter((x) => x !== id) : [...picked.value, id] }
const SIZES: [string, string][] = [['under_10m', 'Under 10M'], ['between_10m_50m', '10–50M'], ['over_50m', 'Over 50M']]
const WHEN: [string, string][] = [['this_month', 'This month'], ['next_month', 'Next month'], ['later', 'Later']]
const save = async () => {
  const r = await run(() => api.post('/opportunities', { client: client.value, products: picked.value, size_band: size.value, decision: decision.value, title: title.value || undefined, source: 'phone' }))
  if (r) done.value = r
}
</script>

<template>
  <CrmShell title="New deal" back focus>
    <div class="page page-narrow">
      <CrmDone v-if="done" :message="`Deal added`" :message2="done.overlaps.length ? `Heads up: ${done.overlaps.map((o: any) => `${o.person || 'someone'}${o.unit ? ` (${o.unit})` : ''}`).join(', ')} also has an open deal with this client. You've both been told — nothing to check yourself.` : 'It shows on your Today list and your manager\'s board. Next: send a quote when you\'re ready.'">
        <NuxtLink :to="{ path: '/crm/quote', query: { client, opportunity: done.opportunity.id } }" class="btn btn-primary btn-lg">Send a quote</NuxtLink>
        <NuxtLink :to="`/crm/deals/${done.opportunity.id}`" class="btn btn-lg">Open the deal</NuxtLink>
      </CrmDone>
      <template v-else>
        <h1 class="hide-mobile">New deal</h1>
        <CrmClientPicker v-model="client" label="Which client?" allow-all />
        <div class="stack" style="gap: 8px">
          <div class="label">What are they interested in?</div>
          <div class="row-wrap"><button v-for="p in products" :key="p.id" class="pick" :aria-pressed="picked.includes(p.id)" @click="toggle(p.id)">{{ p.short_label || p.name }}</button></div>
        </div>
        <div class="stack" style="gap: 8px">
          <div class="label">Roughly how big?</div>
          <div class="row-wrap"><button v-for="[k, l] in SIZES" :key="k" class="pick" :aria-pressed="size === k" @click="size = k">{{ l }}</button></div>
        </div>
        <div class="stack" style="gap: 8px">
          <div class="label">When will they decide?</div>
          <div class="row-wrap"><button v-for="[k, l] in WHEN" :key="k" class="pick" :aria-pressed="decision === k" @click="decision = k">{{ l }}</button></div>
        </div>
        <label class="field"><span>Name it <span class="muted" style="font-weight: 500">· optional</span></span><input v-model="title" placeholder="e.g. Christmas promotion"></label>
        <span class="muted">If another team is already talking to this client, you'll both be told automatically.</span>
        <div class="sticky-foot"><button class="btn btn-primary btn-lg" :disabled="busy || !client || (!size && !picked.length)" @click="save">Add deal</button></div>
      </template>
    </div>
  </CrmShell>
</template>
