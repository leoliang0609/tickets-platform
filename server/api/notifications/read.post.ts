/** 標為已讀：{ ids: string[] } 或 { all: true } */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const userId = getCookie(event, 'uid')

  return updateDb((db) => {
    const user = requireUser(db, userId)
    const ids = new Set<string>(Array.isArray(body?.ids) ? body.ids : [])
    for (const n of db.notifications) {
      if (n.userId === user.id && (body?.all === true || ids.has(n.id))) n.read = true
    }
    return db.notifications.filter(n => n.userId === user.id)
  })
})
