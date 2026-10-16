<script setup lang="ts">
/** One sheet from "yes" to delivery: acceptance evidence, LPO check, project from the proposal lines. */
definePageMeta({ path: '/crm/accept/:versionId' })
const route = useRoute()
const api = useCrmApi()
const { busy, run } = useCrmAction()
const toast = useCrmToast()
const d = ref<any>(null)
const vid = computed(() => route.params.versionId as string)
const load = async () => { d.value = await api.get(`/versions/${vid.value}`) }
onMounted(async () => {
  await load()
  pms.value = await api.get('/people', { role: 'project_manager' }).catch(() => [])
  groups.value = (d.value?.version?.lines || []).map((l: any) => ({ name: l.product?.name || l.description, line_ids: [l.id], pick: false }))
  projectName.value = d.value?.proposal?.title || ''
  lpo.value = d.value?.version?.net_total
  lpoTerms.value = d.value?.version?.payment_terms_days
})
const v = computed(() => d.value?.version)
const accepted = computed(() => v.value?.state === 'accepted')

// 1. acceptance
const acc = reactive({ accepted_on: crmToday(), accepted_by_contact: '', evidence_file: null as number | null })
const accept = async () => {
  const r = await run(() => api.post(`/versions/${vid.value}/accept`, acc))
  if (r) { toast.ok(r.message); await load() }
}

// 2. LPO
const lpoFile = ref<number | null>(null)
const lpoNumber = ref('')
const lpo = ref<any>('')
const lpoTerms = ref<any>('')
const lpoResult = ref<any>(null)
const saveLpo = async () => {
  const r = await run(() => api.post('/lpos', { version: vid.value, number: lpoNumber.value, value: Number(lpo.value), payment_terms_days: lpoTerms.value === '' ? undefined : Number(lpoTerms.value), file: lpoFile.value }))
  if (r) { lpoResult.value = r; await load() }
}
const resolveLpo = async (resolution: string) => {
  const r = await run(() => api.post(`/lpos/${lpoResult.value.lpo.id}/resolve`, { resolution }), 'Recorded')
  if (r) { lpoResult.value = null; await load() }
}

// 3. project
const pms = ref<any[]>([])
const pm = ref('')
const projectName = ref('')
const groups = ref<any[]>([])
const lineOf = (id: string) => v.value?.lines?.find((l: any) => l.id === id)
const groupNet = (g: any) => g.line_ids.reduce((a: number, id: string) => a + Number(lineOf(id)?.net_price || 0), 0)
const merge = () => {
  const sel = groups.value.filter((g) => g.pick)
  if (sel.length < 2) return
  const merged = { name: sel.map((g) => g.name).join(' + '), line_ids: sel.flatMap((g) => g.line_ids), pick: false }
  groups.value = [...groups.value.filter((g) => !g.pick), merged]
}
const split = (g: any) => {
  if (g.line_ids.length < 2) return
  groups.value = [...groups.value.filter((x) => x !== g), ...g.line_ids.map((id: string) => ({ name: lineOf(id)?.product?.name || lineOf(id)?.description, line_ids: [id], pick: false }))]
}
const createProject = async () => {
  const r = await run(() => api.post(`/versions/${vid.value}/project`, { name: projectName.value, project_manager: pm.value || undefined, groups: groups.value.map((g) => ({ name: g.name, line_ids: g.line_ids })) }))
  if (r) { toast.ok('Project created. Owners have been told.'); navigateTo(`/crm/projects/${r.project.id}`) }
}
</script>

