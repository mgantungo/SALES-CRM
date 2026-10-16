/** Calls the CRM API through the Nuxt server (which adds the user's Strapi token). */
export class CrmApiError extends Error {
  status: number
  details: any
  constructor(message: string, status: number, details?: any) {
    super(message)
    this.status = status
    this.details = details
  }
}

function errorFrom(e: any): CrmApiError {
  const status = e?.response?.status || e?.statusCode || 0
  const data = e?.data
  const message = data?.error?.message || data?.statusMessage || data?.message || (status === 0 ? 'No connection. Check your internet and try again.' : 'Something went wrong. Try again.')
  return new CrmApiError(message, status, data?.error?.details)
}

export function useCrmApi() {
  const call = async <T = any>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: any, query?: Record<string, any>): Promise<T> => {
    try {
      return await $fetch<T>(`/api/crm${path}`, { method, body, query })
    } catch (e: any) {
      const err = errorFrom(e)
      if (err.status === 401 && import.meta.client) {
        useState('crm-me').value = null
        const route = useRoute()
        if (!route.path.startsWith('/crm/login')) await navigateTo({ path: '/crm/login', query: { next: route.fullPath } })
      }
      throw err
    }
  }
  return {
    get: <T = any>(path: string, query?: Record<string, any>) => call<T>('GET', path, undefined, query),
    post: <T = any>(path: string, body?: any) => call<T>('POST', path, body || {}),
    put: <T = any>(path: string, body?: any) => call<T>('PUT', path, body || {}),
    del: <T = any>(path: string, query?: Record<string, any>) => call<T>('DELETE', path, undefined, query),
    async upload(file: File, meta: Record<string, string | undefined> = {}) {
      const form = new FormData()
      form.append('file', file)
      Object.entries(meta).forEach(([k, v]) => { if (v) form.append(k, v) })
      try {
        return await $fetch<any>('/api/crm/documents', { method: 'POST', body: form })
      } catch (e: any) {
        throw errorFrom(e)
      }
    },
  }
}

/** The signed-in user's CRM profile, role, permissions and counters. */
export function useCrmMe() {
  const me = useState<any>('crm-me', () => null)
  const load = async (force = false) => {
    if (me.value && !force) return me.value
    me.value = await useCrmApi().get('/me')
    return me.value
  }
  const role = computed(() => me.value?.profile?.role || null)
  const can = computed(() => me.value?.can || {})
  const isSales = computed(() => role.value === 'salesperson')
  const isManager = computed(() => Boolean(me.value?.can?.manager))
  return { me, load, role, can, isSales, isManager }
}

/** Runs an action with a busy flag and shows errors as toasts. */
export function useCrmAction() {
  const busy = ref(false)
  const toast = useCrmToast()
  const run = async <T>(fn: () => Promise<T>, success?: string): Promise<T | null> => {
    if (busy.value) return null
    busy.value = true
    try {
      const out = await fn()
      if (success) toast.ok(success)
      return out
    } catch (e: any) {
      toast.error(e?.message || 'Something went wrong.')
      return null
    } finally {
      busy.value = false
    }
  }
  return { busy, run }
}
