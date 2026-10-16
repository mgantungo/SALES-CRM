<script setup lang="ts">
/**
 * App frame.
 * Desktop: left sidebar with the role's sections (collapsible to icons), and a slim top bar
 *   with the page breadcrumb, client search (press / to focus) and notifications.
 * Phone: top bar with the page title, bottom bar with the 4 most-used sections and a + button
 *   for log / quote / deal / LPO.
 */
const props = defineProps<{ title?: string; back?: string | boolean; focus?: boolean }>()
const { me, load } = useCrmMe()
const route = useRoute()
const router = useRouter()
const sheet = ref(false)
const menu = ref(false)
const collapsed = ref(false)
const search = ref('')
const searchEl = ref<HTMLInputElement | null>(null)

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
const section = computed(() => items.value.find((i) => active(i.to)) || null)
const name = computed(() => me.value?.profile?.display_name || me.value?.user?.username || '')
// `back` given as a bare attribute arrives as '' (String comes first in the prop type), so test for presence
const hasBack = computed(() => props.back !== undefined && props.back !== false)
const unread = computed(() => me.value?.counts?.notifications || 0)

// keyboard: "/" focuses client search, "n" opens the create menu (when not typing)
const typing = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null
  return !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))
}
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') { menu.value = false; return }
  if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return
  if (e.key === '/' && searchEl.value) { e.preventDefault(); searchEl.value.focus() }
  else if (e.key === 'n' && canCreate.value) { e.preventDefault(); sheet.value = true }
}
const onDocClick = (e: MouseEvent) => {
  if (menu.value && !(e.target as HTMLElement).closest('.me-wrap')) menu.value = false
}
const goSearch = () => {
  const q = search.value.trim()
  navigateTo({ path: '/crm/clients', query: q ? { q } : {} })
  search.value = ''
  searchEl.value?.blur()
}

let timer: any = null
onMounted(() => {
  timer = setInterval(() => load(true).catch(() => {}), 60000)
  try { collapsed.value = localStorage.getItem('crm-nav-collapsed') === '1' } catch {}
  window.addEventListener('keydown', onKey)
  document.addEventListener('click', onDocClick)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('click', onDocClick)
})
const toggleNav = () => {
  collapsed.value = !collapsed.value
  try { localStorage.setItem('crm-nav-collapsed', collapsed.value ? '1' : '0') } catch {}
}

