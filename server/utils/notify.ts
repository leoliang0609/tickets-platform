import type { AppNotification, Database, NotificationSettings, Ticket } from '#shared/types'
import { daysUntil } from '#shared/utils/date'

const MAX_PER_USER = 100

export function defaultSettings(userId: string): NotificationSettings {
  return { userId, myTickets: true, projectIds: [], dueSoonDays: 3, overdue: true }
}

export function getSettings(db: Database, userId: string) {
  return db.notificationSettings.find(s => s.userId === userId) ?? defaultSettings(userId)
}

type NewNotification = Omit<AppNotification, 'id' | 'createdAt' | 'read' | 'ticketId' | 'ticketTitle'> & { ticket: Ticket }

export function notify(db: Database, { ticket, ...n }: NewNotification) {
  // 自己做的事不用通知自己
  if (n.actorId && n.actorId === n.userId) return
  db.notifications.unshift({
    ...n,
    id: newId('n'),
    ticketId: ticket.id,
    ticketTitle: ticket.title,
    createdAt: new Date().toISOString(),
    read: false
  })
  const mine = db.notifications.filter(x => x.userId === n.userId)
  if (mine.length > MAX_PER_USER) {
    const drop = new Set(mine.slice(MAX_PER_USER).map(x => x.id))
    db.notifications = db.notifications.filter(x => !drop.has(x.id))
  }
}

/** 依使用者的設定，這張 ticket 現在應該有哪個死線提醒（沒有則回傳 null） */
function expectedAlert(t: Ticket, s: NotificationSettings): { kind: 'due_soon' | 'overdue', key: string } | null {
  if (t.status === 'done' || !t.deadline) return null
  const watched = (s.myTickets && t.assigneeId === s.userId) || (t.projectId !== null && s.projectIds.includes(t.projectId))
  if (!watched) return null
  const days = daysUntil(t.deadline)
  if (days < 0) return s.overdue ? { kind: 'overdue', key: `overdue:${t.id}:${t.deadline}` } : null
  if (days <= s.dueSoonDays) return { kind: 'due_soon', key: `due_soon:${t.id}:${t.deadline}` }
  return null
}

/**
 * 產生／清理死線提醒。目前在讀取通知時執行；
 * 之後搬到管理平台時可以改成排程（cron）定期執行。
 * 回傳是否有變動。
 */
export function syncDeadlineAlerts(db: Database, userId: string) {
  const s = getSettings(db, userId)
  const expected = new Map<string, { kind: 'due_soon' | 'overdue', ticket: Ticket }>()
  for (const t of db.tickets) {
    const a = expectedAlert(t, s)
    if (a) expected.set(a.key, { kind: a.kind, ticket: t })
  }

  let changed = false
  // 清掉已不成立且尚未讀的提醒（例如 ticket 已完成、死線延後、取消關注）
  const before = db.notifications.length
  db.notifications = db.notifications.filter(n =>
    n.userId !== userId || !n.key || n.read || expected.has(n.key)
  )
  if (db.notifications.length !== before) changed = true

  const existing = new Set(db.notifications.filter(n => n.userId === userId && n.key).map(n => n.key))
  for (const [key, { kind, ticket }] of expected) {
    if (existing.has(key)) continue
    notify(db, { userId, kind, ticket, key, deadline: ticket.deadline! })
    changed = true
  }
  return changed
}
