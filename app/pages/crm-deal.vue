<script setup lang="ts">
definePageMeta({ path: '/crm/deals/:id' })
const route = useRoute()
const api = useCrmApi()
const { isSales, isManager } = useCrmMe()
const { busy, run } = useCrmAction()
const d = ref<any>(null)
const id = computed(() => route.params.id as string)
const load = async () => { d.value = await api.get(`/opportunities/${id.value}`) }
onMounted(load)
const o = computed(() => d.value?.opportunity)

const won = ref<any>(null)
const saidYes = async () => {
  const r = await run(() => api.post(`/opportunities/${id.value}/won`, {}))
  if (r) won.value = r
}
const lostOpen = ref(false)
const reasons = ref<any[]>([])
const reason = ref('')
const openLost = async () => { lostOpen.value = true; reasons.value = await api.get('/lookups', { type: 'loss_reason' }).catch(() => []) }
const markLost = async () => {
  const r = await run(() => api.post(`/opportunities/${id.value}/lost`, { reason: reason.value }), 'Deal closed as lost')
  if (r) { lostOpen.value = false; load() }
}
const moveTo = ref('')
const move = async () => {
  const r = await run(() => api.post(`/opportunities/${id.value}/move`, { stage: moveTo.value }), 'Stage updated')
  if (r) { moveTo.value = ''; load() }
}
const people = ref<any[]>([])
const contribOpen = ref(false)
const contrib = reactive({ sales_person: '', role: 'product_seller' })
const openContrib = async () => { contribOpen.value = true; people.value = (await api.get('/people', { role: 'salesperson,product_manager,supervisor' })).filter((p: any) => p.sales_person) }
const addContrib = async () => {
  const r = await run(() => api.post(`/opportunities/${id.value}/contributors`, contrib), 'Added — they have been asked for their lines and prices')
  if (r) { contribOpen.value = false; load() }
}
const resolve = async (action: string) => {
  const lead = o.value?.lead_sales_person?.id
  const r = await run(() => api.post(`/opportunities/${id.value}/resolve-overlap`, { action, lead_sales_person: lead }), 'Decision recorded; everyone involved has been told')
  if (r) load()
}
const ROLE: Record<string, string> = { originator: 'Found the deal', account_lead: 'Account lead', product_seller: 'Product seller', negotiation_lead: 'Leads negotiation', delivery_coordinator: 'Delivery', supporting: 'Supporting' }
</script>

