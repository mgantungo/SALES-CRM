/**
 * /api/crm/** → Strapi /api/crm/** on behalf of the signed-in person.
 * The identity comes from the encrypted crm_session cookie, never from the request body,
 * and is vouched for with the server-only gateway secret. Strapi enforces every permission.
 */
export default defineEventHandler(async (event) => {
  const session = await getCrmSession(event)
  if (!session.data.email || !session.data.profileDocumentId) {
    throw createError({ statusCode: 401, statusMessage: 'Please sign in.' })
  }
  const url = getRequestURL(event)
  const target = `${strapiBase(event)}${url.pathname}${url.search}`
  return proxyRequest(event, target, {
    headers: { ...crmIdentityHeaders(event, session.data), authorization: '', cookie: '' },
    onResponse: async (_event, response) => {
      if (response.status === 401) await session.clear()
    },
  })
})