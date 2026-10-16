<script setup lang="ts">
/** Project workspace: independent workstreams, blockers, costs per workstream, billing and changes. */
definePageMeta({ path: '/crm/projects/:id' })
const route = useRoute()
const api = useCrmApi()
const { role } = useCrmMe()
const { busy, run } = useCrmAction()
const toast = useCrmToast()
const d = ref<any>(null)
const tab = ref('work')
const load = async () => { d.value = await api.get(`/projects/${route.params.id}`) }
onMounted(load)
const p = computed(() => d.value?.project)

// timeline maths
const range = computed(() => {
  const ws = d.value?.workstreams || []
  const starts = ws.map((w: any) => w.planned_start).filter(Boolean).sort()
  const ends = ws.map((w: any) => w.planned_end).filter(Boolean).sort()
  if (!starts.length) return null
  const s = new Date(`${starts[0]}T12:00:00`); s.setDate(1)
  const e = new Date(`${ends[ends.length - 1]}T12:00:00`)
  const months: string[] = []
  const c = new Date(s)
  while (c <= e && months.length < 36) { months.push(c.toLocaleDateString('en-GB', { month: 'short' })); c.setMonth(c.getMonth() + 1) }
  return { s: s.getTime(), e: new Date(e.getFullYear(), e.getMonth() + 1, 1).getTime(), months }
})
const bar = (w: any) => {
  if (!range.value || !w.planned_start) return { left: '0%', width: '0%' }
  const span = range.value.e - range.value.s
  const a = new Date(`${w.planned_start}T12:00:00`).getTime()
  const b = new Date(`${w.planned_end || w.planned_start}T12:00:00`).getTime()
  return { left: `${((a - range.value.s) / span) * 100}%`, width: `${Math.max(2, ((b - a) / span) * 100)}%` }
}
const nowLeft = computed(() => range.value ? `${Math.min(100, Math.max(0, ((Date.now() - range.value.s) / (range.value.e - range.value.s)) * 100))}%` : '0')

// workstream actions
const wsModal = ref<{ kind: string; ws: any } | null>(null)
const form = reactive<any>({})
const open = (kind: string, ws: any) => { Object.keys(form).forEach((k) => delete form[k]); wsModal.value = { kind, ws } }
const setState = async (ws: any, state: string) => {
  const r = await run(() => api.put(`/workstreams/${ws.id}`, { state }), `${ws.name}: ${crmLabel(state)}`)
  if (r) load()
}
const submitWs = async () => {
  const m = wsModal.value!
  let r: any = null
  if (m.kind === 'complete') r = await run(() => api.put(`/workstreams/${m.ws.id}`, { state: 'completed', completion_note: form.note }), 'Workstream completed. The project stays open until all required work is done.')
  if (m.kind === 'block') r = await run(() => api.put(`/workstreams/${m.ws.id}`, { state: 'blocked', reason: form.note }), 'Marked blocked; an unblock task was created')
  if (m.kind === 'cost') r = await run(() => api.post(`/workstreams/${m.ws.id}/costs`, { amount: form.amount, cost_type: form.cost_type || 'internal', kind: form.kind || 'actual', note: form.note }))
  if (m.kind === 'milestone') r = await run(() => api.post(`/workstreams/${m.ws.id}/milestones`, { name: form.name, baseline_date: form.date, is_billing_trigger: !!form.bill, billing_amount: form.amount }), 'Milestone added')
  if (m.kind === 'task') r = await run(() => api.post('/tasks', { workstream: m.ws.id, title: form.name, due_date: form.date, priority: form.priority || 'normal' }), 'Task added')
  if (m.kind === 'recurring') r = await run(() => api.post(`/workstreams/${m.ws.id}/recurring`, { title: form.name, frequency: form.frequency || 'monthly', day_of_month: form.day || 1 }), 'Repeating work set up; this period\'s task is created')
  if (r) {
    if (m.kind === 'cost' && r.over_budget) toast.error(`${m.ws.name} is now over budget.`)
    else if (m.kind === 'cost') toast.ok('Cost recorded')
    wsModal.value = null
    load()
  }
}
const taskDone = async (t: any) => { const r = await run(() => api.put(`/tasks/${t.id}`, { state: 'completed' }), 'Task done'); if (r) load() }
const msDone = async (m: any) => { const r = await run(() => api.put(`/milestones/${m.id}`, { state: 'done' }), 'Milestone reached'); if (r) load() }