<template>
  <CrmShell title="Record acceptance" back>
    <div v-if="d" class="page" style="max-width: 1100px">
      <div>
        <NuxtLink :to="`/crm/proposals/${d.proposal.id}`" class="muted">{{ d.proposal.client.company_name }} · {{ d.proposal.reference }} v{{ v.version_number }} · {{ crmMoney(v.net_total) }}</NuxtLink>
        <h1 style="margin-top: 4px">From yes to delivery</h1>
      </div>

      <section class="card pad-lg stack">
        <div class="row"><span class="step mono">1</span><h2 class="grow">Client said yes</h2><span v-if="accepted" class="chip c-ok">Done</span></div>
        <template v-if="!accepted">
          <div class="grid-auto" style="gap: 12px">
            <label class="field"><span>Accepted on</span><input v-model="acc.accepted_on" type="date"></label>
            <label class="field"><span>Accepted by</span><input v-model="acc.accepted_by_contact" :placeholder="d.proposal.client.contact_person || 'Name and title'"></label>
          </div>
          <CrmFilePick v-model="acc.evidence_file" label="Attach the acceptance email or signed page (optional)" doc-type="acceptance" :client="d.proposal.client.id" record-type="proposal_version" :record-id="vid" />
          <div class="soft small">Confirming freezes this version's prices, costs and commission rules, marks the deal Won and starts commission for everyone credited.</div>
          <button class="btn btn-ok btn-lg" style="align-self: flex-start" :disabled="busy" @click="accept">Confirm acceptance</button>
        </template>
        <span v-else class="muted">Accepted {{ crmDate(v.accepted_at) }}{{ v.accepted_by_contact ? ` by ${v.accepted_by_contact}` : '' }}. This version is frozen.</span>
      </section>

      <section v-if="accepted" class="card pad-lg stack">
        <div class="row"><span class="step mono">2</span><h2 class="grow">LPO</h2><span class="chip" :class="d.lpos.length ? (d.lpos[0].verification === 'mismatch' ? 'c-warn' : 'c-ok') : ''">{{ d.lpos.length ? crmLabel(d.lpos[0].verification) : 'Not yet' }}</span></div>
        <div v-if="lpoResult?.discrepancies?.length" class="warn-box stack">
          <strong style="color: var(--amber-ink)">{{ lpoResult.discrepancies.length }} mismatch to resolve</strong>
          <div v-for="x in lpoResult.discrepancies" :key="x.field">• {{ x.message }}</div>
          <div class="row-wrap">
            <button class="btn btn-dark" :disabled="busy" @click="resolveLpo('accept_lpo_terms')">Accept LPO terms</button>
            <button class="btn" :disabled="busy" @click="resolveLpo('amend_requested')">Ask client to amend</button>
            <button class="btn" :disabled="busy" @click="resolveLpo('exception')">Continue with exception</button>
          </div>
        </div>
        <template v-else-if="!d.lpos.length">
          <CrmFilePick v-model="lpoFile" label="Photo or PDF of the LPO" doc-type="lpo" :client="d.proposal.client.id" record-type="proposal_version" :record-id="vid" />
          <div class="grid-auto" style="gap: 12px">
            <label class="field"><span>LPO number</span><input v-model="lpoNumber"></label>
            <label class="field"><span>Value (UGX)</span><input v-model="lpo" class="mono" inputmode="numeric"></label>
            <label class="field"><span>Payment terms (days)</span><input v-model="lpoTerms" class="mono" inputmode="numeric"></label>
          </div>
          <div class="row-wrap">
            <button class="btn btn-primary" :disabled="busy || !lpoNumber" @click="saveLpo">Check and save LPO</button>
            <span class="muted small">No LPO yet? You can still set up the project; billing waits for the LPO.</span>
          </div>
        </template>
        <span v-else class="muted">LPO {{ d.lpos[0].number }} · {{ crmMoney(d.lpos[0].value) }}</span>
      </section>

      <section v-if="accepted" class="card pad-lg stack">
        <div class="row"><span class="step mono">3</span><h2 class="grow">Project, ready to go</h2><NuxtLink v-if="d.project" :to="`/crm/projects/${d.project.id}`" class="chip c-del">Open project</NuxtLink></div>
        <template v-if="!d.project">
          <div class="grid-auto" style="gap: 12px">
            <label class="field"><span>Project name</span><input v-model="projectName"></label>
            <label class="field"><span>Project manager</span><select v-model="pm"><option value="">Choose…</option><option v-for="x in pms" :key="x.id" :value="x.id">{{ x.display_name }}</option></select></label>
          </div>
          <div class="table-wrap">
            <table class="table" style="min-width: 560px">
              <thead><tr><th style="width: 36px"><span class="sr">Select</span></th><th>Workstream</th><th>Lines</th><th class="r">Revenue</th><th /></tr></thead>
              <tbody>
                <tr v-for="(g, i) in groups" :key="i">
                  <td><input v-model="g.pick" type="checkbox" :aria-label="`Select ${g.name}`" style="width: 20px; height: 20px"></td>
                  <td><input v-model="g.name" class="input" style="min-height: 40px"></td>
                  <td class="muted small">{{ g.line_ids.map((id: string) => lineOf(id)?.description).join(', ') }}</td>
                  <td class="mono r">{{ crmFull(groupNet(g)) }}</td>
                  <td><button v-if="g.line_ids.length > 1" class="btn btn-ghost" @click="split(g)">Split</button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="row-wrap">
            <button class="btn" :disabled="groups.filter((g) => g.pick).length < 2" @click="merge">Merge selected</button>
            <span class="muted small">One workstream per product by default. Dates, budgets, owners and billing are copied from the accepted lines.</span>
          </div>
          <button class="btn btn-primary btn-lg" style="align-self: flex-start" :disabled="busy || !groups.length" @click="createProject">Create project</button>
        </template>
      </section>
    </div>
  </CrmShell>
</template>

<style scoped>
.step { width: 28px; height: 28px; border-radius: 50%; background: var(--ink); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; flex: none; }
</style>
