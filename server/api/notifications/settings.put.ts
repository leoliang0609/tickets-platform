import type { NotificationSettings } from '#shared/types'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const userId = getCookie(event, 'uid')

  return updateDb((db) => {
    const user = requireUser(db, userId)
    if (!body || typeof body !== 'object') fail('請求內容錯誤')

    const days = Number(body.dueSoonDays)
    if (!Number.isInteger(days) || days < 0 || days > 30) fail('提醒天數需為 0–30')
    if (!Array.isArray(body.projectIds)) fail('projectIds 必須是陣列')

    const settings: NotificationSettings = {
      userId: user.id,
      myTickets: Boolean(body.myTickets),
      projectIds: body.projectIds.filter((id: unknown) => db.projects.some(p => p.id === id)),
      dueSoonDays: days,
      overdue: Boolean(body.overdue)
    }
    db.notificationSettings = [...db.notificationSettings.filter(s => s.userId !== user.id), settings]
    // 設定改了就馬上重算提醒
    syncDeadlineAlerts(db, user.id)
    return settings
  })
})
