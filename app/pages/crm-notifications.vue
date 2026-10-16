<script setup lang="ts">
definePageMeta({ path: '/crm/notifications' })
const api = useCrmApi()
const { load: reloadMe } = useCrmMe()
const d = ref<any>(null)
const load = async () => { d.value = await api.get('/notifications') }
onMounted(load)
const readAll = async () => { await api.post('/notifications/read', {}); await load(); reloadMe(true) }
const open = async (n: any) => { await api.post('/notifications/read', { ids: [n.id] }).catch(() => {}); reloadMe(true); if (n.link) navigateTo(n.link) }
</script>

<template>
  <CrmShell title="Notifications" back>
    <div class="page page-narrow">
      <div class="page-head"><h1>Notifications</h1><button v-if="d?.unread" class="btn" @click="readAll">Mark all read</button></div>
      <div v-if="d" class="card" style="padding: 4px 16px">
        <button v-for="n in d.items" :key="n.id" class="list-row click" style="width: 100%; background: none; border-left: 0; border-right: 0; border-bottom: 0; text-align: left" @click="open(n)">
          <span class="dot" :style="{ background: n.is_read ? 'transparent' : 'var(--orange)' }" />
          <div class="grow"><strong>{{ n.title }}</strong><div v-if="n.body" class="muted">{{ n.body }}</div><div class="muted small">{{ crmDateTime(n.createdAt) }}</div></div>
        </button>
        <div v-if="!d.items.length" class="muted" style="padding: 16px 0; text-align: center">You're all caught up.</div>
      </div>
    </div>
  </CrmShell>
</template>
