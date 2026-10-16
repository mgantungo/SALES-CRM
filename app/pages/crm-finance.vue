<script setup lang="ts">
/** Finance: ready to bill, invoice requests, open invoices, aging and collections. */
definePageMeta({ path: '/crm/finance', crmRoles: ['finance', 'executive', 'senior_manager', 'admin'] })
const api = useCrmApi()
const { busy, run } = useCrmAction()
const d = ref<any>(null)
const load = async () => { d.value = await api.get('/finance') }
onMounted(load)
const request = async (b: any) => { const r = await run(() => api.post(`/billing-items/${b.id}/request-invoice`), 'Invoice requested'); if (r) load() }
const issueFor = ref<any>(null)
const issue = reactive({ number: '', due_date: '' })
const doIssue = async () => { const r = await run(() => api.post(`/crm-invoices/${issueFor.value.id}/issued`, issue), 'Invoice marked issued'); if (r) { issueFor.value = null; load() } }
const payFor = ref<any>(null)
const pay = reactive({ amount: '', method: 'bank', reference: '', paid_on: crmToday() })
const doPay = async () => { const r = await run(() => api.post(`/crm-invoices/${payFor.value.id}/payments`, pay), 'Payment recorded. Commission updated.'); if (r) { payFor.value = null; load() } }
const agingTotal = computed(() => d.value ? Object.values(d.value.aging).reduce((a: number, b: any) => a + b, 0) : 0)
</script>

<template>
  <CrmShell title="Finance">
    <div v-if="d" class="page">
      <div class="page-head"><div><h1>Finance</h1><div class="muted">The finance system stays the source of truth; the CRM requests invoices and mirrors their status.</div></div></div>
      <div class="kpis">
        <div class="card kpi"><span class="label">Collected this month</span><span class="v" style="color: var(--green-ink)">{{ crmMoney(d.collected_this_month, false) }}</span></div>
        <div class="card kpi"><span class="label">Outstanding</span><span class="v">{{ crmMoney(agingTotal, false) }}</span></div>
        <div class="card kpi"><span class="label">Not yet due</span><span class="v">{{ crmMoney(d.aging.current, false) }}</span></div>
        <div class="card kpi"><span class="label">1–30 days late</span><span class="v">{{ crmMoney(d.aging.d1_30, false) }}</span></div>
        <div class="card kpi"><span class="label">31–90 days</span><span class="v" style="color: var(--amber-ink)">{{ crmMoney(d.aging.d31_60 + d.aging.d61_90, false) }}</span></div>
        <div class="card kpi"><span class="label">90+ days</span><span class="v" style="color: var(--red)">{{ crmMoney(d.aging.d90_plus, false) }}</span></div>
      </div>

      <section class="card pad stack">
        <h2>Ready to bill <span class="chip">{{ d.ready_to_bill.length }}</span></h2>
        <div v-for="b in d.ready_to_bill" :key="b.id" class="list-row">
          <div class="grow"><strong>{{ b.project?.client?.company_name }}</strong> · {{ b.label }}<div class="muted small">Due {{ crmDate(b.due_date) }} · {{ crmLabel(b.trigger_type) }}</div></div>
          <span class="num">{{ crmMoney(b.amount, false) }}</span>
          <span v-if="!b.readiness?.ok" class="chip c-warn">{{ b.readiness?.why }}</span>
          <button class="btn btn-primary" :disabled="busy || !b.readiness?.ok" @click="request(b)">Request invoice</button>
        </div>
        <span v-if="!d.ready_to_bill.length" class="muted">Nothing due to bill.</span>
      </section>

      <div class="grid-2">
        <section class="card pad stack">
          <h2>Requested · enter in the finance system</h2>
          <div v-for="i in d.requested" :key="i.id" class="list-row">
            <div class="grow"><strong>{{ i.client?.company_name }}</strong><div class="muted small">{{ i.project?.name }}</div></div>
            <span class="mono">{{ crmMoney(i.amount, false) }}</span>
            <button class="btn" @click="issueFor = i; issue.number = ''; issue.due_date = ''">Mark issued</button>
          </div>
          <span v-if="!d.requested.length" class="muted">No pending requests.</span>
        </section>
        <section class="card pad stack">
          <h2>Open invoices</h2>
          <div v-for="i in d.open_invoices" :key="i.id" class="list-row">
            <div class="grow"><strong>{{ i.number }}</strong> · {{ i.client?.company_name }}<div class="muted small">Due {{ crmDate(i.due_date) }} · balance {{ crmFull(i.balance) }}</div></div>
            <span class="chip" :class="CRM_STATE_CHIP[i.state]">{{ crmLabel(i.state) }}</span>
            <button class="btn" @click="payFor = i; pay.amount = String(i.balance)">Payment</button>
          </div>
          <span v-if="!d.open_invoices.length" class="muted">No open invoices.</span>
        </section>
      </div>

      <section class="card pad stack">
        <h2>Upcoming billing</h2>
        <div v-for="b in d.upcoming" :key="b.id" class="list-row">
          <div class="grow">{{ b.project?.client?.company_name }} · {{ b.label }}<div class="muted small">Due {{ crmDate(b.due_date) }}</div></div>
          <span class="mono">{{ crmMoney(b.amount, false) }}</span>
          <span v-if="!b.readiness?.ok" class="chip c-warn">{{ b.readiness?.why }}</span>
        </div>
      </section>
    </div>
    <CrmModal :model-value="!!issueFor" title="Invoice issued" @update:model-value="(v: boolean) => { if (!v) issueFor = null }">
      <label class="field"><span>Invoice number</span><input v-model="issue.number"></label>
      <label class="field"><span>Due date</span><input v-model="issue.due_date" type="date"></label>
      <template #footer><button class="btn btn-primary" :disabled="busy || !issue.number" @click="doIssue">Save</button></template>
    </CrmModal>
    <CrmModal :model-value="!!payFor" title="Record payment" @update:model-value="(v: boolean) => { if (!v) payFor = null }">
      <div class="grid-auto" style="gap: 12px">
        <label class="field"><span>Amount (UGX)</span><input v-model="pay.amount" class="mono" inputmode="numeric"></label>
        <label class="field"><span>Paid on</span><input v-model="pay.paid_on" type="date"></label>
        <label class="field"><span>Method</span><select v-model="pay.method"><option value="bank">Bank</option><option value="mobile_money">Mobile money</option><option value="cheque">Cheque</option><option value="cash">Cash</option></select></label>
        <label class="field"><span>Reference</span><input v-model="pay.reference"></label>
      </div>
      <template #footer><button class="btn btn-primary" :disabled="busy || !pay.amount" @click="doPay">Record</button></template>
    </CrmModal>
  </CrmShell>
</template>
