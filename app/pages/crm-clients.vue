<script setup lang="ts">
definePageMeta({ path: '/crm/clients' })
const api = useCrmApi()
const route = useRoute()
const { isSales, isManager } = useCrmMe()
const { busy, run } = useCrmAction()
// the search box in the top bar opens this page with ?q=
const q = ref((route.query.q as string) || '')
watch(() => route.query.q, (v) => { q.value = (v as string) || '' })
const scope = ref(isSales.value ? 'mine' : 'visible')
const items = ref<any[]>([])
const total = ref(0)
const loading = ref(true)
let t: any
const load = async () => {
  loading.value = true
  const r = await api.get('/clients', { q: q.value || undefined, scope: scope.value, limit: 100 }).catch(() => ({ items: [], total: 0 }))
  items.value = r.items
  total.value = r.total
  loading.value = false
}
watch(q, () => { clearTimeout(t); t = setTimeout(load, 250) })
watch(scope, load)
onMounted(load)

// new client with duplicate check
const open = ref(false)
const form = reactive({ company_name: '', contact_person: '', phone: '', email: '', category: 'corporate', industry: '' })
const dups = ref<any[]>([])
const checkDups = async () => {
  if (form.company_name.trim().length < 3) { dups.value = []; return }
  const r = await api.get('/clients/duplicates', { name: form.company_name, phone: form.phone, email: form.email }).catch(() => ({ items: [] }))
  dups.value = r.items
}
const create = async (force = false) => {
  const r = await run(() => api.post('/clients', { ...form, force }))
  if (!r) return
  if (!r.created) { dups.value = r.duplicates; return }
  open.value = false
  useCrmToast().ok(`${r.client.company_name} added. You're the account lead.`)
  navigateTo(`/crm/clients/${r.client.id}`)
}
</script>

<template>
  <CrmShell title="Clients">
    <div class="page">
      <div class="page-head">
        <div><h1>{{ scope === 'mine' ? 'My clients' : 'Clients' }}</h1><div class="muted">{{ total }} {{ scope === 'mine' ? 'that you look after' : 'you can see' }}</div></div>
        <button class="btn btn-primary" @click="open = true"><CrmIcon name="plus" :size="18" />New client</button>
      </div>
      <div class="row-wrap">
        <label class="sr" for="cq">Search clients</label>
        <input id="cq" v-model="q" class="search grow" style="flex: 1 1 280px; max-width: 520px" placeholder="Search by name, phone, email, TIN or BC number">
        <div v-if="!isSales" role="group" aria-label="Scope" class="seg-group">
          <button class="pick" :aria-pressed="scope === 'mine'" @click="scope = 'mine'">Mine</button>
          <button class="pick" :aria-pressed="scope === 'visible'" @click="scope = 'visible'">{{ isManager ? 'My team' : 'All I can see' }}</button>
        </div>
      </div>

      <div class="card clist">
        <div class="crow chead hide-mobile" aria-hidden="true"><span /><span>Client</span><span>Last contact</span><span>Account lead</span><span class="r">Open deals</span><span /><span /></div>
        <div v-if="loading" class="loading">Loading…</div>
        <NuxtLink v-for="c in items" :key="c.id" :to="`/crm/clients/${c.id}`" class="crow click">
          <span class="av av-sm" :style="{ background: crmColor(c.company_name) }">{{ crmInitials(c.company_name) }}</span>
          <div class="grow">
            <div class="ellipsis" style="font-weight: 600">{{ c.company_name }}</div>
            <div class="muted row hide-desk" style="gap: 6px"><span class="dot" :class="`h-${c.health}`" /><span>{{ crmAgo(c.last_contact_days) }}</span></div>
          </div>
          <span class="muted row hide-mobile" style="gap: 6px"><span class="dot" :class="`h-${c.health}`" />{{ crmAgo(c.last_contact_days) }}</span>
          <span class="hide-mobile ellipsis">{{ c.lead?.name || '—' }}</span>
          <span class="num r hide-mobile">{{ c.open_deals ? crmMoney(c.open_value) : '' }}</span>
          <span>
            <span v-if="c.my_role === 'account_lead'" class="chip c-sales hide-mobile">Account lead</span>
            <span v-else-if="c.lifecycle === 'prospect'" class="chip">Prospect</span>
          </span>
          <CrmIcon name="next" :size="16" class="chev" />
        </NuxtLink>
        <div v-if="!loading && !items.length" class="loading">No clients found{{ q ? ` for “${q}”` : '' }}.</div>
      </div>
    </div>

    <CrmModal v-model="open" title="New client">
      <label class="field"><span>Company name</span><input v-model="form.company_name" @blur="checkDups"></label>
      <div class="grid-auto" style="gap: 12px">
        <label class="field"><span>Contact person</span><input v-model="form.contact_person"></label>
        <label class="field"><span>Phone</span><input v-model="form.phone" inputmode="tel" @blur="checkDups"></label>
        <label class="field"><span>Email</span><input v-model="form.email" type="email" @blur="checkDups"></label>
        <label class="field"><span>Type</span>
          <select v-model="form.category"><option value="corporate">Corporate</option><option value="sme">SME</option><option value="government">Government</option><option value="ngo">NGO</option><option value="agency">Agency</option><option value="individual">Individual</option></select>
        </label>
      </div>
      <div v-if="dups.length" class="warn-box stack" style="gap: 8px">
        <strong style="color: var(--amber-ink)">This client may already exist</strong>
        <div v-for="d in dups" :key="d.id" class="row">
          <span class="grow">{{ d.company_name }} <span class="muted">· {{ d.reasons.join(', ') }}</span></span>
          <NuxtLink :to="`/crm/clients/${d.id}`" class="btn">Open</NuxtLink>
        </div>
      </div>
      <template #footer>
        <button v-if="dups.length" class="btn" :disabled="busy" @click="create(true)">It's a different company</button>
        <button v-else class="btn btn-primary" :disabled="busy || !form.company_name" @click="create(false)">Add client</button>
      </template>
    </CrmModal>
  </CrmShell>
</template>

<style scoped>
.clist { padding: 0 6px; }
.crow { display: flex; align-items: center; gap: 12px; padding: 10px 10px; border-top: 1px solid var(--line-2); border-radius: 8px; }
.crow:first-child, .chead + .crow, .loading + .crow { border-top-color: transparent; }
.chead { font-size: var(--fs-xs); font-weight: 600; color: var(--muted); padding-top: 10px; padding-bottom: 8px; border-top: 0; }
.chev { color: var(--muted); }
@media (min-width: 900px) {
  .crow { display: grid; grid-template-columns: 28px minmax(220px, 2.2fr) minmax(140px, 1fr) minmax(140px, 1fr) 120px 110px 16px; gap: 14px; }
}
</style>
