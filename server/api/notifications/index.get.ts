export default defineEventHandler(async (event) => {
  const userId = getCookie(event, 'uid')
  const db = await readDb()
  const user = requireUser(db, userId)

  // 只有死線提醒有變動時才寫檔
  const fresh = syncDeadlineAlerts(db, user.id)
    ? await updateDb((d) => { syncDeadlineAlerts(d, user.id); return d })
    : db

  return fresh.notifications.filter(n => n.userId === user.id)
})
