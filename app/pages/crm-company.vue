<script setup lang="ts">
/** Overall manager: coverage per team, "who looks after this client?", and overlaps to decide. */
definePageMeta({ path: '/crm/company' })
const api = useCrmApi()
const { busy, run } = useCrmAction()
const d = ref<any>(null)
const q = ref('')
let t: any
const load = async () => { d.value = await api.get('/company-map', q.value ? { q: q.value } : undefined) }
watch(q, () => { clearTimeout(t); t = setTimeout(load, 250) })
onMounted(load)
const decide = async (dec: any, action: string, leadId?: string) => {
  const r = await run(() => api.post(`/opportunities/${dec.opportunities[0].opportunity}/resolve-overlap`, { action, lead_sales_person: leadId }), 'Decision recorded. Both teams have been told.')
  if (r) load()
}
</script>

<template>
  <CrmShell title="Client coverage">
    <div v-if="d" class="page" style="max-width: 1480px">
      <div><div class="muted">Whole company · {{ d.teams.length }} teams</div><h1>Client coverage</h1></div>
      <div class="grid-auto" style="grid-template-columns: repeat(auto-fit, minmax(170px, 1fr))">
        <div class="card kpi"><span class="label">Clients</span><span class="v">{{ d.kpis.clients }}</span><span class="muted small">with an owner or CRM profile</span></div>
        <div class="card kpi"><span class="label">Salespeople</span><span class="v">{{ d.kpis.people }}</span><span class="muted small">{{ d.kpis.per_person }} clients each on average</span></div>
        <div class="card kpi" :style="{ borderColor: d.kpis.no_owner ? 'var(--amber-line)' : undefined }"><span class="label">No owner</span><span class="v" style="color: var(--amber-ink)">{{ d.kpis.no_owner }}</span></div>
        <div class="card kpi"><span class="label">Not contacted {{ d.cold_after_days }}+ days</span><span class="v" style="color: var(--red)">{{ d.kpis.cold }}</span></div>
        <div class="card kpi"><span class="label">Served by 2+ units</span><span class="v">{{ d.kpis.multi_unit }}</span><span class="muted small">one account lead each</span></div>
      </div>

      <section class="card pad stack">
        <div class="between"><h2>By team</h2><span class="muted small">Open a team to see each person's clients and reassign</span></div>
        <div class="table-wrap">
          <table class="table" style="min-width: 760px">
            <thead><tr><th>Team</th><th>Manager</th><th class="r">People</th><th class="r">Clients</th><th style="width: 190px">Clients per person</th><th class="r">{{ d.cold_after_days }}+ days</th><th class="r">Open deals</th><th /></tr></thead>
            <tbody>
              <tr v-for="t in d.teams" :key="t.id">
                <td><strong>{{ t.name }}</strong></td><td>{{ t.manager || '—' }}</td><td class="mono r">{{ t.people }}</td><td class="mono r">{{ t.clients }}</td>
                <td><div class="row" style="gap: 8px"><div class="bar grow" style="height: 8px"><i :style="{ width: Math.min(100, (t.per_person / 20) * 100) + '%', background: t.per_person > 16 ? 'var(--orange)' : 'var(--blue)' }" /></div><span class="mono" style="width: 34px; text-align: right; font-weight: 600">{{ t.per_person }}</span></div></td>
                <td class="mono r" :style="{ color: t.cold ? 'var(--red-ink)' : undefined, fontWeight: 600 }">{{ t.cold }}</td>
                <td class="mono r">{{ crmMoney(t.pipeline, false) }}</td>
                <td class="r"><NuxtLink :to="{ path: '/crm/team', query: { team: t.id } }" class="btn">Open</NuxtLink></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="row-wrap" style="align-items: flex-start; gap: 18px">
        <section class="card pad stack" style="flex: 2 1 600px; min-width: 0">
          <div class="row-wrap"><h2 class="grow">Who looks after a client?</h2><label class="sr" for="lq">Client or person</label><input id="lq" v-model="q" class="search" style="width: 320px" placeholder="Type a client or a person"></div>
          <div class="table-wrap">
            <table class="table" style="min-width: 640px">
              <thead><tr><th>Client</th><th>Account lead</th><th>Units serving them</th><th class="r">Last contact</th><th class="r">Revenue, 12 mo</th></tr></thead>
              <tbody>
                <tr v-for="r in d.lookup" :key="r.id">
                  <td><NuxtLink :to="`/crm/clients/${r.id}`" style="font-weight: 600; color: var(--ink)">{{ r.name }}</NuxtLink></td>
                  <td><div v-if="r.lead" class="row" style="gap: 8px"><span class="av av-sm" :style="{ background: crmColor(r.lead.name) }">{{ crmInitials(r.lead.name) }}</span><div><div style="font-weight: 600">{{ r.lead.name }}</div><div class="muted small">{{ r.team || '—' }}</div></div></div><span v-else class="chip c-warn">No owner</span></td>
                  <td><div class="row-wrap" style="gap: 4px"><span v-for="u in r.units" :key="u" class="chip">{{ u }}</span></div></td>
                  <td class="r" :style="{ color: r.last_contact_days === null || r.last_contact_days > d.cold_after_days ? 'var(--red-ink)' : undefined }">{{ r.last_contact_days === null ? 'Never' : r.last_contact_days === 0 ? 'Today' : `${r.last_contact_days} days ago` }}</td>
                  <td class="mono r">{{ crmMoney(r.revenue_12m, false) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <span v-if="!d.lookup.length" class="muted">No client or person matches “{{ q }}”.</span>
        </section>

        <aside class="stack" style="flex: 1 1 340px; min-width: 0">
          <section class="card pad stack">
            <h2>Needs your decision <span v-if="d.decisions.length" class="chip c-warn">{{ d.decisions.length }}</span></h2>
            <div v-for="dec in d.decisions" :key="dec.client.id" class="stack" style="gap: 8px; border-top: 1px solid var(--line-2); padding-top: 12px">
              <strong>{{ dec.client.name }} — two teams pitching</strong>
              <span style="color: var(--ink-2)">{{ dec.text }}</span>
              <div class="row-wrap">
                <button v-for="o in dec.opportunities.filter((x: any) => x.sales_person_id)" :key="o.opportunity" class="btn btn-primary" :disabled="busy" @click="decide(dec, 'lead', o.sales_person_id)">{{ o.person?.split(' ')[0] }} leads</button>
                <button class="btn" :disabled="busy" @click="decide(dec, 'separate')">Keep separate</button>
              </div>
            </div>
            <span v-if="!d.decisions.length" style="color: var(--green-ink); font-weight: 600">Nothing to decide right now.</span>
          </section>
          <section class="card pad stack" style="gap: 6px">
            <span class="label">The rule</span>
            <span>Every client has exactly one account lead. Other units can sell to the client, and the lead sees everything they do.</span>
          </section>
        </aside>
      </div>
    </div>
  </CrmShell>
</template>
