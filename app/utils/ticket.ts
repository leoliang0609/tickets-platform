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
    if (key === 'deadline') {
      // 逾期的之間：剛逾期的排前面，逾期很久的沉到後面
      if (isOverdue(a) && isOverdue(b)) return b.deadline!.localeCompare(a.deadline!)
      return compareDeadline(a, b)
    }
    if (key === 'priority') return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || compareDeadline(a, b)
    return b.createdAt.localeCompare(a.createdAt)
  })
}

/** 依死線分組顯示用；順序就是畫面上的分組順序 */
export const DEADLINE_GROUPS = [
  { key: 'overdue', label: '已逾期', tone: 'danger' },
  { key: 'today', label: '今天到期', tone: 'danger' },
  { key: 'soon', label: '3 天內到期', tone: 'warn' },
  { key: 'later', label: '之後', tone: 'muted' },
  { key: 'none', label: '無死線', tone: 'muted' },
  { key: 'done', label: '已完成', tone: 'ok' }
] as const
export type DeadlineGroup = typeof DEADLINE_GROUPS[number]['key']

export function deadlineGroup(t: Ticket): DeadlineGroup {
  if (t.status === 'done') return 'done'
  if (!t.deadline) return 'none'
  const n = daysUntil(t.deadline)
  if (n < 0) return 'overdue'
  if (n === 0) return 'today'
  return n <= 3 ? 'soon' : 'later'
}

export type DeadlineFilter = '' | 'overdue' | 'due3' | 'due7' | 'none'

/** 死線篩選：到期類的條件只算未完成的 ticket */
export function matchesDeadline(t: Ticket, f: DeadlineFilter) {
  if (!f) return true
  if (f === 'none') return !t.deadline
  if (t.status === 'done' || !t.deadline) return false
  const n = daysUntil(t.deadline)
  if (f === 'overdue') return n < 0
  return n >= 0 && n <= (f === 'due3' ? 3 : 7)
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
