<script setup lang="ts">
definePageMeta({ path: '/crm/clients/:id' })
const route = useRoute()
const api = useCrmApi()
const { can } = useCrmMe()
const { busy, run } = useCrmAction()
const d = ref<any>(null)
const tab = ref('overview')
const error = ref('')
const load = async () => {
  try { d.value = await api.get(`/clients/${route.params.id}`) } catch (e: any) { error.value = e.message }
}
onMounted(load)
const id = computed(() => route.params.id as string)
const openOpps = computed(() => (d.value?.opportunities || []).filter((o: any) => o.state === 'open'))
const lead = computed(() => d.value?.team.find((t: any) => t.role === 'account_lead'))
const TABS: [string, string][] = [['overview', 'Overview'], ['contacts', 'Contacts'], ['timeline', 'Timeline'], ['deals', 'Deals'], ['quotes', 'Quotes'], ['projects', 'Projects'], ['money', 'Money']]

const note = ref('')
const addNote = async () => {
  if (!note.value.trim()) return
  const r = await run(() => api.post('/interactions', { client: id.value, kind: 'note', outcome: 'other', summary: note.value, next_action_type: 'none' }), 'Note added')
  if (r) { note.value = ''; load() }
}
const contactOpen = ref(false)
const contact = reactive({ name: '', designation: '', phone: '', email: '', decision_role: 'other' })
const addContact = async () => {
  const r = await run(() => api.post(`/clients/${id.value}/contacts`, contact), 'Contact added')
  if (r) { contactOpen.value = false; Object.assign(contact, { name: '', designation: '', phone: '', email: '' }); load() }
}
const fix = async (b: any) => {
  if (b.action === 'extend') { const r = await run(() => api.post(`/versions/${b.ref}/extend`, { days: 7 })); if (r) { useCrmToast().ok(r.message); load() } }
  else if (b.action === 'upload_lpo') navigateTo({ path: '/crm/lpo', query: { version: b.ref } })
  else if (b.action === 'remind') { const r = await run(() => api.post(`/invoices/${b.ref}/remind`), 'Reminder logged; follow-up set for 3 days'); if (r) load() }
  else navigateTo('/crm/approvals')
}
const ROLE: Record<string, string> = { account_lead: 'Account lead', relationship_owner: 'Relationship owner', associated_seller: 'Also sells here' }
</script>

