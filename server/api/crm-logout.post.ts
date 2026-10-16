export default defineEventHandler(async (event) => {
  const session = await getCrmSession(event)
  await session.clear()
  return { ok: true }
})
