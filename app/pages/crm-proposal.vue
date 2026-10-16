<script setup lang="ts">
/** Proposal builder on one page: lines, package price, terms, live totals, versions, approvals. */
definePageMeta({ path: '/crm/proposals/:id' })
const route = useRoute()
const api = useCrmApi()
const { can: roleCan } = useCrmMe()
const { busy, run } = useCrmAction()
const toast = useCrmToast()
const d = ref<any>(null)
const versionId = ref<string | undefined>(undefined)
const load = async () => {
  d.value = await api.get(`/proposals/${route.params.id}`, versionId.value ? { version: versionId.value } : undefined)
  pkg.value = d.value.version?.package_price ? String(d.value.version.package_price) : ''
}
onMounted(load)
const v = computed(() => d.value?.version)
const p = computed(() => d.value?.proposal)
const editable = computed(() => Boolean(d.value?.can?.edit))
const showCost = computed(() => Boolean(roleCan.value?.cost))
const lock = computed(() => p.value?.lock_token)
const liveLine = (id: string) => d.value?.live?.lines?.find((l: any) => l.id === id) || {}

const guard = async (fn: () => Promise<any>, ok?: string) => {
  try {
    const r = await fn()
    if (ok) toast.ok(ok)
    await load()
    return r
  } catch (e: any) {
    toast.error(e.message)
    if (e.status === 409) await load()
    return null
  }
}
const updateLine = (l: any, patch: Record<string, any>) => guard(() => api.put(`/lines/${l.id}`, { ...patch, lock: lock.value }))
const removeLine = (l: any) => guard(() => api.del(`/lines/${l.id}`, { lock: lock.value }), 'Line removed')

const products = ref<any[]>([])
const addProduct = ref('')
onMounted(async () => { products.value = await api.get('/products').catch(() => []) })
const addLine = async () => {
  if (!addProduct.value) return
  await guard(() => api.post(`/versions/${v.value.id}/lines`, { product: addProduct.value, lock: lock.value }), 'Line added')
  addProduct.value = ''
}

const pkg = ref('')
const applyPackage = (price: string | number | null) => guard(() => api.put(`/versions/${v.value.id}`, { package_price: price === '' ? null : price, lock: lock.value }))
const applyDiscount = (pct: number) => guard(() => api.put(`/versions/${v.value.id}`, { discount_pct: pct, lock: lock.value }))
const setField = (patch: Record<string, any>) => guard(() => api.put(`/versions/${v.value.id}`, { ...patch, lock: lock.value }))

const result = ref<any>(null)
const submit = async () => {
  const r = await run(() => api.post(`/versions/${v.value.id}/submit`))
  if (r) { result.value = r; await load() }
}
const reviseOpen = ref(false)
const revise = reactive({ reason: '', discount_pct: '' as any, payment_terms_days: '' as any })
const doRevise = async () => {
  const body: any = { reason: revise.reason }
  if (revise.discount_pct !== '') body.discount_pct = Number(revise.discount_pct)
  if (revise.payment_terms_days !== '') body.payment_terms_days = Number(revise.payment_terms_days)
  const r = await run(() => api.post(`/versions/${v.value.id}/revise`, body), 'New version created. Adjust it, then submit.')
  if (r) { reviseOpen.value = false; versionId.value = undefined; await load() }
}
const extend = async () => { const r = await run(() => api.post(`/versions/${v.value.id}/extend`, { days: 7 })); if (r) { toast.ok(r.message); load() } }

const contribOpen = ref(false)
const contribLine = ref<any>(null)
const contribRows = ref<any[]>([])
const people = ref<any[]>([])
const openContrib = async (l: any) => {
  contribLine.value = l
  contribRows.value = (l.contributors || []).map((c: any) => ({ sales_person: c.sales_person?.id, role: c.role, percentage: c.percentage }))
  if (!people.value.length) people.value = (await api.get('/people')).filter((x: any) => x.sales_person)
  contribOpen.value = true
}
const shareTotal = computed(() => contribRows.value.reduce((a, c) => a + Number(c.percentage || 0), 0))
const saveContrib = async () => {
  const r = await guard(() => api.put(`/lines/${contribLine.value.id}/contributors`, { contributors: contribRows.value }), 'Credit split saved')
  if (r) contribOpen.value = false
}
const TERMS = [0, 15, 30, 45, 60]
const marginFloor = computed(() => d.value?.settings?.min_margin_pct || 35)
</script>