// billing
const requestInvoice = async (b: any) => { const r = await run(() => api.post(`/billing-items/${b.id}/request-invoice`), 'Invoice requested from finance'); if (r) load() }
const exceptionFor = ref<any>(null)
const exceptionReason = ref('')
const askException = async () => {
  const r = await run(() => api.post(`/billing-items/${exceptionFor.value.id}/exception`, { reason: exceptionReason.value }), 'Exception requested from finance')
  if (r) { exceptionFor.value = null; exceptionReason.value = '' }
}

// change and closure
const crOpen = ref(false)
const cr = reactive<any>({ change_type: 'extension', workstream: '', reason: '', new_end_date: '', price_impact: '', cost_impact: '' })
const sendCr = async () => {
  const r = await run(() => api.post(`/projects/${p.value.id}/change-requests`, { ...cr, workstream: cr.workstream || undefined, new_end_date: cr.new_end_date || undefined }), 'Change request sent for approval')
  if (r) { crOpen.value = false; load() }
}
const closeOpen = ref(false)
const closeReason = ref('')
const close = async (override = false) => {
  const r = await run(() => api.post(`/projects/${p.value.id}/close`, { reason: closeReason.value, override }))
  if (r) { toast.ok(r.closed ? 'Project closed' : 'Early closure sent for approval'); closeOpen.value = false; load() }
}
const canBill = computed(() => ['finance', 'executive', 'senior_manager', 'project_manager', 'supervisor'].includes(role.value || ''))
</script>

