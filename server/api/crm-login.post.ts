/**
 * Signs in through the shared VGAMS login (the one SFA and the other company systems use):
 *   POST {NUXT_STRAPI_URL}/api/vgams-users/login  { email, password, module: 'crm' }
 * The CMS checks the AD password, then CRM eligibility:
 *   @newvision.co.ug AND (active vgams-user with role administrator / finance_team / mdsoffice
 *                         OR active vgams-sales-person)
 * The call is made server-to-server, so the CMS needs no CORS change.
 * On success the identity is kept in the encrypted 'crm_session' cookie.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string; password?: string }>(event)
  const email = String(body?.email || '').toLowerCase().trim()
  const password = String(body?.password || '')
  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Enter your email and password.' })
  }
  if (!email.endsWith('@newvision.co.ug')) {
    throw createError({ statusCode: 400, statusMessage: 'Email must end with @newvision.co.ug' })
  }

  const config = useRuntimeConfig(event)
  const base = strapiBase(event)
  let res: any
  try {
    res = await $fetch(`${base}/api/vgams-users/login`, {
      method: 'POST',
      body: { email, password, module: config.vgamsModule || 'crm' },
    })
  } catch (e: any) {
    const status = e?.response?.status || e?.status
    const msg = e?.data?.error?.message || e?.data?.message || ''
    if (status === 400 || status === 401) throw createError({ statusCode: 401, statusMessage: msg || 'Incorrect email or password.' })
    if (status === 403) throw createError({ statusCode: 403, statusMessage: msg || 'Your account does not have CRM access.' })
    if (status === 404) throw createError({ statusCode: 404, statusMessage: msg || 'The CRM is not available on this server.' })
    if (status === 429) throw createError({ statusCode: 429, statusMessage: 'Too many attempts. Wait a minute and try again.' })
    throw createError({ statusCode: 502, statusMessage: 'Authentication service temporarily unavailable. Please try again.' })
  }

  const user = res?.crmUser
  const profile = res?.crmProfile
  if (!res?.success || !user?.email || !profile?.documentId) {
    throw createError({ statusCode: 401, statusMessage: res?.message || 'Login failed.' })
  }

  const session = await getCrmSession(event)
  await session.clear() // never carry an older identity over
  await session.update({
    email: String(user.email).toLowerCase(),
    name: user.name || '',
    profileDocumentId: profile.documentId,
    role: profile.crm_role || null,
    salesPersonDocumentId: user.salesPerson?.documentId || null,
    vgamsUserDocumentId: user.vgamsUser?.documentId || null,
    loginAt: Date.now(),
  })

  const me = await $fetch(`${base}/api/crm/me`, { headers: crmIdentityHeaders(event, session.data) }).catch(() => null)
  return { ok: true, me }
})