<template>
  <CrmShell :title="p?.reference || 'Quote'" back>
    <div v-if="d" class="page">
      <div class="page-head">
        <div>
          <NuxtLink :to="`/crm/clients/${p.client.id}`" class="muted">{{ p.client.company_name }}</NuxtLink>
          <h1 style="margin-top: 4px">{{ p.reference }} · {{ p.title }}</h1>
          <div class="row-wrap" style="margin-top: 8px">
            <span class="chip" :class="CRM_STATE_CHIP[v.state]">v{{ v.version_number }} · {{ crmLabel(v.state) }}</span>
            <span v-if="v.is_frozen" class="chip c-ok">Frozen at acceptance</span>
            <span class="muted">Valid until {{ crmDate(v.valid_until) }} · {{ v.payment_terms_days }}-day terms</span>
          </div>
        </div>
        <div class="row-wrap">
          <label class="sr" for="ver">Version</label>
          <select v-if="p.versions.length > 1" id="ver" v-model="versionId" class="input" style="width: auto" @change="load">
            <option :value="undefined">Current version</option>
            <option v-for="x in p.versions" :key="x.id" :value="x.id">v{{ x.version_number }} · {{ crmLabel(x.state) }} · {{ crmMoney(x.net_total) }}</option>
          </select>
          <NuxtLink :to="`/crm/proposals/${p.id}/print${versionId ? `?version=${versionId}` : ''}`" class="btn" target="_blank">PDF / print</NuxtLink>
        </div>
      </div>

      <div v-if="result" :class="result.state === 'in_review' ? 'warn-box' : 'ok-box'" class="stack" style="gap: 4px">
        <strong>{{ result.message }}</strong><span>{{ result.message2 }}</span>
      </div>

      <div v-if="d.diff && (d.diff.changes.length || d.diff.lines.length)" class="card pad stack" style="gap: 6px">
        <span class="label">What changed since v{{ v.version_number - 1 }}<template v-if="v.change_reason"> · {{ v.change_reason }}</template></span>
        <div v-for="c in d.diff.changes" :key="c.field" class="row-wrap"><strong style="width: 180px">{{ c.label }}</strong><span class="mono">{{ typeof c.from === 'number' && c.from > 1000 ? crmMoney(c.from) : c.from }}</span><span>→</span><span class="num">{{ typeof c.to === 'number' && c.to > 1000 ? crmMoney(c.to) : c.to }}</span></div>
        <div v-for="(c, i) in d.diff.lines" :key="i" class="muted">{{ crmLabel(c.change) }}: {{ c.description }}</div>
      </div>

      <div class="layout">
        <div class="stack-lg grow">
          <section class="card pad stack">
            <div class="between"><h2>Lines</h2><span class="muted">{{ v.lines.length }} product{{ v.lines.length === 1 ? '' : 's' }} · prices from the catalogue</span></div>
            <div class="table-wrap">
              <table class="table" style="min-width: 760px">
                <thead><tr><th>Product</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Share of discount</th><th class="r">Net</th><th v-if="showCost" class="r">Cost</th><th v-if="showCost" class="r">Margin</th><th>Credited</th><th v-if="editable" /></tr></thead>
                <tbody>
                  <tr v-for="l in v.lines" :key="l.id">
                    <td><strong>{{ l.product?.name || l.description }}</strong><div class="muted small">{{ l.business_unit?.name }}<template v-if="l.provider"> · {{ l.provider.name }}</template></div></td>
                    <td class="r">
                      <input v-if="editable" class="input mono" style="width: 76px; min-height: var(--ctl-sm); text-align: right" :value="l.quantity" inputmode="decimal" :aria-label="`Quantity for ${l.description}`" @change="updateLine(l, { quantity: ($event.target as HTMLInputElement).value })">
                      <span v-else class="mono">{{ l.quantity }}</span>
                    </td>
                    <td class="r">
                      <input v-if="editable" class="input mono" style="width: 130px; min-height: var(--ctl-sm); text-align: right" :value="l.unit_price" inputmode="numeric" :aria-label="`Unit price for ${l.description}`" @change="updateLine(l, { unit_price: ($event.target as HTMLInputElement).value })">
                      <span v-else class="mono">{{ crmFull(l.unit_price) }}</span>
                    </td>
                    <td class="mono r muted">{{ l.allocated_discount ? `−${crmFull(l.allocated_discount)}` : '0' }}</td>
                    <td class="mono r" style="font-weight: 600">{{ crmFull(l.net_price) }}</td>
                    <td v-if="showCost" class="mono r">{{ crmFull(liveLine(l.id).line_cost) }}</td>
                    <td v-if="showCost" class="mono r" :style="{ color: liveLine(l.id).below_cost ? 'var(--red-ink)' : liveLine(l.id).margin < marginFloor ? 'var(--amber-ink)' : undefined, fontWeight: 600 }">
                      {{ liveLine(l.id).margin }}%<div v-if="liveLine(l.id).below_cost" class="small" style="font-family: var(--sans)">Below cost</div>
                    </td>
                    <td class="small">
                      <button class="btn btn-ghost" style="min-height: var(--ctl-sm); padding: 0 6px; font-weight: 500; text-align: left; white-space: normal" :disabled="!editable" @click="openContrib(l)">
                        {{ (l.contributors || []).map((c: any) => `${c.sales_person?.name?.split(' ')[0]} ${c.percentage}%`).join(' · ') || 'Set credit' }}
                      </button>
                    </td>
                    <td v-if="editable"><button class="btn btn-ghost btn-icon" :aria-label="`Remove ${l.description}`" @click="removeLine(l)"><CrmIcon name="close" :size="18" /></button></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="editable" class="row-wrap">
              <label class="sr" for="addp">Add product</label>
              <select id="addp" v-model="addProduct" class="input" style="flex: 1 1 260px; width: auto"><option value="">+ Add from catalogue…</option><option v-for="x in products" :key="x.id" :value="x.id">{{ x.name }} · {{ x.business_unit?.name }}</option></select>
              <button class="btn" :disabled="!addProduct" @click="addLine">Add</button>
            </div>
          </section>

          <section v-if="editable" class="card pad stack">
            <h2>Package price</h2>
            <div class="row-wrap">
              <span class="muted">Discount:</span>
              <button v-for="x in [0, 5, 10, 12, 15]" :key="x" class="pick" :aria-pressed="Math.round(v.discount_pct) === x" @click="applyDiscount(x)">{{ x ? `${x}%` : 'None' }}</button>
            </div>
            <div class="row-wrap">
              <label class="field" style="flex: 1 1 220px"><span>Or the client's counter-offer (UGX)</span><input v-model="pkg" class="mono" inputmode="numeric" placeholder="e.g. 95000000"></label>
              <button class="btn" style="align-self: flex-end" @click="applyPackage(pkg)">Apply</button>
            </div>
            <div class="stack" style="gap: 8px">
              <span style="font-weight: 600">Spread the discount across lines by</span>
              <div class="row-wrap">
                <button class="pick" :aria-pressed="v.allocation_method === 'selling_price'" @click="setField({ allocation_method: 'selling_price' })">Share of selling price</button>
                <button class="pick" :aria-pressed="v.allocation_method === 'contribution'" @click="setField({ allocation_method: 'contribution' })">Share of contribution</button>
              </div>
              <div v-if="showCost && d.live?.lines?.some((l: any) => l.below_cost)" class="bad-box row-wrap">
                <strong>A line drops below its cost.</strong><span>Share of contribution protects low-margin lines; the client price stays the same.</span>
                <button class="btn" @click="setField({ allocation_method: 'contribution' })">Switch method</button>
              </div>
            </div>
          </section>

          <section class="card pad stack">
            <h2>Terms</h2>
            <div class="row-wrap">
              <span class="muted">Payment terms:</span>
              <button v-for="x in TERMS" :key="x" class="pick" :disabled="!editable" :aria-pressed="v.payment_terms_days === x" @click="setField({ payment_terms_days: x })">{{ x ? `${x} days` : 'Cash' }}</button>
            </div>
            <label v-if="editable" class="field"><span>Valid until</span><input type="date" :value="v.valid_until" @change="setField({ valid_until: ($event.target as HTMLInputElement).value })"></label>
            <label class="field"><span>Summary for the client</span><textarea :value="v.executive_summary" :disabled="!editable" @change="setField({ executive_summary: ($event.target as HTMLTextAreaElement).value })" /></label>
            <div class="muted small">{{ v.terms }}</div>
          </section>

          <section v-if="v.approvals?.length" class="card pad stack" style="gap: 4px">
            <h2>Approvals</h2>
            <div v-for="a in v.approvals" :key="a.id" class="list-row">
              <div class="grow"><strong>{{ a.detail }}</strong><div class="muted small">{{ crmLabel(a.approver_role) }}{{ a.approver ? ` · ${a.approver.display_name}` : '' }}{{ a.reason ? ` · “${a.reason}”` : '' }}</div></div>
              <span class="chip" :class="{ approved: 'c-ok', rejected: 'c-bad', returned: 'c-warn', pending: 'c-sales' }[a.decision as string]">{{ crmLabel(a.decision) }}</span>
            </div>
          </section>

          <section v-if="p.accepted_version" class="card pad stack">
            <h2>After acceptance</h2>
            <div class="row-wrap">
              <span class="chip" :class="d.lpos.length ? 'c-ok' : 'c-warn'">{{ d.lpos.length ? `LPO ${d.lpos[0].number || ''} · ${crmLabel(d.lpos[0].verification)}` : 'LPO missing — billing held' }}</span>
              <span v-if="d.contracts.length" class="chip c-ok">Contract {{ d.contracts[0].reference }}</span>
              <NuxtLink v-if="d.project" :to="`/crm/projects/${d.project.id}`" class="chip c-del">Project: {{ d.project.name }}</NuxtLink>
            </div>
            <NuxtLink v-if="!d.project || !d.lpos.length" :to="`/crm/accept/${p.accepted_version.id}`" class="btn btn-primary" style="align-self: flex-start">{{ d.lpos.length ? 'Set up the project' : 'Add LPO and set up the project' }}</NuxtLink>
          </section>
        </div>

        <aside class="side stack">
          <section class="card pad stack" style="gap: 2px">
            <span class="label" style="margin-bottom: 6px">Totals · UGX</span>
            <div class="between tot"><span>Lines total</span><span class="mono">{{ crmFull(v.list_total) }}</span></div>
            <div class="between tot"><span>Discount</span><span class="mono">−{{ crmFull(v.discount_total) }} <span class="muted">({{ v.discount_pct }}%)</span></span></div>
            <div class="between tot strong"><strong>Client pays</strong><strong class="num-lg">{{ crmFull(v.net_total) }}</strong></div>
            <template v-if="showCost">
              <div class="between tot"><span>Cost</span><span class="mono">{{ crmFull(v.cost_total) }}</span></div>
              <div class="between tot strong"><strong>Contribution</strong><strong class="mono">{{ crmFull(v.contribution_total) }}</strong></div>
              <div class="between" style="padding-top: 6px"><span>Margin</span><strong class="mono" :style="{ color: v.margin_pct < marginFloor ? 'var(--amber-ink)' : 'var(--green-ink)' }">{{ v.margin_pct }}%</strong></div>
              <div class="mbar" aria-hidden="true"><i :style="{ width: Math.max(0, Math.min(100, (v.margin_pct / 60) * 100)) + '%', background: v.margin_pct < marginFloor ? 'var(--amber)' : 'var(--green)' }" /><b :style="{ left: (marginFloor / 60) * 100 + '%' }" /></div>
              <span class="muted small">Marker: {{ marginFloor }}% minimum margin</span>
            </template>
          </section>
          <section class="card pad stack">
            <button v-if="d.can.submit" class="btn btn-primary btn-lg" :disabled="busy" @click="submit">Submit</button>
            <span v-if="d.can.submit" class="muted small">Any approvals needed are worked out for you and requested in one go. The client gets the quote as soon as they're approved.</span>
            <NuxtLink v-if="d.can.accept" :to="`/crm/accept/${v.id}`" class="btn btn-ok btn-lg">Client accepted</NuxtLink>
            <button v-if="d.can.revise" class="btn" :disabled="busy" @click="reviseOpen = true">Counter-offer → new version</button>
            <button v-if="d.can.extend" class="btn" :disabled="busy" @click="extend">Extend validity 7 days</button>
            <span v-if="v.state === 'in_review'" class="muted small">Waiting for approval. It's sent to the client automatically once approved.</span>
          </section>
        </aside>
      </div>
    </div>

    <CrmModal v-model="reviseOpen" title="Client counter-offer">
      <span class="muted">The submitted version stays as it is. A new version is created for you to adjust and submit.</span>
      <label class="field"><span>What did the client ask for?</span><input v-model="revise.reason" placeholder="e.g. Land it at 95M with 45-day terms"></label>
      <div class="grid-auto" style="gap: 12px">
        <label class="field"><span>New discount % (optional)</span><input v-model="revise.discount_pct" inputmode="decimal"></label>
        <label class="field"><span>Payment terms days (optional)</span><input v-model="revise.payment_terms_days" inputmode="numeric"></label>
      </div>
      <template #footer><button class="btn btn-primary" :disabled="busy || !revise.reason" @click="doRevise">Create new version</button></template>
    </CrmModal>

    <CrmModal v-model="contribOpen" title="Who gets credit for this line?">
      <div v-for="(c, i) in contribRows" :key="i" class="row-wrap">
        <select v-model="c.sales_person" class="input" style="flex: 1 1 200px; width: auto" aria-label="Person"><option v-for="x in people" :key="x.id" :value="x.sales_person.id">{{ x.display_name }}</option></select>
        <select v-model="c.role" class="input" style="width: auto" aria-label="Role"><option value="originator">Found the deal</option><option value="account_lead">Account lead</option><option value="product_seller">Product seller</option><option value="negotiation_lead">Negotiation</option><option value="supporting">Supporting</option></select>
        <input v-model="c.percentage" class="input mono" style="width: 80px" inputmode="decimal" aria-label="Share %">
        <button class="btn btn-ghost btn-icon" aria-label="Remove" @click="contribRows.splice(i, 1)"><CrmIcon name="close" :size="18" /></button>
      </div>
      <button class="btn" style="align-self: flex-start" @click="contribRows.push({ sales_person: people[0]?.sales_person?.id, role: 'product_seller', percentage: 0 })">Add person</button>
      <div :class="shareTotal === 100 ? 'ok-box' : 'warn-box'">Shares add up to {{ shareTotal }}%{{ shareTotal === 100 ? '' : ' — they must total 100%' }}</div>
      <template #footer><button class="btn btn-primary" :disabled="shareTotal !== 100" @click="saveContrib">Save</button></template>
    </CrmModal>
  </CrmShell>
</template>

<style scoped>
.layout { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
.layout > .grow { flex: 999 1 620px; }
.side { flex: 1 1 300px; max-width: 380px; position: sticky; top: 76px; }
.tot { padding: 7px 0; }
.tot.strong { border-top: 1px solid var(--line-2); }
.mbar { position: relative; height: 10px; border-radius: 999px; background: var(--line-2); margin: 6px 0 2px; }
.mbar i { display: block; height: 100%; border-radius: 999px; }
.mbar b { position: absolute; top: -4px; width: 2px; height: 18px; background: var(--ink); }
@media (max-width: 899px) { .side { position: static; max-width: none; } }
</style>