<template>
  <CrmShell :title="d?.client?.company_name || 'Client'" back="/crm/clients">
    <div class="page">
      <div v-if="error" class="bad-box">{{ error }}</div>
      <template v-if="d">
        <section class="card pad-lg stack-lg">
          <div class="row" style="align-items: flex-start; flex-wrap: wrap">
            <span class="av av-lg" :style="{ background: crmColor(d.client.company_name) }">{{ crmInitials(d.client.company_name) }}</span>
            <div class="grow" style="min-width: 220px">
              <h1>{{ d.client.company_name }}</h1>
              <div class="row-wrap muted" style="margin-top: 6px">
                <span class="chip" :class="d.profile?.lifecycle === 'active' ? 'c-ok' : ''">{{ crmLabel(d.profile?.lifecycle || 'active') }}</span>
                <span v-if="d.profile?.category" class="chip">{{ crmLabel(d.profile.category) }}</span>
                <span>{{ crmAgo(d.last_contact_days) }}</span>
                <span v-if="d.client.payment_terms">· Terms: {{ crmLabel(d.client.payment_terms) }}</span>
              </div>
            </div>
          </div>
          <div class="action-grid">
            <NuxtLink :to="{ path: '/crm/log', query: { client: id } }" class="btn btn-primary btn-lg"><CrmIcon name="log" />Log visit or call</NuxtLink>
            <NuxtLink :to="{ path: '/crm/quote', query: { client: id } }" class="btn btn-lg"><CrmIcon name="quote" />Send a quote</NuxtLink>
            <NuxtLink :to="{ path: '/crm/deals/new', query: { client: id } }" class="btn btn-lg"><CrmIcon name="plus" />New deal</NuxtLink>
          </div>
          <div class="row-wrap" style="border-top: 1px solid var(--line-2); padding-top: 14px; gap: 18px">
            <span class="label">Who looks after them</span>
            <div v-for="t in d.team" :key="t.id" class="row" style="gap: 8px">
              <span class="av av-sm" :style="{ background: crmColor(t.sales_person?.name) }">{{ crmInitials(t.sales_person?.name) }}</span>
              <div><strong>{{ t.sales_person?.name }}</strong><div class="muted small">{{ ROLE[t.role] }}<template v-if="t.business_unit"> · {{ t.business_unit.name }}</template></div></div>
            </div>
            <span v-if="!lead" class="chip c-warn">No account lead</span>
          </div>
        </section>

        <section v-if="d.blockers.length" class="warn-box stack" style="gap: 10px" aria-label="Needs action">
          <strong class="row" style="color: var(--amber-ink); gap: 8px"><CrmIcon name="warn" />{{ d.blockers.length }} thing{{ d.blockers.length > 1 ? 's' : '' }} need{{ d.blockers.length > 1 ? '' : 's' }} action</strong>
          <div v-for="(b, i) in d.blockers" :key="i" class="row-wrap">
            <span class="chip" :class="b.track === 'finance' ? 'c-fin' : 'c-sales'">{{ crmLabel(b.track) }}</span>
            <span class="grow" style="min-width: 200px">{{ b.text }}<template v-if="b.amount"> · <span class="mono">{{ crmMoney(b.amount) }}</span></template></span>
            <button class="btn" :disabled="busy" @click="fix(b)">{{ { extend: 'Extend 7 days', upload_lpo: 'Add LPO', remind: 'Log reminder', view: 'View' }[b.action as string] }}</button>
          </div>
        </section>

        <div class="tabs" role="tablist">
          <button v-for="[k, l] in TABS" :key="k" class="tab" role="tab" :aria-selected="tab === k" @click="tab = k">{{ l }}</button>
        </div>

        <div v-if="tab === 'overview'" class="grid-2">
          <section class="card pad stack" style="gap: 4px">
            <div class="between"><h2>Open deals</h2><span class="muted">{{ crmMoney(openOpps.reduce((a: number, o: any) => a + o.expected_revenue, 0)) }}</span></div>
            <NuxtLink v-for="o in openOpps" :key="o.id" :to="`/crm/deals/${o.id}`" class="list-row click">
              <div class="grow"><strong>{{ o.title }}</strong><div class="muted">{{ o.stage?.name }}<template v-if="o.next_action"> · Next: {{ o.next_action }}</template></div></div>
              <span v-if="o.overlap_flag && o.overlap_resolution === 'none'" class="chip c-warn">Overlap</span>
              <span class="num">{{ crmMoney(o.expected_revenue, false) }}</span>
            </NuxtLink>
            <div v-if="!openOpps.length" class="muted" style="padding: 10px 0">No open deals.</div>
          </section>
          <section class="card pad stack">
            <div class="between"><h2>Money</h2><span class="chip c-fin">Finance</span></div>
            <div class="grid-auto" style="grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">
              <div><div class="label">Contracted</div><div class="num-md">{{ crmMoney(d.money.contracted, false) }}</div></div>
              <div><div class="label">Invoiced</div><div class="num-md">{{ crmMoney(d.money.invoiced, false) }}</div></div>
              <div><div class="label">Received</div><div class="num-md">{{ crmMoney(d.money.received, false) }}</div></div>
              <div><div class="label">Overdue</div><div class="num-md" :style="{ color: d.money.overdue ? 'var(--red-ink)' : undefined }">{{ crmMoney(d.money.overdue, false) }}</div></div>
            </div>
          </section>
          <section class="card pad stack">
            <h2>Add a note</h2>
            <label class="sr" for="nt">Note</label>
            <textarea id="nt" v-model="note" class="input" placeholder="What happened? Others on the account will see it."></textarea>
            <button class="btn" style="align-self: flex-start" :disabled="busy || !note.trim()" @click="addNote">Add note</button>
          </section>
          <section v-if="d.duplicates.length" class="card pad stack">
            <h2>Possible duplicate</h2>
            <div v-for="x in d.duplicates" :key="x.id" class="row"><span class="grow">{{ x.company_name }} <span class="muted">· {{ x.reasons.join(', ') }}</span></span><NuxtLink :to="`/crm/clients/${x.id}`" class="btn">Compare</NuxtLink></div>
            <span class="muted small">A senior manager can merge them. Only CRM records move; the client records in the CMS are not changed.</span>
          </section>
        </div>

        <section v-else-if="tab === 'contacts'" class="card pad stack" style="gap: 4px">
          <div class="between"><h2>Contacts</h2><button class="btn" @click="contactOpen = true">Add contact</button></div>
          <div v-for="c in d.contacts" :key="c.id" class="list-row">
            <div class="grow"><strong>{{ c.name }}</strong><div class="muted">{{ [c.designation, crmLabel(c.decision_role)].filter(Boolean).join(' · ') }}</div></div>
            <a v-if="c.phone" :href="`tel:${c.phone}`" class="btn btn-icon" :aria-label="`Call ${c.name}`"><CrmIcon name="phone" /></a>
            <a v-if="c.email" :href="`mailto:${c.email}`" class="btn btn-icon" :aria-label="`Email ${c.name}`"><CrmIcon name="mail" /></a>
          </div>
          <div v-if="!d.contacts.length" class="muted" style="padding: 10px 0">No contacts yet. Main contact on file: {{ d.client.contact_person || '—' }} {{ d.client.phone }}</div>
        </section>

        <section v-else-if="tab === 'timeline'" class="card pad stack" style="gap: 2px">
          <div v-for="i in d.interactions" :key="i.id" class="list-row" style="align-items: flex-start">
            <span class="mono small muted" style="width: 92px; flex: none">{{ crmDateTime(i.occurred_at) }}</span>
            <div class="grow">
              <strong>{{ crmLabel(i.kind) }}<template v-if="i.outcome && i.outcome !== 'other'"> · {{ crmLabel(i.outcome) }}</template></strong>
              <span class="muted"> · {{ i.sales_person?.name }}</span>
              <div v-if="i.summary">{{ i.summary }}</div>
              <div v-if="i.next_action" class="muted small">Next: {{ i.next_action }} {{ i.next_action_due ? `· ${crmDate(i.next_action_due)}` : '' }} {{ i.next_action_done ? '✓' : '' }}</div>
            </div>
          </div>
          <div v-if="!d.interactions.length" class="muted">Nothing logged yet.</div>
        </section>

        <section v-else-if="tab === 'deals'" class="card pad stack" style="gap: 4px">
          <NuxtLink v-for="o in d.opportunities" :key="o.id" :to="`/crm/deals/${o.id}`" class="list-row click">
            <div class="grow"><strong>{{ o.title }}</strong><div class="muted">{{ o.stage?.name }}</div></div>
            <span class="chip" :class="CRM_STATE_CHIP[o.state]">{{ crmLabel(o.state) }}</span>
            <span class="mono">{{ crmMoney(o.expected_revenue, false) }}</span>
          </NuxtLink>
        </section>

        <section v-else-if="tab === 'quotes'" class="card pad stack" style="gap: 4px">
          <NuxtLink v-for="p in d.proposals" :key="p.id" :to="`/crm/proposals/${p.id}`" class="list-row click">
            <div class="grow"><strong>{{ p.reference }}</strong> <span class="muted">{{ p.title }}</span><div class="muted small">v{{ p.current_version?.version_number }} · valid until {{ crmDate(p.current_version?.valid_until) }}</div></div>
            <span class="chip" :class="CRM_STATE_CHIP[p.state]">{{ crmLabel(p.state) }}</span>
            <span class="mono">{{ crmMoney(p.current_version?.net_total, false) }}</span>
          </NuxtLink>
          <div v-if="!d.proposals.length" class="muted">No quotes yet.</div>
        </section>

        <section v-else-if="tab === 'projects'" class="card pad stack" style="gap: 4px">
          <NuxtLink v-for="p in d.projects" :key="p.id" :to="`/crm/projects/${p.id}`" class="list-row click">
            <div class="grow"><strong>{{ p.name }}</strong><div class="muted">{{ (p.workstreams || []).filter((w: any) => w.state === 'completed').length }} of {{ (p.workstreams || []).length }} workstreams done</div></div>
            <span class="chip" :class="CRM_STATE_CHIP[p.state]">{{ crmLabel(p.state) }}</span>
          </NuxtLink>
          <div v-if="!d.projects.length" class="muted">No projects yet.</div>
        </section>

        <section v-else class="card pad">
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Invoice</th><th>Project</th><th class="r">Amount</th><th class="r">Balance</th><th>Due</th><th>Status</th></tr></thead>
              <tbody>
                <tr v-for="i in d.invoices" :key="i.id"><td>{{ i.number || 'Requested' }}</td><td>{{ i.project?.name }}</td><td class="mono r">{{ crmFull(i.amount) }}</td><td class="mono r">{{ crmFull(i.balance) }}</td><td>{{ crmDate(i.due_date) }}</td><td><span class="chip" :class="CRM_STATE_CHIP[i.state]">{{ crmLabel(i.state) }}</span></td></tr>
              </tbody>
            </table>
            <div v-if="!d.invoices.length" class="muted">No invoices yet.</div>
          </div>
        </section>
      </template>
    </div>

    <CrmModal v-model="contactOpen" title="Add contact">
      <label class="field"><span>Name</span><input v-model="contact.name"></label>
      <div class="grid-auto" style="gap: 12px">
        <label class="field"><span>Job title</span><input v-model="contact.designation"></label>
        <label class="field"><span>Role in decisions</span>
          <select v-model="contact.decision_role"><option value="decision_maker">Decision maker</option><option value="influencer">Influencer</option><option value="procurement">Procurement / LPOs</option><option value="finance">Finance / payments</option><option value="other">Other</option></select>
        </label>
        <label class="field"><span>Phone</span><input v-model="contact.phone" inputmode="tel"></label>
        <label class="field"><span>Email</span><input v-model="contact.email" type="email"></label>
      </div>
      <template #footer><button class="btn btn-primary" :disabled="busy || !contact.name" @click="addContact">Add contact</button></template>
    </CrmModal>
  </CrmShell>
</template>

<style scoped>
.action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
</style>
