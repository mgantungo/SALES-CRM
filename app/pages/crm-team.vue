<script setup lang="ts">
/** Group manager: who looks after which client. Click a client, then "Move here" on a person. */
definePageMeta({ path: '/crm/team' })
const route = useRoute()
const api = useCrmApi()
const { busy, run } = useCrmAction()
const d = ref<any>(null)
const teamId = ref<string | undefined>((route.query.team as string) || undefined)
const sel = ref<any>(null)
const filter = ref('all')
const q = ref('')
const last = ref<any>(null)
const toastText = ref('')
const load = async () => { d.value = await api.get('/team-map', teamId.value ? { team: teamId.value } : undefined) }
onMounted(load)
watch(teamId, load)

const visible = (c: any) => (!q.value || c.name.toLowerCase().includes(q.value.toLowerCase()))
  && (filter.value === 'all' || (filter.value === 'att' && (c.health === 'cold' || c.reason)) || (filter.value === 'shared' && c.shared_units.length))
const pick = (c: any, from: any) => { toastText.value = ''; sel.value = sel.value?.id === c.id ? null : { ...c, from } }
const moveHere = async (rep: any) => {
  const s = sel.value
  const r = await run(() => api.post('/assignments', { client: s.id, sales_person: rep.sales_person_id, reason: 'Reassigned on team map' }))
  if (!r) return
  last.value = r.from ? { client: s.id, sales_person: r.from.id } : null
  toastText.value = `${s.name} is now with ${rep.name}. ${r.from ? `${r.from.name.split(' ')[0]} and ` : ''}${rep.name.split(' ')[0]} have been told.`
  sel.value = null
  load()
}
const undo = async () => {
  const r = await run(() => api.post('/assignments', { ...last.value, reason: 'Undo' }))
  if (r) { toastText.value = 'Undone.'; last.value = null; load() }
}
const applySuggestion = async () => {
  const s = d.value.suggestion
  const r = await run(() => api.post('/assignments/bulk', { moves: s.clients.map((c: any) => ({ client: c.id, sales_person: s.to.id, reason: 'Load balancing' })) }))
  if (r) { toastText.value = `${s.clients.length} clients moved from ${s.from.name} to ${s.to.name}. Both have been told, with each client's history.`; last.value = null; load() }
}
const healthColor = (h: string) => ({ fresh: 'var(--green)', aging: 'var(--amber)', cold: 'var(--red)' } as any)[h] || '#8A8F98'
</script>

