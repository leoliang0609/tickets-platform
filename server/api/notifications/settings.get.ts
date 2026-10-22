export default defineEventHandler(async (event) => {
  const db = await readDb()
  const user = requireUser(db, getCookie(event, 'uid'))
  return getSettings(db, user.id)
})
