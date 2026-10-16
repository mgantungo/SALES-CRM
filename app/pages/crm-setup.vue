<script setup lang="ts">
definePageMeta({ path: '/crm/setup' })
const me = useState<any>('crm-me')
const logout = async () => { await $fetch('/api/crm-logout', { method: 'POST' }).catch(() => {}); me.value = null; navigateTo('/crm/login') }
</script>

<template>
  <div class="page page-narrow" style="padding-top: 80px">
    <div class="card pad-lg stack">
      <h1>Almost there</h1>
      <p style="margin: 0">You're signed in as <strong>{{ me?.user?.email || me?.user?.username }}</strong>, but this login isn't linked to a CRM profile yet.</p>
      <p class="muted" style="margin: 0">Ask a CRM administrator to open <strong>Admin → People</strong> and link your login to your sales person record and role. If your login email matches your sales person email, this happens automatically.</p>
      <button class="btn" style="align-self: flex-start" @click="logout">Sign out</button>
    </div>
  </div>
</template>