<template>
  <CrmShell title="Team map">
    <div v-if="d" class="page" style="max-width: 1500px">
      <div class="page-head">
        <div>
          <div class="muted">{{ d.team?.name }}<template v-if="d.team?.business_unit"> · {{ d.team.business_unit }}</template></div>
          <h1>Who looks after which client</h1>
        </div>
        <div class="row-wrap">
          <select v-if="d.teams.length > 1" v-model="teamId" class="input" style="width: auto" aria-label="Team"><option v-for="t in d.teams" :key="t.id" :value="t.id">{{ t.name }}</option></select>
          <label class="sr" for="tq">Find a client</label>
          <input id="tq" v-model="q" class="search" style="width: 280px" placeholder="Find a client">
        </div>
      </div>
      <CrmEmpty v-if="!d.team" text="No team is set up for you yet. A CRM administrator can create teams in Admin." />
      <template v-else>
        <div class="grid-auto" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))">
          <div class="card kpi"><span class="label">Clients</span><span class="v">{{ d.kpis.clients }}</span><span class="muted small">across {{ d.kpis.people }} people</span></div>
          <div class="card kpi" :style="{ borderColor: d.kpis.unassigned ? 'var(--amber-line)' : undefined }"><span class="label">No owner</span><span class="v" :style="{ color: d.kpis.unassigned ? 'var(--amber-ink)' : 'var(--green-ink)' }">{{ d.kpis.unassigned }}</span><span class="muted small">assign below</span></div>
          <div class="card kpi"><span class="label">Not contacted {{ d.cold_after_days }}+ days</span><span class="v" style="color: var(--red)">{{ d.kpis.cold }}</span><span class="muted small">red dot on the card</span></div>
          <div class="card kpi"><span class="label">Shared with other units</span><span class="v">{{ d.kpis.shared }}</span><span class="muted small">tagged on the card</span></div>
          <div class="card kpi"><span class="label">Open deals</span><span class="v">{{ crmMoney(d.kpis.pipeline, false) }}</span><span class="muted small">this team</span></div>
        </div>
        <div class="row-wrap">
          <button v-for="[k, l] in [['all', 'All clients'], ['att', 'Needs attention'], ['shared', 'Shared with other units']]" :key="k" class="pick" :aria-pressed="filter === k" @click="filter = k">{{ l }}</button>
          <span class="grow" />
          <span class="muted small row" style="gap: 12px"><span><span class="dot h-fresh" /> seen in 14 days</span><span><span class="dot h-aging" /> 15–{{ d.cold_after_days }} days</span><span><span class="dot h-cold" /> {{ d.cold_after_days }}+ days</span></span>
        </div>
        <div v-if="sel" class="dark-box row-wrap" role="status">
          <span class="grow">Moving <strong>{{ sel.name }}</strong> from {{ sel.from }}. Click <strong>Move here</strong> on the person who should look after it.</span>
          <button class="btn" style="background: transparent; color: #fff; border-color: #5A606B" @click="sel = null">Cancel</button>
        </div>
        <div v-if="toastText" class="ok-box row-wrap" role="status">
          <CrmIcon name="check" /><span class="grow" style="font-weight: 600">{{ toastText }}</span>
          <button v-if="last" class="btn" @click="undo">Undo</button>
        </div>

        <div class="table-wrap" style="padding-bottom: 4px">
          <div class="cols" :style="{ gridTemplateColumns: `repeat(${d.reps.length + 1}, minmax(210px, 1fr))`, minWidth: `${(d.reps.length + 1) * 220}px` }">
            <section class="col" :style="{ background: d.unassigned.length ? '#FBEFE3' : undefined }" aria-label="No owner">
              <div class="row" style="gap: 10px; padding: 4px 2px"><span class="av" style="background: #5A606B">?</span><div class="grow"><strong>No owner</strong><div class="muted small">{{ d.unassigned.length }} clients</div></div></div>
              <span class="small" style="font-weight: 600; padding: 0 2px" :style="{ color: d.unassigned.length ? 'var(--amber-ink)' : 'var(--green-ink)' }">{{ d.unassigned.length ? 'Needs owners' : 'All assigned' }}</span>
              <button v-for="c in d.unassigned.filter(visible)" :key="c.id" class="cl" :aria-pressed="sel?.id === c.id" @click="pick(c, 'no owner')">
                <strong>{{ c.name }}</strong><span class="small muted">{{ c.reason }}</span>
              </button>
            </section>
            <section v-for="r in d.reps" :key="r.sales_person_id" class="col" :aria-label="r.name">
              <div class="row" style="gap: 10px; padding: 4px 2px"><span class="av" :style="{ background: crmColor(r.name) }">{{ crmInitials(r.name) }}</span><div class="grow"><strong>{{ r.name }}</strong><div class="muted small">{{ r.count }} clients · <span class="mono">{{ crmMoney(r.pipeline, false) }}</span></div></div></div>
              <div class="row" style="gap: 8px; padding: 0 2px">
                <div class="bar grow" style="height: 6px"><i :style="{ width: Math.min(100, r.count * 10) + '%', background: r.load === 'heavy' ? 'var(--orange)' : 'var(--blue)' }" /></div>
                <span class="small" style="font-weight: 600" :style="{ color: r.load === 'heavy' ? 'var(--amber-ink)' : 'var(--ink-2)' }">{{ crmLabel(r.load) }}</span>
              </div>
              <button v-if="sel && sel.from !== r.name" class="btn btn-primary" :disabled="busy" @click="moveHere(r)">Move here</button>
              <button v-for="c in r.clients.filter(visible)" :key="c.id" class="cl" :aria-pressed="sel?.id === c.id" @click="pick(c, r.name)">
                <strong>{{ c.name }}</strong>
                <span class="row-wrap small" style="gap: 6px; color: var(--ink-2)">
                  <span class="dot" :style="{ background: healthColor(c.health) }" /><span>{{ crmAgo(c.last_contact_days) }}</span>
                  <span v-if="c.pipeline" class="mono">· {{ crmMoney(c.pipeline, false) }}</span>
                  <span v-for="u in c.shared_units" :key="u" class="chip" style="font-size: 11px; padding: 1px 7px">+ {{ u }}</span>
                </span>
              </button>
              <span v-if="!r.clients.length" class="muted small" style="padding: 6px 4px">Nobody here</span>
            </section>
          </div>
        </div>

        <section v-if="d.suggestion" class="card pad row-wrap" style="border-color: #C9D6F7; background: #F6F8FE">
          <CrmIcon name="move" :size="22" />
          <div class="grow" style="min-width: 260px"><strong>Balance the load?</strong> {{ d.suggestion.text }} Move {{ d.suggestion.clients.map((c: any) => c.name).join(', ') }} to {{ d.suggestion.to.name }}.</div>
          <button class="btn btn-primary" :disabled="busy" @click="applySuggestion">Apply suggestion</button>
        </section>
      </template>
    </div>
  </CrmShell>
</template>

<style scoped>
.cols { display: grid; gap: 10px; align-items: start; }
.col { background: #EBEBE6; border-radius: 12px; padding: 10px; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.cl { display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; border-radius: 10px; background: #fff; text-align: left; border: 1.5px solid var(--line); cursor: pointer; }
.cl:hover { border-color: #9DB4F0; }
.cl[aria-pressed='true'] { border-color: var(--blue); background: var(--blue-soft); }
</style>
