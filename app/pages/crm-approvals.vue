<script setup lang="ts">
/** Approvals inbox: the change, the money impact and the reason, decided in one click. */
definePageMeta({ path: '/crm/approvals' })
const api = useCrmApi()
const { load: reloadMe } = useCrmMe()
const { busy, run } = useCrmAction()
const items = ref<any[]>([])
const sel = ref<any>(null)
const reason = ref('')
const loading = ref(true)
const load = async () => {
  loading.value = true
  items.value = (await api.get('/approvals')).items
  sel.value = items.value.find((x) => x.id === sel.value?.id) || items.value[0] || null
  loading.value = false
}
onMounted(load)
const decide = async (decision: string) => {
  const r = await run(() => api.post(`/approvals/${sel.value.id}/decide`, { decision, reason: reason.value }))
  if (!r) return
  const sent = r.result?.submitted
  useCrmToast().ok(decision === 'approved' ? (sent ? 'Approved — the quote has gone to the client.' : 'Approved.') : decision === 'returned' ? 'Sent back with your note.' : 'Rejected.')
  reason.value = ''
  sel.value = null
  await load()
  reloadMe(true)
}
const pctChange = (a: number, b: number) => `${a} → ${b}`
</script>

<template>
  <CrmShell title="Approvals">
    <div class="page">
      <div class="page-head"><div><h1>Approvals</h1><div class="muted">{{ items.length }} waiting for you</div></div></div>
      <div v-if="loading" class="loading">Loading…</div>
      <CrmEmpty v-else-if="!items.length" text="Nothing waiting for you. Nice." />
      <div v-else class="split">
        <section class="card queue" aria-label="Queue">
          <button v-for="a in items" :key="a.id" class="q" :aria-current="sel?.id === a.id" @click="sel = a; reason = ''">
            <div class="between"><strong>{{ a.proposal?.client || crmLabel(a.subject_type) }}</strong><span class="mono small" :style="{ color: a.past_sla ? 'var(--red-ink)' : 'var(--muted)' }">{{ a.hours_waiting }}h / {{ a.sla_hours }}h</span></div>
            <span>{{ a.detail }}</span>
            <div class="row-wrap"><span v-if="a.proposal" class="chip c-sales">{{ a.proposal.reference }} v{{ a.proposal.version_number }}</span><span v-if="a.proposal" class="mono small muted">{{ crmMoney(a.proposal.after.net_total, false) }}</span><span v-if="a.past_sla" class="chip c-bad">Past SLA</span></div>
          </button>
        </section>
        <section v-if="sel" class="card pad-lg stack-lg detail">
          <div class="between" style="align-items: flex-start">
            <div><h2 style="font-size: calc(var(--fs-h2) + 3px)">{{ sel.detail }}</h2><span class="muted">Requested by {{ sel.requested_by }} · your tier: {{ crmLabel(sel.approver_role) }}</span></div>
            <NuxtLink v-if="sel.proposal" :to="`/crm/proposals/${sel.proposal.id}`" class="btn">Open quote</NuxtLink>
          </div>
          <div v-if="sel.proposal" class="kpis">
            <div class="kpi card"><span class="label">Client price</span><span class="num-md">{{ sel.proposal.before ? `${crmMoney(sel.proposal.before.net_total, false)} → ` : '' }}{{ crmMoney(sel.proposal.after.net_total, false) }}</span><span class="muted small">List {{ crmMoney(sel.proposal.after.list_total, false) }}</span></div>
            <div class="kpi card"><span class="label">Discount</span><span class="num-md">{{ sel.proposal.before ? pctChange(sel.proposal.before.discount_pct, sel.proposal.after.discount_pct) : sel.proposal.after.discount_pct }}%</span></div>
            <div class="kpi card"><span class="label">Margin</span><span class="num-md">{{ sel.proposal.before ? pctChange(sel.proposal.before.margin_pct, sel.proposal.after.margin_pct) : sel.proposal.after.margin_pct }}%</span><span class="muted small">Contribution {{ crmMoney(sel.proposal.after.contribution_total, false) }}</span></div>
            <div class="kpi card"><span class="label">Lines below cost</span><span class="num-md" :style="{ color: sel.proposal.below_cost_lines ? 'var(--red-ink)' : undefined }">{{ sel.proposal.below_cost_lines }} of {{ sel.proposal.line_count }}</span></div>
          </div>
          <div v-if="sel.proposal?.diff && (sel.proposal.diff.changes.length || sel.proposal.diff.lines.length)" class="stack" style="gap: 6px">
            <span class="label">What changed since v{{ sel.proposal.before?.version_number }}</span>
            <div v-for="c in sel.proposal.diff.changes" :key="c.field" class="row-wrap"><strong style="width: 180px">{{ c.label }}</strong><span class="mono">{{ c.from }}</span>→<span class="num">{{ c.to }}</span></div>
            <div v-for="(c, i) in sel.proposal.diff.lines" :key="i" class="muted">{{ crmLabel(c.change) }}: {{ c.description }}</div>
          </div>
          <div v-if="sel.proposal?.change_reason" class="soft"><span class="label">Reason</span><div>{{ sel.proposal.change_reason }}</div></div>
          <div class="stack" style="border-top: 1px solid var(--line-2); padding-top: 16px">
            <label class="field"><span>Comment · needed to send back or reject</span><textarea v-model="reason" placeholder="Optional when approving" /></label>
            <div class="row-wrap">
              <button class="btn btn-ok btn-lg" :disabled="busy" @click="decide('approved')">Approve</button>
              <button class="btn btn-lg" :disabled="busy || !reason.trim()" @click="decide('returned')">Send back for changes</button>
              <button class="btn btn-lg btn-danger" :disabled="busy || !reason.trim()" @click="decide('rejected')">Reject</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  </CrmShell>
</template>

<style scoped>
.split { display: flex; flex-wrap: wrap; gap: 18px; align-items: flex-start; }
.queue { flex: 1 1 300px; max-width: 400px; overflow: hidden; }
.detail { flex: 999 1 560px; min-width: 0; }
.q { display: flex; flex-direction: column; gap: 4px; width: 100%; padding: 12px 14px; border: 0; border-bottom: 1px solid var(--line-2); background: var(--panel); text-align: left; cursor: pointer; }
.q[aria-current='true'] { background: #F0F4FE; box-shadow: inset 3px 0 0 var(--blue); }
</style>
