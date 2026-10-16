<script setup lang="ts">
/** CRM administration: people (login ↔ sales person ↔ role), teams, catalogue, setup and audit. */
definePageMeta({ path: '/crm/admin', crmRoles: ['admin', 'executive', 'product_manager'] })
const api = useCrmApi()
const { role } = useCrmMe()
const { busy, run } = useCrmAction()
const toast = useCrmToast()
const tab = ref(role.value === 'product_manager' ? 'catalogue' : 'people')
const users = ref<any[]>([])
const sps = ref<any[]>([])
const teams = ref<any[]>([])
const bus = ref<any[]>([])
const products = ref<any[]>([])
const audit = ref<any[]>([])
const q = ref('')
const loadPeople = async () => {
  ;[users.value, sps.value, teams.value, bus.value] = await Promise.all([
    api.get('/admin/users', q.value ? { q: q.value } : undefined), api.get('/admin/sales-persons'), api.get('/admin/teams'), api.get('/business-units'),
  ])
}
const loadCatalogue = async () => { ;[products.value, bus.value] = await Promise.all([api.get('/products', { all: 'true' }), api.get('/business-units')]) }
const loadAudit = async () => { audit.value = await api.get('/admin/audit', { limit: 150 }) }
watch(tab, (t) => { if (t === 'people' || t === 'teams') loadPeople(); if (t === 'catalogue') loadCatalogue(); if (t === 'audit') loadAudit() }, { immediate: true })
let t: any
watch(q, () => { clearTimeout(t); t = setTimeout(loadPeople, 300) })

const ROLES = Object.entries(CRM_ROLE_LABEL)
const editUser = ref<any>(null)
const pf = reactive<any>({})
const openUser = (u: any) => {
  editUser.value = u
  Object.assign(pf, {
    crm_role: u.profile?.crm_role || 'salesperson', sales_person: u.profile?.sales_person?.id || '', team: u.profile?.team?.id || '',
    business_unit: u.profile?.business_unit?.id || '', monthly_target: u.profile?.monthly_target || 0, discount_authority_pct: u.profile?.discount_authority_pct ?? 5,
    is_active: u.profile?.is_active ?? true,
  })
}
const saveUser = async () => {
  const r = await run(() => api.post('/admin/profiles', { user: editUser.value.user.id, ...pf, sales_person: pf.sales_person || null, team: pf.team || null, business_unit: pf.business_unit || null }), 'Saved')
  if (r) { editUser.value = null; loadPeople() }
}
const spFree = computed(() => sps.value.filter((s) => !s.linked || s.id === pf.sales_person))

const editTeam = ref<any>(null)
const tf = reactive<any>({})
const openTeam = (t: any) => { editTeam.value = t || {}; Object.assign(tf, { id: t?.id, name: t?.name || '', business_unit: t?.business_unit?.id || '', supervisor: t?.supervisor?.id || '', region: t?.region || '' }) }
const saveTeam = async () => { const r = await run(() => api.post('/admin/teams', { ...tf, business_unit: tf.business_unit || null, supervisor: tf.supervisor || null }), 'Team saved'); if (r) { editTeam.value = null; loadPeople() } }
const supervisors = computed(() => users.value.filter((u) => u.profile && ['supervisor', 'senior_manager', 'executive'].includes(u.profile.crm_role)))

const editProduct = ref<any>(null)
const prf = reactive<any>({})
const openProduct = (p: any) => {
  editProduct.value = p || {}
  Object.assign(prf, {
    id: p?.id, name: p?.name || '', code: p?.code || '', short_label: p?.short_label || '', package_note: p?.package_note || '', business_unit: p?.business_unit?.id || '',
    product_type: p?.product_type || 'internal', unit: p?.unit || 'package', list_price: p?.list_price || 0, floor_price: p?.floor_price || 0, standard_cost: p?.standard_cost || 0,
    default_quantity: p?.default_quantity || 1, default_duration_type: p?.default_duration_type || 'fixed_term', is_active: p?.is_active ?? true,
  })
}
const saveProduct = async () => { const r = await run(() => api.post('/admin/products', { ...prf, business_unit: prf.business_unit || null }), 'Product saved'); if (r) { editProduct.value = null; loadCatalogue() } }

