<script setup lang="ts">
/** Quick quote: products from the catalogue are ticked for you; pick a discount if asked; Send. */
definePageMeta({ path: '/crm/quote' })
const route = useRoute()
const api = useCrmApi()
const { me } = useCrmMe()
const { busy, run } = useCrmAction()
const client = ref<string | null>((route.query.client as string) || null)
const opportunity = ref<string | undefined>((route.query.opportunity as string) || undefined)
const products = ref<any[]>([])
const picked = ref<string[]>([])
const disc = ref(0)
const settings = ref<any>(null)
const done = ref<any>(null)
const contact = ref('')

onMounted(async () => {
  const [p, s] = await Promise.all([api.get('/products'), api.get('/settings').catch(() => null)])
  products.value = p
  settings.value = s
})
// pre-tick what the client was interested in on the open deal
watch(client, async (c) => {
  if (!c) return
  const d = await api.get(`/clients/${c}`).catch(() => null)
  contact.value = d?.client?.contact_person || ''
  const open = (d?.opportunities || []).filter((o: any) => o.state === 'open')
  const opp = open.find((o: any) => o.id === opportunity.value) || open[0]
  if (opp) {
    opportunity.value = opp.id
    const ids = (opp.interest_products || []).map((p: any) => p.id)
    if (ids.length && !picked.value.length) picked.value = ids
  }
}, { immediate: true })

const toggle = (id: string) => { picked.value = picked.value.includes(id) ? picked.value.filter((x) => x !== id) : [...picked.value, id] }
const subtotal = computed(() => products.value.filter((p) => picked.value.includes(p.id)).reduce((a, p) => a + p.list_price * (p.default_quantity || 1), 0))
const total = computed(() => Math.round(subtotal.value * (1 - disc.value / 100)))
const limit = computed(() => Number(me.value?.profile?.discount_authority_pct ?? settings.value?.salesperson_discount_limit_pct ?? 5))
const needsOk = computed(() => disc.value > limit.value)
const label = computed(() => !client.value ? 'Choose a client' : !picked.value.length ? 'Tick at least one product' : needsOk.value ? 'Send — a manager OKs it first' : `Send to ${contact.value.split(' ')[0] || 'client'}`)

const send = async () => {
  const r = await run(() => api.post('/quick-quote', { client: client.value, opportunity: opportunity.value, products: picked.value, discount_pct: disc.value }))
  if (r) done.value = r
}
</script>

<template>
  <CrmShell title="Send a quote" back focus>
    <div class="page page-narrow">
      <CrmDone v-if="done" :message="done.message" :message2="done.message2" :tone="done.state === 'in_review' ? 'wait' : 'ok'">
        <NuxtLink :to="`/crm/proposals/${done.proposal.id}`" class="btn btn-lg">Open the quote</NuxtLink>
        <NuxtLink to="/crm" class="btn btn-primary btn-lg">Back to today</NuxtLink>
      </CrmDone>
      <template v-else>
        <h1 class="hide-mobile">Send a quote</h1>
        <CrmClientPicker v-model="client" label="For which client?" />
        <div class="stack" style="gap: 8px">
          <div class="label">What are they buying?</div>
          <button v-for="p in products" :key="p.id" class="prod" :aria-pressed="picked.includes(p.id)" @click="toggle(p.id)">
            <span class="box"><CrmIcon v-if="picked.includes(p.id)" name="check" :size="16" /></span>
            <span class="grow"><strong>{{ p.short_label || p.name }}</strong><span class="muted" style="display: block">{{ p.package_note || p.business_unit?.name }}</span></span>
            <span class="mono" style="font-weight: 600">{{ crmMoney(p.list_price * (p.default_quantity || 1), false) }}</span>
          </button>
          <CrmEmpty v-if="!products.length" text="The catalogue is empty. Ask your product manager to add products." />
        </div>
        <div class="stack" style="gap: 8px">
          <div class="label">Discount asked for?</div>
          <div class="row-wrap"><button v-for="x in [0, 5, 10, 15]" :key="x" class="pick" :aria-pressed="disc === x" @click="disc = x">{{ x ? `${x}%` : 'None' }}</button></div>
          <div :class="needsOk ? 'warn-box' : 'ok-box'" style="font-size: 14px">
            {{ needsOk ? `Over ${limit}% needs a manager's OK. One tap sends it to them; the client gets the quote as soon as they approve.` : 'Within your limit. The quote goes to the client straight away.' }}
          </div>
        </div>
        <div class="sticky-foot">
          <div class="between"><span class="muted">Client pays</span><span class="mono" style="font-size: 22px; font-weight: 600">{{ crmMoney(total) }}</span></div>
          <button class="btn btn-primary btn-lg" :disabled="busy || !client || !picked.length" @click="send">{{ label }}</button>
        </div>
      </template>
    </div>
  </CrmShell>
</template>

<style scoped>
.prod { display: flex; align-items: center; gap: 12px; min-height: 62px; padding: 0 14px; border-radius: 12px; border: 1.5px solid var(--field); background: var(--panel); text-align: left; cursor: pointer; }
.prod[aria-pressed='true'] { border-color: var(--blue); background: #F0F4FE; }
.box { width: 24px; height: 24px; border-radius: 6px; border: 1.5px solid var(--field); display: flex; align-items: center; justify-content: center; flex: none; color: #fff; }
.prod[aria-pressed='true'] .box { background: var(--blue); border-color: var(--blue); }
</style>
