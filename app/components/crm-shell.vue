<script setup lang="ts">
/**
 * App frame. Desktop: top bar with role-based sections. Phone: bottom bar with
 * the 4 most-used sections and a + button for log / quote / deal / LPO.
 */
const props = defineProps<{ title?: string; back?: string | boolean; focus?: boolean }>()
const { me, load } = useCrmMe()
const route = useRoute()
const router = useRouter()
const sheet = ref(false)
const menu = ref(false)

type Item = { to: string; label: string; icon: string; badge?: number }
const NAV: Record<string, string[]> = {
  salesperson: ['today', 'clients', 'deals', 'earnings'],
  supervisor: ['today', 'team', 'deals', 'approvals', 'clients', 'earnings'],
  senior_manager: ['today', 'company', 'team', 'deals', 'approvals', 'projects', 'earnings'],
  executive: ['today', 'company', 'team', 'deals', 'approvals', 'projects', 'finance', 'earnings'],
  product_manager: ['today', 'deals', 'approvals', 'clients', 'admin'],
  project_manager: ['today', 'projects', 'clients'],
  finance: ['today', 'finance', 'approvals', 'earnings', 'company'],
  procurement: ['today', 'approvals', 'projects'],
  admin: ['today', 'admin', 'company', 'team', 'clients'],
}
const DEF: Record<string, Omit<Item, 'badge'>> = {
  today: { to: '/crm', label: 'Today', icon: 'today' },
  clients: { to: '/crm/clients', label: 'Clients', icon: 'clients' },
  deals: { to: '/crm/deals', label: 'Deals', icon: 'deals' },
  earnings: { to: '/crm/earnings', label: 'Earnings', icon: 'earnings' },
  team: { to: '/crm/team', label: 'Team', icon: 'team' },
  company: { to: '/crm/company', label: 'Company', icon: 'company' },
  approvals: { to: '/crm/approvals', label: 'Approvals', icon: 'approvals' },
  projects: { to: '/crm/projects', label: 'Projects', icon: 'projects' },
  finance: { to: '/crm/finance', label: 'Finance', icon: 'finance' },
  admin: { to: '/crm/admin', label: 'Admin', icon: 'admin' },
}
const role = computed(() => me.value?.profile?.role || 'salesperson')
const items = computed<Item[]>(() => (NAV[role.value] || NAV.salesperson!).map((k) => ({
  ...DEF[k]!, badge: k === 'approvals' ? me.value?.counts?.approvals || 0 : 0,
})))
const mobileItems = computed(() => items.value.slice(0, 4))
const canCreate = computed(() => Boolean(me.value?.profile?.sales_person))
const active = (to: string) => (to === '/crm' ? route.path === '/crm' : route.path.startsWith(to))
const name = computed(() => me.value?.profile?.display_name || me.value?.user?.username || '')

let timer: any = null
onMounted(() => { timer = setInterval(() => load(true).catch(() => {}), 60000) })
onBeforeUnmount(() => clearInterval(timer))

const goBack = () => {
  if (typeof props.back === 'string') router.push(props.back)
  else if (window.history.length > 1) router.back()
  else router.push('/crm')
}
const logout = async () => {
  await $fetch('/api/crm-logout', { method: 'POST' }).catch(() => {})
  me.value = null
  await navigateTo('/crm/login')
}
</script>

