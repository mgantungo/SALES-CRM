<script setup lang="ts">
/** Commission statement: every amount explained. Finance approves and records payouts here. */
definePageMeta({ path: '/crm/earnings' })
const api = useCrmApi()
const { me, role, can } = useCrmMe()
const { busy, run } = useCrmAction()
const d = ref<any>(null)
const person = ref('')
const people = ref<any[]>([])
const picked = ref<string[]>([])
const load = async () => { d.value = await api.get('/commission', person.value ? { sales_person: person.value } : undefined); picked.value = [] }
onMounted(async () => {
  await load()
  if (can.value?.commission && can.value.commission !== 'own') people.value = (await api.get('/people').catch(() => [])).filter((p: any) => p.sales_person)
})
watch(person, load)
const isFinance = computed(() => role.value === 'finance')
const toggle = (id: string) => { picked.value = picked.value.includes(id) ? picked.value.filter((x) => x !== id) : [...picked.value, id] }
const approve = async () => { const r = await run(() => api.post('/commission/approve', { ids: picked.value })); if (r) { useCrmToast().ok(`${r.approved} approved for payout`); load() } }
const paid = async () => { const r = await run(() => api.post('/commission/paid', { ids: picked.value })); if (r) { useCrmToast().ok(`${r.paid} marked paid`); load() } }
const disputeFor = ref<any>(null)
const disputeReason = ref('')
const dispute = async () => { const r = await run(() => api.post(`/commission/${disputeFor.value.id}/dispute`, { reason: disputeReason.value }), 'Sent to finance. You will be notified of the decision.'); if (r) { disputeFor.value = null; disputeReason.value = '' } }
</script>

<template>
  <CrmShell title="Earnings">
    <div v-if="d" class="page">
      <div class="page-head">
        <div><h1>{{ can.commission === 'own' ? 'My earnings' : 'Commission' }}</h1><div class="muted">{{ can.commission === 'own' ? 'Only you, your manager and finance can see this' : 'Statements by person' }}</div></div>
        <select v-if="people.length" v-model="person" class="input" style="width: auto" aria-label="Person"><option value="">Everyone in my scope</option><option v-for="p in people" :key="p.id" :value="p.sales_person.id">{{ p.display_name }}</option></select>
      </div>
      <div class="grid-auto">
        <div class="card kpi"><span class="label">Earned (accrued)</span><span class="v">{{ crmMoney(d.totals.accrued, false) }}</span><span class="muted small">on deals clients accepted</span></div>
        <div class="card kpi"><span class="label">Payable now</span><span class="v">{{ crmMoney(d.totals.eligible - d.totals.paid, false) }}</span><span class="muted small">clients have paid</span></div>
        <div class="card kpi"><span class="label">Paid to {{ can.commission === 'own' ? 'you' : 'date' }}</span><span class="v" style="color: var(--green-ink)">{{ crmMoney(d.totals.paid, false) }}</span></div>
        <div class="card kpi" style="background: var(--soft)"><span class="label">Rules in force</span><strong>{{ d.policy?.name || 'Commission policy' }} {{ d.policy?.version_label || '' }}</strong><span class="muted small">Paid as clients pay, net of approved discount</span></div>
      </div>

      <div v-if="isFinance && picked.length" class="dark-box row-wrap">
        <span class="grow">{{ picked.length }} selected</span>
        <button class="btn" :disabled="busy" @click="approve">Approve payout</button>
        <button class="btn" :disabled="busy" @click="paid">Mark paid</button>
      </div>

      <section class="card pad stack">
        <div class="between"><h2>Entries</h2><span class="muted small">Every amount = basis × rate × share</span></div>
        <div class="table-wrap">
          <table class="table" style="min-width: 820px">
            <thead><tr><th v-if="isFinance" /><th>Client · line</th><th v-if="can.commission !== 'own'">Person</th><th>Role</th><th>How it's worked out</th><th class="r">Amount</th><th class="r">Payable</th><th>Status</th><th /></tr></thead>
            <tbody>
              <tr v-for="e in d.entries" :key="e.id">
                <td v-if="isFinance"><input type="checkbox" :checked="picked.includes(e.id)" :disabled="!['eligible', 'approved'].includes(e.state)" :aria-label="`Select ${e.client?.company_name}`" style="width: 20px; height: 20px" @change="toggle(e.id)"></td>
                <td><strong>{{ e.client?.company_name }}</strong><div class="muted small">{{ e.proposal_line?.description }}</div></td>
                <td v-if="can.commission !== 'own'">{{ e.sales_person?.name }}</td>
                <td>{{ crmLabel(e.role) }}</td>
                <td class="mono small">{{ e.explanation }}</td>
                <td class="mono r" style="font-weight: 600">{{ crmFull(e.amount) }}</td>
                <td class="mono r">{{ crmFull(e.eligible_amount) }}</td>
                <td><span class="chip" :class="CRM_STATE_CHIP[e.state]">{{ crmLabel(e.state) }}</span><div class="muted small">{{ e.next }}</div></td>
                <td><button v-if="can.commission === 'own' && e.state !== 'paid'" class="btn btn-ghost" @click="disputeFor = e">Query</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <span v-if="!d.entries.length" class="muted">Nothing yet. Commission appears here as soon as a client accepts a quote you're credited on.</span>
      </section>
    </div>
    <CrmModal :model-value="!!disputeFor" title="Query this amount" @update:model-value="(v: boolean) => { if (!v) disputeFor = null }">
      <span class="muted">{{ disputeFor?.client?.company_name }} · {{ disputeFor?.explanation }}</span>
      <label class="field"><span>What looks wrong?</span><textarea v-model="disputeReason" /></label>
      <template #footer><button class="btn btn-primary" :disabled="busy || !disputeReason" @click="dispute">Send to finance</button></template>
    </CrmModal>
  </CrmShell>
</template>
