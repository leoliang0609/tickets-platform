export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const userId = getCookie(event, 'uid')

  await updateDb((db) => {
    requireUser(db, userId)
    const idx = db.projects.findIndex(p => p.id === id)
    if (idx === -1) throw createError({ statusCode: 404, message: '找不到這個專案' })
    db.projects.splice(idx, 1)
    // 刪除專案不刪 ticket，改為「未分類」
    for (const t of db.tickets) {
      if (t.projectId === id) t.projectId = null
    }
    for (const s of db.notificationSettings) {
      s.projectIds = s.projectIds.filter(pid => pid !== id)
    }
  })
  return { ok: true }
})