<template>
  <div class="shell">
    <header class="top">
      <NuxtLink to="/crm" class="logo" aria-label="Vision Group CRM home">VG</NuxtLink>
      <nav class="desk-nav hide-mobile" aria-label="Sections">
        <NuxtLink v-for="i in items" :key="i.to" :to="i.to" class="dn" :class="{ on: active(i.to) }" :aria-current="active(i.to) ? 'page' : undefined">
          {{ i.label }}<span v-if="i.badge" class="badge mono">{{ i.badge }}</span>
        </NuxtLink>
      </nav>
      <div class="hide-desk top-title">
        <button v-if="props.back" class="btn btn-ghost btn-icon" aria-label="Back" @click="goBack"><CrmIcon name="back" /></button>
        <strong class="ellipsis">{{ props.title || '' }}</strong>
      </div>
      <div class="grow" />
      <NuxtLink to="/crm/clients" class="btn btn-ghost btn-icon hide-desk" aria-label="Find a client"><CrmIcon name="search" /></NuxtLink>
      <button v-if="canCreate" class="btn btn-primary hide-mobile" @click="sheet = true"><CrmIcon name="plus" :size="18" />Log · Quote · Deal</button>
      <NuxtLink to="/crm/notifications" class="btn btn-ghost btn-icon bell" :aria-label="`Notifications, ${me?.counts?.notifications || 0} unread`">
        <CrmIcon name="bell" /><span v-if="me?.counts?.notifications" class="pip" />
      </NuxtLink>
      <div class="me-wrap">
        <button class="av" :style="{ background: crmColor(name) }" :aria-label="`Account: ${name}`" @click="menu = !menu">{{ crmInitials(name) }}</button>
        <div v-if="menu" class="me-menu card" @click="menu = false">
          <div class="pad" style="padding: 14px 16px">
            <strong>{{ name }}</strong>
            <div class="muted">{{ CRM_ROLE_LABEL[role] }}<template v-if="me?.profile?.team"> · {{ me.profile.team.name }}</template></div>
          </div>
          <button class="btn btn-ghost btn-block" style="justify-content: flex-start; border-radius: 0" @click="logout"><CrmIcon name="logout" />Sign out</button>
        </div>
      </div>
    </header>

    <div v-if="props.back" class="hide-mobile back-row">
      <button class="btn btn-ghost" @click="goBack"><CrmIcon name="back" :size="18" />Back</button>
    </div>

    <main><slot /></main>

    <nav v-if="!props.focus" class="mob-nav hide-desk" aria-label="Sections">
      <NuxtLink v-for="(i, n) in mobileItems.slice(0, 2)" :key="i.to" :to="i.to" class="mn" :class="{ on: active(i.to) }">
        <CrmIcon :name="i.icon" /><span>{{ i.label }}</span><span v-if="i.badge" class="badge mono abs">{{ i.badge }}</span>
      </NuxtLink>
      <button v-if="canCreate" class="plus" aria-label="Log, quote, new deal or LPO" @click="sheet = true"><CrmIcon name="plus" :size="26" /></button>
      <NuxtLink v-for="i in mobileItems.slice(2, 4)" :key="i.to" :to="i.to" class="mn" :class="{ on: active(i.to) }">
        <CrmIcon :name="i.icon" /><span>{{ i.label }}</span><span v-if="i.badge" class="badge mono abs">{{ i.badge }}</span>
      </NuxtLink>
    </nav>

    <CrmActionSheet v-model="sheet" />
    <CrmToasts />
  </div>
</template>

<style scoped>
.shell { min-height: 100vh; display: flex; flex-direction: column; }
.top { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: var(--panel); border-bottom: 1px solid var(--line); }
.logo { width: 36px; height: 36px; border-radius: 9px; background: var(--ink); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; text-decoration: none; flex: none; }
.desk-nav { display: flex; gap: 2px; margin-left: 10px; flex-wrap: wrap; }
.dn { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 14px; border-radius: 999px; color: var(--ink-2); font-weight: 600; text-decoration: none; }
.dn:hover { background: var(--line-2); color: var(--ink); }
.dn.on { background: var(--ink); color: #fff; }
.badge { background: var(--orange); color: #fff; font-size: 11px; padding: 0 7px; border-radius: 999px; line-height: 18px; }
.badge.abs { position: absolute; top: 2px; right: 12px; }
.top-title { display: flex; align-items: center; gap: 4px; min-width: 0; font-size: 17px; }
.bell { position: relative; }
.pip { position: absolute; top: 10px; right: 11px; width: 8px; height: 8px; border-radius: 50%; background: var(--orange); }
.me-wrap { position: relative; }
.me-wrap .av { border: 0; cursor: pointer; }
.me-menu { position: absolute; right: 0; top: 46px; width: 260px; box-shadow: var(--shadow); overflow: hidden; z-index: 40; }
.back-row { max-width: 1240px; width: 100%; margin: 0 auto; padding: 14px 20px 0; }
main { flex: 1; }
.mob-nav { position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; display: flex; justify-content: space-around; align-items: center; background: var(--panel); border-top: 1px solid var(--line); padding: 6px 6px calc(8px + var(--safe-bottom)); }
.mn { position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 64px; min-height: 48px; justify-content: center; font-size: 12px; font-weight: 600; color: var(--muted); text-decoration: none; }
.mn.on { color: var(--blue); }
.plus { width: 56px; height: 56px; border-radius: 50%; border: 0; background: var(--ink); color: #fff; display: flex; align-items: center; justify-content: center; margin-top: -26px; box-shadow: 0 6px 16px rgba(22, 24, 29, .3); cursor: pointer; }
</style>