const sample = ref(false)
const seed = async () => { const r = await run(() => api.post('/admin/seed', { sampleCatalogue: sample.value })); if (r) toast.ok(`Setup done: ${Object.entries(r.created).map(([k, v]) => `${v} ${k.replace('_', ' ')}`).join(', ') || 'nothing new needed'}`) }
const backfill = ref<any>(null)
const runBackfill = async (dryRun: boolean) => { const r = await run(() => api.post('/admin/backfill-assignments', { dryRun })); if (r) { backfill.value = r; if (!dryRun) toast.ok('Client ownership created from advert history') } }
const jobs = async () => { const r = await run(() => api.post('/admin/run-jobs')); if (r) toast.ok(`Jobs done: ${r.quotes.expired} quotes expired, ${r.recurring.created} recurring tasks, ${r.invoices.overdue} overdue invoices`) }
</script>

<template>
  <CrmShell title="Admin">
    <div class="page" style="max-width: 1300px">
      <h1>CRM administration</h1>
      <div class="tabs" role="tablist">
        <button v-for="[k, l] in [['people', 'People'], ['teams', 'Teams'], ['catalogue', 'Catalogue'], ['setup', 'Setup & migration'], ['audit', 'Audit trail']]" :key="k" class="tab" role="tab" :aria-selected="tab === k" @click="tab = k">{{ l }}</button>
      </div>

      <section v-if="tab === 'people'" class="card pad stack">
        <div class="row-wrap"><span class="muted grow">Each login is linked to one VGAMS sales person (or none, for finance, projects and admin). The sales person records themselves are never changed.</span><input v-model="q" class="search" style="width: 260px" placeholder="Search logins" aria-label="Search logins"></div>
        <div class="table-wrap">
          <table class="table" style="min-width: 760px">
            <thead><tr><th>Login</th><th>CRM role</th><th>Sales person</th><th>Team</th><th class="r">Discount limit</th><th /></tr></thead>
            <tbody>
              <tr v-for="u in users" :key="u.user.id">
                <td><strong>{{ u.user.username }}</strong><div class="muted small">{{ u.user.email }}</div></td>
                <td><span v-if="u.profile" class="chip" :class="u.profile.is_active ? 'c-sales' : 'c-bad'">{{ CRM_ROLE_LABEL[u.profile.crm_role] }}</span><span v-else class="chip c-warn">Not set up</span></td>
                <td>{{ u.profile?.sales_person?.name || '—' }}</td>
                <td>{{ u.profile?.team?.name || '—' }}</td>
                <td class="mono r">{{ u.profile ? `${u.profile.discount_authority_pct}%` : '' }}</td>
                <td class="r"><button class="btn" @click="openUser(u)">{{ u.profile ? 'Edit' : 'Set up' }}</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else-if="tab === 'teams'" class="card pad stack">
        <div class="between"><span class="muted">Teams group salespeople under a group manager. The team map and approvals use them.</span><button class="btn btn-primary" @click="openTeam(null)">New team</button></div>
        <div v-for="t in teams" :key="t.id" class="list-row">
          <div class="grow"><strong>{{ t.name }}</strong><div class="muted small">{{ t.business_unit?.name || 'Mixed units' }} · manager {{ t.supervisor?.display_name || '—' }} · {{ (t.members || []).length }} people</div></div>
          <button class="btn" @click="openTeam(t)">Edit</button>
        </div>
      </section>

      <section v-else-if="tab === 'catalogue'" class="card pad stack">
        <div class="between"><span class="muted">Prices and standard costs feed every quote. Costs are never shown to salespeople.</span><button class="btn btn-primary" @click="openProduct(null)">New product</button></div>
        <div class="table-wrap">
          <table class="table" style="min-width: 760px">
            <thead><tr><th>Product</th><th>Unit</th><th>Type</th><th class="r">List price</th><th class="r">Standard cost</th><th /></tr></thead>
            <tbody>
              <tr v-for="p in products" :key="p.id">
                <td><strong>{{ p.name }}</strong><div class="muted small">{{ p.business_unit?.name }} · {{ p.package_note }}</div></td>
                <td>{{ crmLabel(p.unit) }} × {{ p.default_quantity }}</td>
                <td><span class="chip" :class="p.product_type === 'third_party' ? 'c-warn' : ''">{{ crmLabel(p.product_type) }}</span><span v-if="!p.is_active" class="chip c-bad">Inactive</span></td>
                <td class="mono r">{{ crmFull(p.list_price) }}</td>
                <td class="mono r">{{ crmFull(p.standard_cost) }}</td>
                <td class="r"><button class="btn" @click="openProduct(p)">Edit</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div v-else-if="tab === 'setup'" class="grid-2">
        <section class="card pad stack">
          <h2>1 · Default configuration</h2>
          <span class="muted">Creates business units, the 15 pipeline stages, approval thresholds, the commission policy, lookups and document rules. Only adds what is missing — never overwrites your edits. Fine-tune them in the Strapi admin panel (collections prefixed “CRM”).</span>
          <label class="row" style="gap: 8px"><input v-model="sample" type="checkbox" style="width: 20px; height: 20px">Also add a sample product catalogue (for testing)</label>
          <button class="btn btn-primary" style="align-self: flex-start" :disabled="busy" @click="seed">Run setup</button>
        </section>
        <section class="card pad stack">
          <h2>2 · Client ownership from advert history</h2>
          <span class="muted">Reads existing adverts (read-only) and creates client assignments. The seller with the most adverts becomes account lead; others become associated sellers. Preview first.</span>
          <div class="row-wrap"><button class="btn" :disabled="busy" @click="runBackfill(true)">Preview</button><button class="btn btn-primary" :disabled="busy || !backfill?.dryRun" @click="runBackfill(false)">Create assignments</button></div>
          <div v-if="backfill" class="soft small">
            <template v-if="backfill.skipped">{{ backfill.reason }}</template>
            <template v-else>{{ backfill.dryRun ? 'Preview' : 'Done' }}: {{ backfill.adverts }} adverts · {{ backfill.clients }} clients · {{ backfill.account_leads }} account leads · {{ backfill.associated_sellers }} associated sellers · {{ backfill.adverts_without_client_or_seller }} adverts without client or seller (review manually)</template>
          </div>
        </section>
        <section class="card pad stack">
          <h2>3 · Daily jobs</h2>
          <span class="muted">Expire old quotes, send reminders, create recurring tasks, flag overdue invoices and refresh project health. Runs at 05:00 automatically if the optional bootstrap is enabled.</span>
          <button class="btn" style="align-self: flex-start" :disabled="busy" @click="jobs">Run now</button>
        </section>
      </div>

      <section v-else class="card pad">
        <div class="table-wrap">
          <table class="table" style="min-width: 760px">
            <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Record</th><th>Change</th></tr></thead>
            <tbody>
              <tr v-for="a in audit" :key="a.id"><td class="small mono">{{ crmDateTime(a.occurred_at) }}</td><td>{{ a.actor?.display_name || (a.actor_user_id ? `user ${a.actor_user_id}` : 'system') }}</td><td><span class="chip">{{ a.action }}</span></td><td class="small muted">{{ a.target_uid?.split('.').pop() }} {{ a.target_id }}</td><td class="small mono ellipsis" style="max-width: 360px">{{ a.after ? JSON.stringify(a.after) : '' }}</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <CrmModal :model-value="!!editUser" :title="`CRM profile · ${editUser?.user.username}`" @update:model-value="(v: boolean) => { if (!v) editUser = null }">
      <div class="grid-auto" style="gap: 12px">
        <label class="field"><span>Role</span><select v-model="pf.crm_role"><option v-for="[k, l] in ROLES" :key="k" :value="k">{{ l }}</option></select></label>
        <label class="field"><span>Sales person (VGAMS)</span><select v-model="pf.sales_person"><option value="">None</option><option v-for="s in spFree" :key="s.id" :value="s.id">{{ s.name }}{{ s.bc_code ? ` · ${s.bc_code}` : '' }}</option></select></label>
        <label class="field"><span>Team</span><select v-model="pf.team"><option value="">None</option><option v-for="t in teams" :key="t.id" :value="t.id">{{ t.name }}</option></select></label>
        <label class="field"><span>Business unit</span><select v-model="pf.business_unit"><option value="">None</option><option v-for="b in bus" :key="b.id" :value="b.id">{{ b.name }}</option></select></label>
        <label class="field"><span>Monthly target (UGX)</span><input v-model="pf.monthly_target" class="mono" inputmode="numeric"></label>
        <label class="field"><span>Own discount limit (%)</span><input v-model="pf.discount_authority_pct" class="mono" inputmode="decimal"></label>
      </div>
      <label class="row" style="gap: 8px"><input v-model="pf.is_active" type="checkbox" style="width: 20px; height: 20px">Active</label>
      <template #footer><button class="btn btn-primary" :disabled="busy" @click="saveUser">Save</button></template>
    </CrmModal>

    <CrmModal :model-value="!!editTeam" title="Team" @update:model-value="(v: boolean) => { if (!v) editTeam = null }">
      <label class="field"><span>Name</span><input v-model="tf.name"></label>
      <div class="grid-auto" style="gap: 12px">
        <label class="field"><span>Business unit</span><select v-model="tf.business_unit"><option value="">Mixed</option><option v-for="b in bus" :key="b.id" :value="b.id">{{ b.name }}</option></select></label>
        <label class="field"><span>Group manager</span><select v-model="tf.supervisor"><option value="">None</option><option v-for="u in supervisors" :key="u.profile.id" :value="u.profile.id">{{ u.profile.sales_person?.name || u.user.username }}</option></select></label>
        <label class="field"><span>Region</span><input v-model="tf.region"></label>
      </div>
      <template #footer><button class="btn btn-primary" :disabled="busy || !tf.name" @click="saveTeam">Save</button></template>
    </CrmModal>

    <CrmModal :model-value="!!editProduct" title="Product" wide @update:model-value="(v: boolean) => { if (!v) editProduct = null }">
      <div class="grid-auto" style="gap: 12px">
        <label class="field"><span>Name</span><input v-model="prf.name"></label>
        <label class="field"><span>Short label (shown to sellers)</span><input v-model="prf.short_label"></label>
        <label class="field"><span>Code</span><input v-model="prf.code"></label>
        <label class="field"><span>Package note</span><input v-model="prf.package_note" placeholder="e.g. 60s · 120 spots"></label>
        <label class="field"><span>Business unit</span><select v-model="prf.business_unit"><option v-for="b in bus" :key="b.id" :value="b.id">{{ b.name }}</option></select></label>
        <label class="field"><span>Type</span><select v-model="prf.product_type"><option value="internal">Internal</option><option value="third_party">Third party</option></select></label>
        <label class="field"><span>Unit</span><select v-model="prf.unit"><option v-for="u in ['spot', 'insertion', 'slot', 'day', 'week', 'month', 'event', 'item', 'package']" :key="u" :value="u">{{ crmLabel(u) }}</option></select></label>
        <label class="field"><span>Default quantity</span><input v-model="prf.default_quantity" class="mono" inputmode="decimal"></label>
        <label class="field"><span>List price per unit (UGX)</span><input v-model="prf.list_price" class="mono" inputmode="numeric"></label>
        <label class="field"><span>Floor price (UGX)</span><input v-model="prf.floor_price" class="mono" inputmode="numeric"></label>
        <label class="field"><span>Standard cost per unit (UGX)</span><input v-model="prf.standard_cost" class="mono" inputmode="numeric"></label>
        <label class="field"><span>Delivery length</span><select v-model="prf.default_duration_type"><option value="one_off">One-off</option><option value="fixed_term">Fixed term</option><option value="long_running">Long-running</option></select></label>
      </div>
      <label class="row" style="gap: 8px"><input v-model="prf.is_active" type="checkbox" style="width: 20px; height: 20px">Active (offered on quotes)</label>
      <template #footer><button class="btn btn-primary" :disabled="busy || !prf.name" @click="saveProduct">Save</button></template>
    </CrmModal>
  </CrmShell>
</template>
