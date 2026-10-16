import type { H3Event } from 'h3'

/**
 * What the CRM keeps after a VGAMS login (POST /api/vgams-users/login, module 'crm').
 * Same login the SFA module uses — the CRM keeps it under its own key: 'crm_session'.
 */
export interface CrmSessionData {
  email?: string
  name?: string
  profileDocumentId?: string        // CRM profile returned by the login
  role?: string | null              // CRM role at sign-in (display only; the CMS re-checks every call)
  salesPersonDocumentId?: string | null
  vgamsUserDocumentId?: string | null
  loginAt?: number
}

/**
 * Encrypted, httpOnly cookie named 'crm_session'.
 * Unlike SFA (sessionStorage), the identity is not readable or editable by the browser,
 * so nobody can act as someone else by changing an id.
 */
export function getCrmSession(event: H3Event) {
  const config = useRuntimeConfig(event)
  const password = config.crmSessionSecret
  if (!password || password.length < 32) {
    throw createError({ statusCode: 500, statusMessage: 'NUXT_CRM_SESSION_SECRET must be set to at least 32 characters.' })
  }
  return useSession<CrmSessionData>(event, {
    password,
    name: 'crm_session',
    maxAge: 60 * 60 * 12,
    cookie: { httpOnly: true, sameSite: 'lax', secure: !import.meta.dev, path: '/' },
  })
}

export function strapiBase(event: H3Event) {
  return String(useRuntimeConfig(event).strapiUrl || '').replace(/\/$/, '')
}

/** Headers the Nuxt server adds when it calls the CMS on behalf of the signed-in person. */
export function crmIdentityHeaders(event: H3Event, data: CrmSessionData): Record<string, string> {
  const secret = String(useRuntimeConfig(event).crmGatewaySecret || '')
  if (!secret || secret.length < 32) {
    throw createError({ statusCode: 500, statusMessage: 'NUXT_CRM_GATEWAY_SECRET must be set to at least 32 characters.' })
  }
  return {
    'x-crm-gateway-secret': secret,
    'x-crm-email': data.email || '',
    'x-crm-profile': data.profileDocumentId || '',
  }
}