<template>
  <CrmShell :title="p?.name || 'Project'" back="/crm/projects">
    <div v-if="d" class="page">
      <section class="card pad-lg stack">
        <div class="between" style="align-items: flex-start; flex-wrap: wrap">
          <div>
            <NuxtLink :to="`/crm/clients/${p.client?.id}`" class="muted">{{ p.client?.company_name }}</NuxtLink>
            <h1 style="margin-top: 4px">{{ p.name }}</h1>
            <div class="row-wrap" style="margin-top: 8px">
              <span class="chip" :class="CRM_STATE_CHIP[p.state]">{{ crmLabel(p.state) }}</span>
              <span class="chip" :class="{ on_track: 'c-ok', at_risk: 'c-warn', off_track: 'c-bad' }[p.health as string]">{{ crmLabel(p.health) }}</span>
              <span class="muted">PM {{ p.project_manager?.display_name || '—' }} · {{ crmDate(p.start_date) }} – {{ crmDate(p.end_date) }}</span>
            </div>
          </div>
          <div v-if="d.can.manage && p.state !== 'completed'" class="row-wrap">
            <button class="btn" @click="crOpen = true">Raise change request</button>
            <button class="btn" :class="{ 'btn-ok': d.closure.can_close }" @click="d.closure.can_close ? close(false) : (closeOpen = true)">{{ d.closure.can_close ? 'Close project' : 'Close early…' }}</button>
          </div>
        </div>
        <span class="muted small">{{ d.closure.text }}</span>
        <div class="grid-auto" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); border-top: 1px solid var(--line-2); padding-top: 14px">
          <div><div class="label">Contracted</div><div class="num-md">{{ crmMoney(d.finance.contracted, false) }}</div></div>
          <div><div class="label">Invoiced</div><div class="num-md">{{ crmMoney(d.finance.invoiced, false) }}</div></div>
          <div><div class="label">Received</div><div class="num-md">{{ crmMoney(d.finance.received, false) }}</div></div>
          <div><div class="label">Overdue</div><div class="num-md" :style="{ color: d.finance.overdue ? 'var(--red-ink)' : undefined }">{{ crmMoney(d.finance.overdue, false) }}</div></div>
          <div v-if="d.costs.budget !== undefined"><div class="label">Cost vs budget</div><div class="num-md">{{ crmMoney(d.costs.actual, false) }} / {{ crmMoney(d.costs.budget, false) }}</div></div>
        </div>
      </section>

      <section v-if="range" class="card pad stack">
        <div class="between"><h2>Workstreams</h2><span class="muted small">Each runs and closes on its own. Finishing one never closes the project.</span></div>
        <div class="table-wrap">
          <div style="min-width: 780px">
            <div class="tl-row head"><span /><div class="tl-months"><span v-for="(m, i) in range.months" :key="i">{{ m }}</span></div></div>
            <div v-for="w in d.workstreams" :key="w.id" class="tl-row">
              <div><strong>{{ w.name }}</strong><div class="muted small">{{ crmLabel(w.duration_type) }} · {{ w.owner?.display_name || 'No owner' }}</div></div>
              <div class="tl-track">
                <div class="tl-bar" :class="`s-${w.state}`" :style="bar(w)">{{ crmLabel(w.state) }}</div>
                <div class="tl-now" :style="{ left: nowLeft }" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="tabs" role="tablist">
        <button v-for="[k, l] in [['work', 'Workstreams'], ['tasks', 'Tasks'], ['billing', 'Billing'], ['changes', 'Changes']]" :key="k" class="tab" role="tab" :aria-selected="tab === k" @click="tab = k">{{ l }}</button>
      </div>

      <div v-if="tab === 'work'" class="grid-2">
        <section v-for="w in d.workstreams" :key="w.id" class="card pad stack">
          <div class="between"><h2>{{ w.name }}</h2><span class="chip" :class="CRM_STATE_CHIP[w.state]">{{ crmLabel(w.state) }}</span></div>
          <span class="muted small">{{ crmDate(w.planned_start) }} – {{ crmDate(w.planned_end) }}<template v-if="w.late"> · <strong style="color: var(--red-ink)">late</strong></template><template v-if="w.provider"> · {{ w.provider.name }}</template></span>
          <div v-if="w.budget !== undefined" class="stack" style="gap: 4px">
            <div class="between small"><span :style="{ color: w.overrun ? 'var(--amber-ink)' : undefined, fontWeight: w.overrun ? 700 : 400 }">Cost {{ w.overrun ? `· +${w.overrun_pct}%` : '' }}</span><span class="mono">{{ crmMoney(w.actual_cost, false) }} / {{ crmMoney(w.budget, false) }}</span></div>
            <div class="bar" style="height: 8px"><i :style="{ width: Math.min(100, w.budget ? (w.actual_cost / w.budget) * 100 : 0) + '%', background: w.overrun ? 'var(--orange)' : 'var(--teal-ink)' }" /></div>
          </div>
          <div v-for="m in w.milestones" :key="m.id" class="row small">
            <CrmIcon :name="m.state === 'done' ? 'check' : 'today'" :size="16" /><span class="grow">{{ m.name }} · {{ crmDate(m.revised_date || m.baseline_date) }}<template v-if="m.is_billing_trigger"> · bills {{ crmMoney(m.billing_amount) }}</template></span>
            <button v-if="m.state !== 'done' && d.can.manage" class="btn btn-sm" @click="msDone(m)">Reached</button>
          </div>
          <div v-if="w.completion_note" class="soft small">{{ w.completion_note }}</div>
          <div v-if="d.can.manage && !['completed', 'cancelled'].includes(w.state)" class="row-wrap">
            <button v-if="w.state === 'pending'" class="btn" @click="setState(w, 'in_progress')">Start</button>
            <button v-if="w.state === 'blocked'" class="btn" @click="setState(w, 'in_progress')">Unblocked</button>
            <button class="btn btn-ok" @click="open('complete', w)">Complete</button>
            <button v-if="w.state !== 'blocked'" class="btn" @click="open('block', w)">Blocked</button>
            <button class="btn" @click="open('cost', w)">Add cost</button>
            <button class="btn btn-ghost" @click="open('milestone', w)">+ Milestone</button>
            <button class="btn btn-ghost" @click="open('task', w)">+ Task</button>
            <button class="btn btn-ghost" @click="open('recurring', w)">+ Repeating</button>
          </div>
        </section>
      </div>

      <section v-else-if="tab === 'tasks'" class="card pad stack" style="gap: 4px">
        <div v-for="t in d.tasks" :key="t.id" class="list-row">
          <div class="grow"><strong :style="{ textDecoration: t.state === 'completed' ? 'line-through' : undefined }">{{ t.title }}</strong><div class="muted small">{{ t.workstream?.name }} · {{ t.assignee?.display_name || 'Unassigned' }}<template v-if="t.due_date"> · due {{ crmDate(t.due_date) }}</template><template v-if="t.depends_on && t.depends_on.state !== 'completed'"> · waits for “{{ t.depends_on.title }}”</template></div></div>
          <span class="chip" :class="CRM_STATE_CHIP[t.state]">{{ crmLabel(t.state) }}</span>
          <button v-if="!['completed', 'cancelled'].includes(t.state)" class="btn" @click="taskDone(t)">Done</button>
        </div>
        <div v-if="!d.tasks.length" class="muted">No tasks yet.</div>
      </section>

      <section v-else-if="tab === 'billing'" class="card pad">
        <div class="table-wrap">
          <table class="table" style="min-width: 640px">
            <thead><tr><th>Billing item</th><th>Due</th><th class="r">Amount</th><th>Status</th><th /></tr></thead>
            <tbody>
              <tr v-for="b in d.billing" :key="b.id">
                <td>{{ b.label }}</td><td>{{ crmDate(b.due_date) }}</td><td class="mono r">{{ crmFull(b.amount) }}</td>
                <td><span class="chip" :class="CRM_STATE_CHIP[b.state]">{{ crmLabel(b.state) }}</span></td>
                <td class="r"><template v-if="b.state === 'not_billed' && canBill"><button class="btn" :disabled="busy" @click="requestInvoice(b)">Request invoice</button> <button class="btn btn-ghost" @click="exceptionFor = b">No LPO?</button></template></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else class="card pad stack" style="gap: 4px">
        <div v-for="c in d.changes" :key="c.id" class="list-row">
          <div class="grow"><strong>{{ crmLabel(c.change_type) }}</strong> <span class="muted">· {{ c.workstream?.name || 'Whole project' }}</span><div class="muted small">{{ c.reason }}</div></div>
          <span class="chip" :class="{ applied: 'c-ok', rejected: 'c-bad', pending: 'c-warn' }[c.state as string]">{{ crmLabel(c.state) }}</span>
        </div>
        <div v-for="b in d.baselines" :key="b.id" class="list-row muted small"><span class="grow">Baseline: {{ b.label }}</span><span>{{ crmDateTime(b.createdAt) }}</span></div>
      </section>
    </div>

    <CrmModal :model-value="!!wsModal" :title="wsModal ? ({ complete: 'Complete', block: 'What is blocking', cost: 'Add cost to', milestone: 'Milestone on', task: 'Task on', recurring: 'Repeating work on' } as any)[wsModal.kind] + ' ' + wsModal.ws.name : ''" @update:model-value="(v: boolean) => { if (!v) wsModal = null }">
      <template v-if="wsModal?.kind === 'complete' || wsModal?.kind === 'block'">
        <label class="field"><span>{{ wsModal.kind === 'complete' ? 'Evidence: what was delivered and who accepted it' : 'What is blocking it?' }}</span><textarea v-model="form.note" /></label>
      </template>
      <template v-if="wsModal?.kind === 'cost'">
        <div class="grid-auto" style="gap: 12px">
          <label class="field"><span>Amount (UGX)</span><input v-model="form.amount" class="mono" inputmode="numeric"></label>
          <label class="field"><span>Type</span><select v-model="form.cost_type"><option value="internal">Internal</option><option value="third_party">Third party</option><option value="other">Other</option></select></label>
          <label class="field"><span>Actual or committed</span><select v-model="form.kind"><option value="actual">Actual</option><option value="committed">Committed</option></select></label>
        </div>
        <label class="field"><span>Note / reference</span><input v-model="form.note"></label>
      </template>
      <template v-if="['milestone', 'task', 'recurring'].includes(wsModal?.kind || '')">
        <label class="field"><span>{{ wsModal?.kind === 'recurring' ? 'What repeats (e.g. Monthly site photos)' : 'Name' }}</span><input v-model="form.name"></label>
        <div class="grid-auto" style="gap: 12px">
          <label v-if="wsModal?.kind !== 'recurring'" class="field"><span>Date</span><input v-model="form.date" type="date"></label>
          <label v-if="wsModal?.kind === 'recurring'" class="field"><span>How often</span><select v-model="form.frequency"><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="quarterly">Quarterly</option></select></label>
          <label v-if="wsModal?.kind === 'recurring'" class="field"><span>Day of month</span><input v-model="form.day" inputmode="numeric" placeholder="1"></label>
          <label v-if="wsModal?.kind === 'milestone'" class="field"><span>Bills the client?</span><select v-model="form.bill"><option :value="false">No</option><option :value="true">Yes</option></select></label>
          <label v-if="wsModal?.kind === 'milestone' && form.bill" class="field"><span>Billing amount</span><input v-model="form.amount" class="mono" inputmode="numeric"></label>
        </div>
      </template>
      <template #footer><button class="btn btn-primary" :disabled="busy" @click="submitWs">Save</button></template>
    </CrmModal>

    <CrmModal v-model="crOpen" title="Change request">
      <label class="field"><span>Type</span><select v-model="cr.change_type"><option value="extension">Extension</option><option value="scope_change">Scope change</option><option value="price_change">Price change</option><option value="cancellation">Cancel a workstream</option><option value="early_closure">Early closure</option></select></label>
      <label class="field"><span>Workstream</span><select v-model="cr.workstream"><option value="">Whole project</option><option v-for="w in d?.workstreams" :key="w.id" :value="w.id">{{ w.name }}</option></select></label>
      <label class="field"><span>Reason</span><textarea v-model="cr.reason" /></label>
      <div class="grid-auto" style="gap: 12px">
        <label v-if="cr.change_type === 'extension'" class="field"><span>New end date</span><input v-model="cr.new_end_date" type="date"></label>
        <label class="field"><span>Price impact (UGX)</span><input v-model="cr.price_impact" class="mono" inputmode="numeric"></label>
        <label class="field"><span>Cost impact (UGX)</span><input v-model="cr.cost_impact" class="mono" inputmode="numeric"></label>
      </div>
      <span class="muted small">The current plan is kept as a baseline. The change applies once approved.</span>
      <template #footer><button class="btn btn-primary" :disabled="busy || !cr.reason" @click="sendCr">Send for approval</button></template>
    </CrmModal>

    <CrmModal v-model="closeOpen" title="Close early">
      <div class="warn-box">{{ d?.closure.text }}</div>
      <label class="field"><span>Why close now?</span><textarea v-model="closeReason" /></label>
      <template #footer><button class="btn btn-dark" :disabled="busy || !closeReason" @click="close(true)">Ask for approval</button></template>
    </CrmModal>

    <CrmModal :model-value="!!exceptionFor" title="Bill without the LPO?" @update:model-value="(v: boolean) => { if (!v) exceptionFor = null }">
      <span class="muted">Billing normally waits for a verified LPO or signed contract. Finance can approve an exception.</span>
      <label class="field"><span>Reason</span><textarea v-model="exceptionReason" /></label>
      <template #footer><button class="btn btn-primary" :disabled="busy || !exceptionReason" @click="askException">Ask finance</button></template>
    </CrmModal>
  </CrmShell>
</template>

<style scoped>
.tl-row { display: grid; grid-template-columns: 220px 1fr; gap: 12px; align-items: center; min-height: calc(var(--ctl) + 10px); border-top: 1px solid var(--line-2); }
.tl-row.head { min-height: 32px; border-top: 0; }
.tl-months { display: flex; }
.tl-months span { flex: 1; text-align: center; font-size: 12px; color: var(--muted); font-weight: 600; }
.tl-track { position: relative; height: 30px; }
.tl-bar { position: absolute; top: 0; height: 30px; border-radius: 6px; font-size: 12px; font-weight: 600; display: flex; align-items: center; padding: 0 10px; white-space: nowrap; overflow: hidden; background: var(--purple-soft); color: var(--purple-ink); }
.tl-bar.s-in_progress { background: var(--purple-ink); color: #fff; }
.tl-bar.s-completed { background: var(--green-soft); color: var(--green-ink); }
.tl-bar.s-blocked { background: var(--red-soft); color: var(--red-ink); }
.tl-bar.s-cancelled { background: #EEEFF2; color: var(--muted); text-decoration: line-through; }
.tl-now { position: absolute; top: -6px; bottom: -6px; width: 2px; background: var(--blue); }
</style>
