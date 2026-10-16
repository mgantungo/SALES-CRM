<script setup lang="ts">
/** Snap the LPO: pick the won deal, take a photo, confirm number and value. Mismatches are flagged. */
definePageMeta({ path: '/crm/lpo' })
const route = useRoute()
const api = useCrmApi()
const { busy, run } = useCrmAction()
const versionId = ref<string | null>((route.query.version as string) || null)
const waiting = ref<any[]>([])
const file = ref<number | null>(null)
const number = ref('')
const value = ref<any>('')
const terms = ref<any>('')
const result = ref<any>(null)
const version = ref<any>(null)
onMounted(async () => {
  const t = await api.get('/today')
  waiting.value = t.todos.filter((x: any) => x.kind === 'lpo')
  if (!versionId.value && waiting.value.length === 1) versionId.value = waiting.value[0].version
})
watch(versionId, async (id) => {
  if (!id) return
  const d = await api.get(`/versions/${id}`).catch(() => null)
  if (!d) return
  version.value = d.version
  value.value = d.version.net_total
  terms.value = d.version.payment_terms_days
}, { immediate: true })
const save = async () => {
  const r = await run(() => api.post('/lpos', { version: versionId.value, number: number.value, value: Number(value.value), payment_terms_days: terms.value === '' ? undefined : Number(terms.value), file: file.value }))
  if (r) result.value = r
}
const resolve = async (resolution: string) => {
  const r = await run(() => api.post(`/lpos/${result.value.lpo.id}/resolve`, { resolution }), resolution === 'accept_lpo_terms' ? 'LPO terms accepted' : 'Noted')
  if (r) result.value = { ...result.value, discrepancies: [], resolved: true }
}
</script>

<template>
  <CrmShell title="Add an LPO" back focus>
    <div class="page page-narrow">
      <template v-if="result">
        <CrmDone v-if="!result.discrepancies.length" message="LPO added" :message2="result.resolved ? 'Recorded with your decision. Finance has been told.' : 'It matches what the client accepted. Finance has been told billing can start.'">
          <NuxtLink :to="`/crm/accept/${versionId}`" class="btn btn-primary btn-lg">Set up the project</NuxtLink>
          <NuxtLink to="/crm" class="btn btn-lg">Back to today</NuxtLink>
        </CrmDone>
        <div v-else class="warn-box stack">
          <strong style="color: var(--amber-ink)">The LPO doesn't match the accepted quote</strong>
          <div v-for="x in result.discrepancies" :key="x.field">• {{ x.message }}</div>
          <div class="row-wrap">
            <button class="btn btn-dark" :disabled="busy" @click="resolve('accept_lpo_terms')">Accept the LPO's terms</button>
            <button class="btn" :disabled="busy" @click="resolve('amend_requested')">Ask client to amend</button>
            <button class="btn" :disabled="busy" @click="resolve('exception')">Continue with exception</button>
          </div>
        </div>
      </template>
      <template v-else>
        <h1 class="hide-mobile">Add an LPO</h1>
        <div v-if="!versionId" class="stack">
          <div class="label">Which won deal?</div>
          <button v-for="w in waiting" :key="w.version" class="card click row" style="padding: 14px; text-align: left; border: 1px solid var(--line)" @click="versionId = w.version">
            <span class="grow"><strong>{{ w.client?.name }}</strong><span class="muted" style="display: block">{{ w.sub }}</span></span><CrmIcon name="next" />
          </button>
          <CrmEmpty v-if="!waiting.length" text="No won deals are waiting for an LPO." />
        </div>
        <template v-else>
          <div v-if="version" class="soft">Accepted: <strong class="mono">{{ crmMoney(version.net_total) }}</strong> · {{ version.payment_terms_days }}-day terms</div>
          <CrmFilePick v-model="file" label="Take a photo of the LPO or choose the PDF" doc-type="lpo" record-type="proposal_version" :record-id="versionId" />
          <div class="grid-auto" style="gap: 12px">
            <label class="field"><span>LPO number</span><input v-model="number" placeholder="As printed on the LPO"></label>
            <label class="field"><span>Value (UGX)</span><input v-model="value" class="mono" inputmode="numeric"></label>
            <label class="field"><span>Payment terms (days)</span><input v-model="terms" class="mono" inputmode="numeric"></label>
          </div>
          <div class="sticky-foot"><button class="btn btn-primary btn-lg" :disabled="busy || !number" @click="save">Save LPO</button></div>
        </template>
      </template>
    </div>
  </CrmShell>
</template>
