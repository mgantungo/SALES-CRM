<script setup lang="ts">
definePageMeta({ path: '/crm/deals' })
const api = useCrmApi()
const { isSales } = useCrmMe()
const scope = ref(isSales.value ? 'mine' : 'visible')
const view = ref(isSales.value ? 'list' : 'board')
const q = ref('')
const data = ref<any>(null)
let t: any
const load = async () => { data.value = await api.get('/opportunities', { scope: scope.value, q: q.value || undefined }) }
watch([scope], load)
watch(q, () => { clearTimeout(t); t = setTimeout(load, 250) })
onMounted(load)
const lane = (k: string) => (data.value?.items || []).filter((o: any) => o.lane === k)
</script>

<template>
  <CrmShell title="Deals">
    <div class="page page-wide">
      <div class="page-head">
        <div>
          <h1>{{ scope === 'mine' ? 'My deals' : 'Pipeline' }}</h1>
          <div v-if="data" class="muted"><span class="mono">{{ data.totals.count }}</span> open · <span class="mono">{{ crmMoney(data.totals.value) }}</span> · weighted <span class="mono">{{ crmMoney(data.totals.weighted) }}</span></div>
        </div>
        <NuxtLink to="/crm/deals/new" class="btn btn-primary"><CrmIcon name="plus" :size="18" />New deal</NuxtLink>
      </div>
      <div class="row-wrap">
        <label class="sr" for="pq">Search deals</label>
        <input id="pq" v-model="q" class="search" style="flex: 1 1 260px; max-width: 420px" placeholder="Search deals or clients">
        <span class="grow" />
        <template v-if="!isSales">
          <div role="group" aria-label="Whose deals" class="seg-group">
            <button class="pick" :aria-pressed="scope === 'mine'" @click="scope = 'mine'">Mine</button>
            <button class="pick" :aria-pressed="scope === 'visible'" @click="scope = 'visible'">Team</button>
          </div>
          <div role="group" aria-label="View" class="seg-group">
            <button class="pick" :aria-pressed="view === 'board'" @click="view = 'board'">Board</button>
            <button class="pick" :aria-pressed="view === 'list'" @click="view = 'list'">List</button>
          </div>
        </template>
      </div>

      <div v-if="!data" class="loading">Loading…</div>
      <div v-else-if="view === 'board'" class="board-wrap">
        <div class="board">
          <section v-for="l in data.lanes" :key="l.key" class="lane" :aria-label="l.name">
            <div class="between" style="padding: 4px 4px 2px"><div><strong>{{ l.name }}</strong> <span class="muted small">Stages {{ l.from }}–{{ l.to }}</span></div><span class="mono small">{{ l.count }} · {{ crmMoney(l.value, false) }}</span></div>
            <NuxtLink v-for="o in lane(l.key)" :key="o.id" :to="`/crm/deals/${o.id}`" class="dcard card click">
              <div class="between"><span class="muted small ellipsis">{{ o.client?.company_name }}</span><span class="num">{{ crmMoney(o.expected_revenue, false) }}</span></div>
              <strong>{{ o.title }}</strong>
              <div class="row-wrap"><span class="chip c-sales">{{ o.stage?.position }} · {{ o.stage?.name }}</span><span v-if="o.overlap_flag && o.overlap_resolution === 'none'" class="chip c-warn">Overlap</span></div>
              <span class="small" style="color: var(--ink-2)">{{ o.status_line }}</span>
            </NuxtLink>
          </section>
        </div>
      </div>
      <div v-else class="deal-list">
        <NuxtLink v-for="o in data.items" :key="o.id" :to="`/crm/deals/${o.id}`" class="card click stack" style="padding: 12px 16px; gap: 8px">
          <div class="between"><strong>{{ o.client?.company_name }}</strong><span class="num">{{ crmMoney(o.expected_revenue, false) }}</span></div>
          <CrmSteps :step="o.step" />
          <span class="muted">{{ o.step.label }} · {{ o.status_line }}</span>
        </NuxtLink>
        <CrmEmpty v-if="!data.items.length" text="No open deals yet.">
          <NuxtLink to="/crm/deals/new" class="btn btn-primary">Add your first deal</NuxtLink>
        </CrmEmpty>
      </div>
    </div>
  </CrmShell>
</template>

<style scoped>
.board-wrap { overflow-x: auto; padding-bottom: 6px; }
.board { display: grid; grid-template-columns: repeat(5, minmax(230px, 1fr)); gap: 10px; align-items: start; min-width: 1190px; }
.lane { background: var(--lane); border-radius: var(--radius); padding: 8px; display: flex; flex-direction: column; gap: 8px; }
.dcard { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; }
.deal-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: var(--gap); align-items: start; }
</style>
