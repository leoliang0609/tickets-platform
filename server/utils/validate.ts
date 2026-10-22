import type { Database, ProjectInput, Subtask, TicketInput, TicketPriority, TicketStatus } from '#shared/types'

const STATUSES: TicketStatus[] = ['todo', 'in_progress', 'done']
const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high']

export function fail(message: string, statusCode = 400): never {
  throw createError({ statusCode, message })
}

export function isDateStr(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))
}

function normalizeSubtasks(list: unknown): Subtask[] {
  if (!Array.isArray(list)) fail('subtasks 必須是陣列')
  return list
    .filter((s: any) => typeof s?.title === 'string' && s.title.trim())
    .map((s: any) => ({
      id: typeof s.id === 'string' && s.id ? s.id : newId('s'),
      title: s.title.trim(),
      done: Boolean(s.done)
    }))
}

/** partial = true 時只驗證有帶的欄位（PATCH 用） */
export function validateTicketInput(body: any, db: Database, partial = false): Partial<TicketInput> {
  if (!body || typeof body !== 'object') fail('請求內容錯誤')
  const out: Partial<TicketInput> = {}

  if (!partial || 'title' in body) {
    if (typeof body.title !== 'string' || !body.title.trim()) fail('標題不可為空')
    out.title = body.title.trim()
  }
  if (!partial || 'description' in body) {
    out.description = typeof body.description === 'string' ? body.description : ''
  }
  if (!partial || 'deadline' in body) {
    // null / 空字串 / 未提供 = 無死線
    const d = body.deadline || null
    if (d !== null && !isDateStr(d)) fail('死線格式需為 YYYY-MM-DD')
    out.deadline = d
  }
  if (!partial || 'priority' in body) {
    const p = body.priority ?? 'medium'
    if (!PRIORITIES.includes(p)) fail('優先度不正確')
    out.priority = p
  }
  if ('status' in body) {
    if (!STATUSES.includes(body.status)) fail('狀態不正確')
    out.status = body.status
  }
  if (!partial || 'assigneeId' in body) {
    if (!db.users.some(u => u.id === body.assigneeId)) fail('指派對象不存在')
    out.assigneeId = body.assigneeId
  }
  if (!partial || 'projectId' in body) {
    const pid = body.projectId || null
    if (pid !== null && !db.projects.some(p => p.id === pid)) fail('專案不存在')
    out.projectId = pid
  }
  if ('subtasks' in body) {
    out.subtasks = normalizeSubtasks(body.subtasks)
  }
  return out
}

export function validateProjectInput(body: any, partial = false): Partial<ProjectInput> {
  if (!body || typeof body !== 'object') fail('請求內容錯誤')
  const out: Partial<ProjectInput> = {}

  if (!partial || 'name' in body) {
    if (typeof body.name !== 'string' || !body.name.trim()) fail('專案名稱不可為空')
    out.name = body.name.trim()
  }
  if (!partial || 'description' in body) {
    out.description = typeof body.description === 'string' ? body.description : ''
  }
  if (!partial || 'color' in body) {
    const c = body.color ?? '#7c8cff'
    if (typeof c !== 'string' || !/^#[0-9a-f]{6}$/i.test(c)) fail('顏色格式不正確')
    out.color = c
  }
  return out
}

// 目前以 cookie 模擬登入；接上管理平台後改為驗證 session
export function requireUser(db: Database, userId: unknown) {
  const user = db.users.find(u => u.id === userId)
  if (!user) throw createError({ statusCode: 401, message: '未知的使用者' })
  return user
}