const goBack = () => {
  if (typeof props.back === 'string' && props.back) router.push(props.back)
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
  <div class="shell" :class="{ collapsed }">
    <!-- desktop sidebar -->
    <aside class="side hide-mobile" aria-label="Main">
      <div class="brand">
        <NuxtLink to="/crm" class="logo" aria-label="Vision Group CRM home">VG</NuxtLink>
        <div v-if="!collapsed" class="brand-t"><strong>Vision Group</strong><span>CRM</span></div>
      </div>
      <button v-if="canCreate" class="btn btn-primary new" :title="collapsed ? 'Log · Quote · Deal (N)' : undefined" @click="sheet = true">
        <CrmIcon name="plus" :size="18" /><template v-if="!collapsed"><span class="grow" style="text-align: left">Log · Quote · Deal</span><span class="kbd kbd-d">N</span></template>
      </button>
      <nav class="side-nav" aria-label="Sections">
        <NuxtLink v-for="i in items" :key="i.to" :to="i.to" class="sn" :class="{ on: active(i.to) }" :aria-current="active(i.to) ? 'page' : undefined" :title="collapsed ? i.label : undefined">
          <CrmIcon :name="i.icon" :size="18" />
          <span v-if="!collapsed" class="grow">{{ i.label }}</span>
          <span v-if="i.badge" class="badge mono" :class="{ 'badge-dot': collapsed }">{{ i.badge }}</span>
        </NuxtLink>
      </nav>
      <div class="grow" />
      <div class="me-card">
        <span class="av av-sm" :style="{ background: crmColor(name) }">{{ crmInitials(name) }}</span>
        <div v-if="!collapsed" class="grow">
          <div class="ellipsis" style="font-weight: 600">{{ name }}</div>
          <div class="muted small ellipsis" :title="me?.profile?.team?.name">{{ CRM_ROLE_LABEL[role] }}</div>
        </div>
        <button v-if="!collapsed" class="btn btn-ghost btn-icon" aria-label="Sign out" title="Sign out" @click="logout"><CrmIcon name="logout" :size="18" /></button>
      </div>
      <button class="collapse" :aria-label="collapsed ? 'Expand menu' : 'Collapse menu'" :title="collapsed ? 'Expand menu' : 'Collapse menu'" @click="toggleNav">
        <CrmIcon :name="collapsed ? 'next' : 'back'" :size="16" /><span v-if="!collapsed">Collapse</span>
      </button>
    </aside>

    <div class="main-col">
      <!-- desktop top bar -->
      <header class="top-d hide-mobile">
        <button v-if="hasBack" class="btn btn-ghost btn-icon" aria-label="Back" title="Back" @click="goBack"><CrmIcon name="back" :size="18" /></button>
        <nav class="crumbs" aria-label="Breadcrumb">
          <NuxtLink v-if="section" :to="section.to" class="crumb">{{ section.label }}</NuxtLink>
          <template v-if="props.title && props.title !== section?.label">
            <CrmIcon v-if="section" name="next" :size="14" />
            <span class="crumb-cur ellipsis">{{ props.title }}</span>
          </template>
        </nav>
        <div class="grow" />
        <form class="gsearch" role="search" @submit.prevent="goSearch">
          <label class="sr" for="g-search">Search clients</label>
          <input id="g-search" ref="searchEl" v-model="search" class="search" placeholder="Search clients…" autocomplete="off">
          <span class="kbd">/</span>
        </form>
        <NuxtLink to="/crm/notifications" class="btn btn-ghost btn-icon bell" :aria-label="`Notifications, ${unread} unread`" title="Notifications">
          <CrmIcon name="bell" :size="18" /><span v-if="unread" class="pip" />
        </NuxtLink>
      </header>

      <!-- phone top bar -->
      <header class="top hide-desk">
        <NuxtLink v-if="!hasBack" to="/crm" class="logo" aria-label="Vision Group CRM home">VG</NuxtLink>
        <div class="top-title">
          <button v-if="hasBack" class="btn btn-ghost btn-icon" aria-label="Back" @click="goBack"><CrmIcon name="back" /></button>
          <strong class="ellipsis">{{ props.title || '' }}</strong>
        </div>
        <div class="grow" />
        <NuxtLink to="/crm/clients" class="btn btn-ghost btn-icon" aria-label="Find a client"><CrmIcon name="search" /></NuxtLink>
        <NuxtLink to="/crm/notifications" class="btn btn-ghost btn-icon bell" :aria-label="`Notifications, ${unread} unread`">
          <CrmIcon name="bell" /><span v-if="unread" class="pip" />
        </NuxtLink>
        <div class="me-wrap">
          <button class="av" :style="{ background: crmColor(name) }" :aria-label="`Account: ${name}`" :aria-expanded="menu" @click="menu = !menu">{{ crmInitials(name) }}</button>
          <div v-if="menu" class="me-menu card">
            <div style="padding: 14px 16px">
              <strong>{{ name }}</strong>
              <div class="muted">{{ CRM_ROLE_LABEL[role] }}<template v-if="me?.profile?.team"> · {{ me.profile.team.name }}</template></div>
            </div>
            <button class="btn btn-ghost btn-block" style="justify-content: flex-start; border-radius: 0" @click="logout"><CrmIcon name="logout" />Sign out</button>
          </div>
        </div>
      </header>

      <main><slot /></main>
    </div>

    <nav v-if="!props.focus" class="mob-nav hide-desk" aria-label="Sections">
      <NuxtLink v-for="i in mobileItems.slice(0, 2)" :key="i.to" :to="i.to" class="mn" :class="{ on: active(i.to) }">
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
.main-col { flex: 1; display: flex; flex-direction: column; min-width: 0; }
main { flex: 1; }
.logo { width: 34px; height: 34px; border-radius: 9px; background: var(--ink); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; text-decoration: none; flex: none; }
.badge { background: var(--orange); color: #fff; font-size: 11px; padding: 0 7px; border-radius: 999px; line-height: 18px; }
.badge.abs { position: absolute; top: 2px; right: 12px; }
.bell { position: relative; }
.pip { position: absolute; top: 8px; right: 9px; width: 8px; height: 8px; border-radius: 50%; background: var(--orange); box-shadow: 0 0 0 2px var(--panel); }

/* desktop */
@media (min-width: 900px) {
  .shell { display: grid; grid-template-columns: 232px minmax(0, 1fr); }
  .shell.collapsed { grid-template-columns: 64px minmax(0, 1fr); }
}
.side { position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; gap: 6px; padding: 14px 12px 10px; background: var(--panel); border-right: 1px solid var(--line); overflow-y: auto; }
.brand { display: flex; align-items: center; gap: 10px; padding: 0 2px 10px; }
.brand-t { display: flex; flex-direction: column; line-height: 1.15; }
.brand-t span { font-size: 12px; color: var(--muted); font-weight: 600; letter-spacing: .04em; }
.new { width: 100%; margin-bottom: 8px; padding: 0 12px; }
.collapsed .new { padding: 0; }
.kbd-d { background: rgba(255, 255, 255, .16); border-color: rgba(255, 255, 255, .3); color: #fff; }
.side-nav { display: flex; flex-direction: column; gap: 2px; }
.sn { position: relative; display: flex; align-items: center; gap: 10px; min-height: 36px; padding: 0 10px; border-radius: 8px; color: var(--ink-2); font-weight: 600; text-decoration: none; }
.sn:hover { background: var(--line-2); color: var(--ink); }
.sn.on { background: var(--ink); color: #fff; }
.collapsed .sn { justify-content: center; padding: 0; }
.badge-dot { position: absolute; top: 3px; right: 6px; padding: 0 5px; line-height: 15px; font-size: 10px; }
.me-card { display: flex; align-items: center; gap: 10px; padding: 10px 4px 8px 6px; border-top: 1px solid var(--line-2); }
.collapsed .me-card { justify-content: center; padding-left: 0; padding-right: 0; }
.collapse { display: flex; align-items: center; gap: 8px; min-height: 30px; padding: 0 10px; border: 0; background: none; color: var(--muted); font-size: 12px; font-weight: 600; border-radius: 8px; cursor: pointer; }
.collapse:hover { background: var(--line-2); color: var(--ink); }
.collapsed .collapse { justify-content: center; padding: 0; }

.top-d { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; gap: 8px; height: 56px; padding: 0 20px 0 22px; background: rgba(244, 244, 241, .86); backdrop-filter: saturate(1.4) blur(10px); border-bottom: 1px solid var(--line); }
.crumbs { display: flex; align-items: center; gap: 6px; min-width: 0; color: var(--muted); font-size: 13px; }
.crumb { color: var(--muted); text-decoration: none; font-weight: 600; }
.crumb:hover { color: var(--ink); }
.crumb-cur { color: var(--ink); font-weight: 600; max-width: 520px; }
.gsearch { position: relative; width: 300px; }
.gsearch .search { padding-right: 34px; }
.gsearch .kbd { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; }
.gsearch:focus-within .kbd { display: none; }

/* phone */
.top { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: var(--panel); border-bottom: 1px solid var(--line); }
.top-title { display: flex; align-items: center; gap: 4px; min-width: 0; font-size: 17px; }
.me-wrap { position: relative; }
.me-wrap .av { border: 0; cursor: pointer; }
.me-menu { position: absolute; right: 0; top: 46px; width: 260px; box-shadow: var(--shadow); overflow: hidden; z-index: 40; }
.mob-nav { position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; display: flex; justify-content: space-around; align-items: center; background: var(--panel); border-top: 1px solid var(--line); padding: 6px 6px calc(8px + var(--safe-bottom)); }
.mn { position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 64px; min-height: 48px; justify-content: center; font-size: 12px; font-weight: 600; color: var(--muted); text-decoration: none; }
.mn.on { color: var(--blue); }
.plus { width: 56px; height: 56px; border-radius: 50%; border: 0; background: var(--ink); color: #fff; display: flex; align-items: center; justify-content: center; margin-top: -26px; box-shadow: 0 6px 16px rgba(22, 24, 29, .3); cursor: pointer; }
</style>