<template>
  <CrmShell :title="o?.client?.company_name || 'Deal'" back>
    <div class="page">
      <CrmDone v-if="won" :message="won.message" :message2="won.message2">
        <NuxtLink :to="{ path: '/crm/lpo', query: { version: won.version.id } }" class="btn btn-primary btn-lg">Add the LPO now</NuxtLink>
        <NuxtLink to="/crm" class="btn btn-lg">Back to today</NuxtLink>
      </CrmDone>
      <template v-else-if="d">
        <section class="card pad-lg stack">
          <div class="between" style="align-items: flex-start">
            <div>
              <NuxtLink :to="`/crm/clients/${o.client.id}`" class="muted">{{ o.client.company_name }}</NuxtLink>
              <h1 style="margin-top: 4px">{{ o.title }}</h1>
            </div>
            <span class="num-lg">{{ crmMoney(o.expected_revenue) }}</span>
          </div>
          <CrmSteps :step="d.step" labels />
          <div class="row-wrap">
            <span style="color: var(--ink-2)">{{ d.status_line }}</span>
            <span v-if="!isSales" class="chip">{{ o.stage?.position }} · {{ o.stage?.name }}</span>
            <span v-if="o.decision_date" class="muted">· Decision by {{ crmDate(o.decision_date) }}</span>
          </div>
        </section>

        <div v-if="o.overlap_flag && o.overlap_resolution === 'none'" class="warn-box row-wrap">
          <CrmIcon name="warn" /><span class="grow">Another team also has an open deal with this client. {{ isManager ? 'Decide how to handle it:' : 'Your managers have been told.' }}</span>
          <template v-if="isManager">
            <button class="btn" :disabled="busy" @click="resolve('lead')">Account lead leads both</button>
            <button class="btn" :disabled="busy" @click="resolve('separate')">Keep separate</button>
          </template>
        </div>

        <div v-if="o.state === 'open'" class="action-grid">
          <NuxtLink :to="{ path: '/crm/log', query: { client: o.client.id, opportunity: o.id } }" class="btn btn-primary btn-lg"><CrmIcon name="log" />Log visit or call</NuxtLink>
          <NuxtLink :to="{ path: '/crm/quote', query: { client: o.client.id, opportunity: o.id } }" class="btn btn-lg"><CrmIcon name="quote" />Send a quote</NuxtLink>
          <button class="btn btn-lg" style="color: var(--green-ink)" :disabled="busy" @click="saidYes"><CrmIcon name="check" />They said yes</button>
          <button class="btn btn-lg btn-ghost" @click="openLost">Not happening</button>
        </div>

        <div class="grid-2">
          <section class="card pad stack" style="gap: 4px">
            <div class="between"><h2>Quotes</h2></div>
            <NuxtLink v-for="p in d.proposals" :key="p.id" :to="`/crm/proposals/${p.id}`" class="list-row click">
              <div class="grow"><strong>{{ p.reference }}</strong><div class="muted">v{{ p.current_version?.version_number }} · {{ crmMoney(p.current_version?.net_total) }}</div></div>
              <span class="chip" :class="CRM_STATE_CHIP[p.state]">{{ crmLabel(p.state) }}</span>
            </NuxtLink>
            <div v-if="!d.proposals.length" class="muted" style="padding: 8px 0">No quote yet.</div>
          </section>

          <section class="card pad stack" style="gap: 4px">
            <div class="between"><h2>Who's involved</h2><button class="btn" @click="openContrib">Add person</button></div>
            <div v-for="c in o.contributors" :key="c.id" class="list-row">
              <span class="av av-sm" :style="{ background: crmColor(c.sales_person?.name) }">{{ crmInitials(c.sales_person?.name) }}</span>
              <div class="grow"><strong>{{ c.sales_person?.name }}</strong><div class="muted small">{{ ROLE[c.role] }}<template v-if="c.business_unit"> · {{ c.business_unit.name }}</template></div></div>
            </div>
          </section>

          <section class="card pad stack" style="gap: 2px">
            <h2>Timeline</h2>
            <div v-for="i in d.interactions" :key="i.id" class="list-row" style="align-items: flex-start">
              <span class="mono small muted" style="width: 90px; flex: none">{{ crmDateTime(i.occurred_at) }}</span>
              <div class="grow"><strong>{{ crmLabel(i.kind) }} · {{ crmLabel(i.outcome) }}</strong><div v-if="i.summary">{{ i.summary }}</div></div>
            </div>
            <div v-for="h in d.history" :key="h.id" class="list-row">
              <span class="mono small muted" style="width: 90px; flex: none">{{ crmDateTime(h.changed_at) }}</span>
              <span class="grow muted">Moved to {{ h.to_stage?.name }}<template v-if="h.note"> · {{ h.note }}</template></span>
            </div>
          </section>

          <section v-if="!isSales && o.state === 'open'" class="card pad stack">
            <h2>Move to a stage</h2>
            <label class="sr" for="mv">Stage</label>
            <select id="mv" v-model="moveTo" class="input">
              <option value="">Choose a stage…</option>
              <option v-for="m in d.moves" :key="m.id" :value="m.id" :disabled="m.blocked">{{ m.position }} · {{ m.name }}{{ m.blocked ? ` — ${m.why}` : '' }}</option>
            </select>
            <button class="btn" style="align-self: flex-start" :disabled="busy || !moveTo" @click="move">Move</button>
          </section>
        </div>
      </template>
    </div>

    <CrmModal v-model="lostOpen" title="Why isn't it happening?">
      <div class="row-wrap"><button v-for="r in reasons" :key="r.id" class="pick" :aria-pressed="reason === r.value" @click="reason = r.value">{{ r.label }}</button></div>
      <template #footer><button class="btn btn-dark" :disabled="busy || !reason" @click="markLost">Close the deal</button></template>
    </CrmModal>
    <CrmModal v-model="contribOpen" title="Add someone to this deal">
      <label class="field"><span>Person</span><select v-model="contrib.sales_person"><option value="">Choose…</option><option v-for="p in people" :key="p.id" :value="p.sales_person.id">{{ p.display_name }}{{ p.business_unit ? ` · ${p.business_unit.name}` : '' }}</option></select></label>
      <label class="field"><span>Role</span><select v-model="contrib.role"><option value="product_seller">Product seller (supplies lines and prices)</option><option value="negotiation_lead">Leads negotiation</option><option value="delivery_coordinator">Delivery coordinator</option><option value="supporting">Supporting</option></select></label>
      <template #footer><button class="btn btn-primary" :disabled="busy || !contrib.sales_person" @click="addContrib">Add and notify</button></template>
    </CrmModal>
  </CrmShell>
</template>

<style scoped>
.action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; }
</style>
