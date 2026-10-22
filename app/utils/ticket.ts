import type { Ticket, TicketPriority, TicketStatus } from '#shared/types'
import { daysUntil } from '#shared/utils/date'
import { normalizeTicketCode } from '#shared/utils/ticketCode'

export const STATUS_LABEL: Record<TicketStatus, string> = {
  todo: '待辦',
  in_progress: '進行中',
  done: '已完成'
}

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  high: '高',
  medium: '中',
  low: '低'
}

const PRIORITY_RANK: Record<TicketPriority, number> = { high: 0, medium: 1, low: 2 }

export function isOverdue(t: Ticket) {
  return t.status !== 'done' && !!t.deadline && daysUntil(t.deadline) < 0
}

export function pendingExtension(t: Ticket) {
  return t.extensionRequests.find(r => r.status === 'pending')
}

export function deadlineInfo(t: Ticket): { text: string, tone: 'danger' | 'warn' | 'muted' | 'ok' } {
  if (!t.deadline) return { text: '無死線', tone: 'muted' }
  if (t.status === 'done') return { text: t.deadline, tone: 'ok' }
  const n = daysUntil(t.deadline)
  if (n < 0) return { text: `逾期 ${-n} 天`, tone: 'danger' }
  if (n === 0) return { text: '今天到期', tone: 'danger' }
  if (n <= 3) return { text: `剩 ${n} 天`, tone: 'warn' }
  return { text: t.deadline, tone: 'muted' }
}

export function formatDateTime(iso: string) {
  // 不用 toLocaleString：Node 與瀏覽器的輸出（空白字元）不同，會造成 hydration mismatch
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function subtaskProgress(t: Ticket) {
  const total = t.subtasks.length
  const done = t.subtasks.filter(s => s.done).length
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
}

export type SortKey = 'deadline' | 'createdAt' | 'priority'

/** 無死線的排在有死線的後面 */
function compareDeadline(a: Ticket, b: Ticket) {
  if (a.deadline === b.deadline) return 0
  if (!a.deadline) return 1
  if (!b.deadline) return -1
  return a.deadline.localeCompare(b.deadline)
}

export function sortTickets(list: Ticket[], key: SortKey) {
  return [...list].sort((a, b) => {
    // 已完成的永遠排在最後
    if ((a.status === 'done') !== (b.status === 'done')) return a.status === 'done' ? 1 : -1
    if (key === 'deadline') return compareDeadline(a, b)
    if (key === 'priority') return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || compareDeadline(a, b)
    return b.createdAt.localeCompare(a.createdAt)
  })
}

/** 用 id 或編號（TK-7F3K9Q、tk7f3k9q、7F3K9Q…）找 ticket */
export function findTicketByIdOrCode(list: Ticket[], input: string) {
  const code = normalizeTicketCode(input)
  return list.find(t => t.id === input || (code !== null && t.code === code))
}

/** 關鍵字搜尋：編號（可只打一部分），或標題、內容、子項目包含關鍵字 */
export function matchesKeyword(t: Ticket, keyword: string) {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return true
  if (normalizeTicketCode(kw) === t.code) return true
  return `${t.code} ${t.title} ${t.description} ${t.subtasks.map(s => s.title).join(' ')}`.toLowerCase().includes(kw)
}
