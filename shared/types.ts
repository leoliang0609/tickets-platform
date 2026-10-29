export type TicketStatus = 'todo' | 'in_progress' | 'done'
export type TicketPriority = 'low' | 'medium' | 'high'

export interface User {
  id: string
  name: string
  email: string
  color: string
}

export interface Project {
  id: string
  name: string
  description: string
  color: string
  createdAt: string
  creatorId: string
}

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export type ExtensionStatus = 'pending' | 'approved' | 'rejected'

/** 死線延期申請：由被指派者提出，建立者審核 */
export interface ExtensionRequest {
  id: string
  requesterId: string
  /** 申請當下的死線 (YYYY-MM-DD) */
  fromDeadline: string
  /** 希望延到的日期 (YYYY-MM-DD) */
  toDeadline: string
  reason: string
  status: ExtensionStatus
  createdAt: string
  deciderId?: string
  decidedAt?: string
  /** 審核時的回覆 */
  note?: string
}

export interface Ticket {
  id: string
  /** 對外編號，例如 TK-7F3K9Q；可寫在 commit 訊息裡對應 ticket（見 shared/utils/ticketCode.ts） */
  code: string
  title: string
  description: string
  subtasks: Subtask[]
  status: TicketStatus
  priority: TicketPriority
  /** YYYY-MM-DD；null 代表無死線 */
  deadline: string | null
  extensionRequests: ExtensionRequest[]
  createdAt: string
  updatedAt: string
  creatorId: string
  assigneeId: string
  /** null 代表未歸屬任何專案 */
  projectId: string | null
  /** 完成時附上的 PR 網址；null 代表還沒填 */
  prUrl: string | null
}

export type NotificationKind =
  | 'ticket_assigned' // 有人指派 ticket 給我
  | 'extension_requested' // 有人對我建立的 ticket 申請延期
  | 'extension_decided' // 我的延期申請被核准/駁回
  | 'due_soon' // 快到期（依通知設定）
  | 'overdue' // 已逾期（依通知設定）

export interface AppNotification {
  id: string
  userId: string
  kind: NotificationKind
  ticketId: string
  /** 建立通知當下的標題，ticket 被刪除時仍可顯示 */
  ticketTitle: string
  actorId?: string
  createdAt: string
  read: boolean
  /** 死線提醒的去重 key，例如 overdue:t_1004:2026-10-19 */
  key?: string
  requestId?: string
  decision?: 'approved' | 'rejected'
  deadline?: string
  toDeadline?: string
}

export interface NotificationSettings {
  userId: string
  /** 指派給我的 ticket（不分專案）都提醒 */
  myTickets: boolean
  /** 關注的專案：專案內所有人的 ticket 都提醒 */
  projectIds: string[]
  /** 到期前幾天提醒；0 = 不提醒 */
  dueSoonDays: number
  /** 逾期提醒 */
  overdue: boolean
}

export interface Database {
  users: User[]
  projects: Project[]
  tickets: Ticket[]
  notifications: AppNotification[]
  notificationSettings: NotificationSettings[]
}

export type ProjectInput = Pick<Project, 'name' | 'description' | 'color'>

export interface TicketInput {
  title: string
  description: string
  priority: TicketPriority
  deadline: string | null
  assigneeId: string
  projectId: string | null
  status?: TicketStatus
  subtasks?: Subtask[]
  prUrl?: string | null
}
