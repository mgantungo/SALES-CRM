<script setup lang="ts">
definePageMeta({ path: '/crm' })
const api = useCrmApi()
const { me, isManager } = useCrmMe()
const { run } = useCrmAction()
const data = ref<any>(null)
const dash = ref<any>(null)
const load = async () => {
  data.value = await api.get('/today')
  if (isManager.value) dash.value = await api.get('/dashboard').catch(() => null)
}
onMounted(load)

const hello = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
})
const act = async (t: any) => {
  if (t.kind === 'log') return navigateTo({ path: '/crm/log', query: { client: t.client?.id, opportunity: t.opportunity?.id } })
  if (t.kind === 'quote') return navigateTo({ path: '/crm/quote', query: { client: t.client?.id, opportunity: t.opportunity?.id } })
  if (t.kind === 'lpo') return navigateTo({ path: '/crm/lpo', query: { version: t.version } })
  if (t.kind === 'approvals') return navigateTo('/crm/approvals')
  if (t.kind === 'extend') {
    const r = await run(() => api.post(`/versions/${t.version}/extend`, { days: 7 }))
    if (r) { useCrmToast().ok(r.message); load() }
    return
  }
  if (t.kind === 'task') {
    const r = await run(() => api.put(`/tasks/${t.task}`, { state: 'completed' }), 'Task done')
    if (r) load()
  }
}
const pct = (a: number, b: number) => (b ? Math.min(100, Math.round((a / b) * 100)) : 0)
</script>

<template>
  <CrmShell title="Today">
    <div class="page">
      <div class="page-head">
        <div>
          <div class="muted">{{ new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) }}</div>
          <h1>{{ hello }}, {{ data?.greeting?.name || me?.profile?.display_name }}</h1>
        </div>
        <NuxtLink v-if="isManager" to="/crm/team" class="btn">Open team map</NuxtLink>
      </div>

      <div v-if="!data" class="muted">Loading…</div>
      <template v-else>
        <NuxtLink v-if="data.earnings" to="/crm/earnings" class="earn">
          <span class="grow">Earned this month</span>
          <span class="mono" style="font-weight: 600; font-size: 18px">{{ crmMoney(data.earnings.month_accrued) }}</span>
          <CrmIcon name="next" :size="18" />
        </NuxtLink>

        <div class="grid-2">
          <section class="stack" aria-labelledby="dn">
            <h2 id="dn" class="label row" style="gap: 8px">Do next <span v-if="data.todos.length" class="cnt mono">{{ data.todos.length }}</span></h2>
            <div v-for="t in data.todos" :key="t.id" class="todo card">
              <span class="av" :style="{ background: crmColor(t.client?.name || t.title) }">{{ t.client ? crmInitials(t.client.name) : '!' }}</span>
              <div class="grow">
                <div style="font-weight: 700">{{ t.title }}</div>
                <div class="muted" :style="{ color: t.overdue ? 'var(--red-ink)' : undefined }">{{ t.sub }}</div>
              </div>
              <button class="btn-act" @click="act(t)">{{ t.button }}</button>
            </div>
            <div v-if="!data.todos.length" class="card pad" style="text-align: center; color: var(--green-ink); font-weight: 700">All clear for today. Nice work.</div>
          </section>

          <section class="stack">
            <div v-if="data.month.target" class="card pad stack" style="gap: 8px">
              <div class="label">My month</div>
              <div class="between"><span>Won</span><span class="mono" style="font-size: 20px; font-weight: 600">{{ crmMoney(data.month.won, false) }} <span class="muted">of {{ crmMoney(data.month.target, false) }}</span></span></div>
              <div class="bar"><i :style="{ width: pct(data.month.won, data.month.target) + '%', background: 'var(--green)' }" /></div>
              <span class="muted">{{ data.month.to_go ? `${crmMoney(data.month.to_go)} to go` : 'Target reached 🎯' }}</span>
            </div>

            <div v-if="dash" class="card pad stack" style="gap: 10px">
              <div class="between"><span class="label">Pipeline in my scope</span><NuxtLink to="/crm/deals" class="small" style="font-weight: 600">Open board</NuxtLink></div>
              <div class="between"><span>Weighted forecast</span><strong class="mono">{{ crmMoney(dash.totals.weighted) }}</strong></div>
              <div v-for="l in dash.lanes" :key="l.key" class="lane-row">
                <span>{{ l.name }}</span>
                <div class="bar" style="height: 8px"><i :style="{ width: (dash.totals.value ? Math.max(4, (l.value / dash.totals.value) * 100) : 0) + '%' }" /></div>
                <span class="mono r small">{{ l.count }} · {{ crmMoney(l.value, false) }}</span>
              </div>
              <div class="row" style="gap: 20px; border-top: 1px solid var(--line-2); padding-top: 10px">
                <div><div class="label">Won this month</div><div class="mono" style="font-weight: 600; color: var(--green-ink)">{{ dash.won.count }} · {{ crmMoney(dash.won.value, false) }}</div></div>
                <div><div class="label">Lost</div><div class="mono" style="font-weight: 600">{{ dash.lost.count }} · {{ crmMoney(dash.lost.value, false) }}</div></div>
                <div><div class="label">Overdue tasks</div><div class="mono" style="font-weight: 600">{{ dash.overdue_tasks }}</div></div>
              </div>
            </div>

            <template v-if="data.deals.length">
              <h2 class="label">My deals</h2>
              <NuxtLink v-for="d in data.deals" :key="d.id" :to="`/crm/deals/${d.id}`" class="card deal click">
                <div class="between"><strong>{{ d.client.name }}</strong><span class="mono" style="font-weight: 600">{{ crmMoney(d.value, false) }}</span></div>
                <CrmSteps :step="d.step" />
                <span class="muted">{{ d.step.label }} · {{ d.status_line }}</span>
                <span v-if="d.overlap" class="chip c-warn" style="align-self: flex-start">Another team is also talking to them</span>
              </NuxtLink>
            </template>
          </section>
        </div>
      </template>
    </div>
  </CrmShell>
</template>

<style scoped>
.earn { display: flex; align-items: center; gap: 10px; min-height: 54px; padding: 0 16px; border-radius: 14px; background: var(--ink); color: #fff; text-decoration: none; }
.earn:hover { color: #fff; background: #2C313C; }
.earn .grow { color: #D5D8DE; }
.cnt { background: var(--orange); color: #fff; border-radius: 999px; padding: 0 7px; font-size: 11px; letter-spacing: 0; }
.todo { display: flex; align-items: center; gap: 12px; padding: 14px; }
.deal { display: flex; flex-direction: column; gap: 8px; padding: 14px 16px; }
.lane-row { display: grid; grid-template-columns: 90px 1fr 110px; align-items: center; gap: 10px; }
</style>
