/** Every /crm page needs a signed-in user with a CRM profile. */
export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/crm') || to.path === '/crm/login') return
  const me = useState<any>('crm-me', () => null)
  if (!me.value) {
    try {
      me.value = await $fetch('/api/crm/me')
    } catch (e: any) {
      return navigateTo({ path: '/crm/login', query: to.fullPath !== '/crm' ? { next: to.fullPath } : {} })
    }
  }
  if (me.value?.needs_setup && to.path !== '/crm/setup') return navigateTo('/crm/setup')
  const roles = to.meta.crmRoles as string[] | undefined
  if (roles && !roles.includes(me.value?.profile?.role)) return navigateTo('/crm')
})
