<script setup lang="ts">
definePageMeta({ path: '/crm/projects' })
const api = useCrmApi()
const items = ref<any[]>([])
const state = ref('active')
const loading = ref(true)
const load = async () => { loading.value = true; items.value = (await api.get('/projects', { state: state.value })).items; loading.value = false }
watch(state, load)
onMounted(load)
</script>

<template>
  <CrmShell title="Projects">
    <div class="page">
      <div class="page-head">
        <h1>Projects</h1>
        <div class="row-wrap">
          <button v-for="s in ['active', 'completed', 'all']" :key="s" class="pick" :aria-pressed="state === s" @click="state = s">{{ crmLabel(s) }}</button>
        </div>
      </div>
      <div v-if="loading" class="loading">Loading…</div>
      <div v-else class="grid-auto" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))">
        <NuxtLink v-for="p in items" :key="p.id" :to="`/crm/projects/${p.id}`" class="card click stack" style="padding: 16px; gap: 8px">
          <span class="muted small">{{ p.client?.company_name }}</span>
          <strong style="font-size: calc(var(--fs) + 1px)">{{ p.name }}</strong>
          <div class="row-wrap">
            <span class="chip" :class="CRM_STATE_CHIP[p.state]">{{ crmLabel(p.state) }}</span>
            <span class="chip" :class="{ on_track: 'c-ok', at_risk: 'c-warn', off_track: 'c-bad' }[p.health as string]">{{ crmLabel(p.health) }}</span>
          </div>
          <div class="bar"><i :style="{ width: (p.total_workstreams ? (p.done_workstreams / p.total_workstreams) * 100 : 0) + '%', background: 'var(--purple-ink)' }" /></div>
          <span class="muted small">{{ p.done_workstreams }} of {{ p.total_workstreams }} workstreams done · PM {{ p.project_manager?.display_name || '—' }}</span>
        </NuxtLink>
      </div>
      <CrmEmpty v-if="!loading && !items.length" text="No projects here yet. Projects are created when a client accepts a quote." />
    </div>
  </CrmShell>
</template>
