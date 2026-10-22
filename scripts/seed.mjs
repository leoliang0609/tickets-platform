// 重設測試資料：npm run seed
// 所有日期都以「執行當天」為基準計算，確保快到期 / 逾期等情境永遠成立。
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const pad = n => String(n).padStart(2, '0')
const day = (offset) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
/** offset 天前、指定時間的 ISO 字串 */
const at = (offset, hour = 10, min = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  d.setHours(hour, min, 0, 0)
  return d.toISOString()
}
const subs = (...items) => items.map(([title, done], i) => ({ id: `s${i + 1}`, title, done }))

const users = [
  { id: 'u1', name: 'Leo', email: 'leo@example.com', color: '#7c8cff' },
  { id: 'u2', name: 'Mia', email: 'mia@example.com', color: '#f472b6' }
]

const projects = [
  { id: 'p_admin', name: '管理平台', description: '內部管理平台的開發與設計，包含登入、報表與 ticket 系統。', color: '#7c8cff', createdAt: at(-30), creatorId: 'u1' },
  { id: 'p_ops', name: '系統維運', description: '伺服器、資料庫與備份等日常維運工作。', color: '#3ccf91', createdAt: at(-28), creatorId: 'u2' },
  { id: 'p_web', name: '官網改版', description: '公司官網視覺與架構全面改版，預計下個月上線。', color: '#f472b6', createdAt: at(-14), creatorId: 'u1' }
]

const T = (o) => ({
  description: '', subtasks: [], status: 'todo', priority: 'medium', extensionRequests: [],
  createdAt: at(-7), updatedAt: at(-7), projectId: null, ...o
})

const tickets = [
  // ── 指派給 Leo ─────────────────────────────
  T({
    id: 't_1001', title: '設計管理平台登入流程', creatorId: 'u2', assigneeId: 'u1', projectId: 'p_admin',
    status: 'in_progress', priority: 'high', deadline: day(2), createdAt: at(-6), updatedAt: at(-3),
    description: '整理登入、忘記密碼、SSO 三種流程的畫面與 API 規格。\n需要和後端確認 token 過期策略。',
    subtasks: subs(['畫出流程圖', true], ['列出 API 規格', false], ['和後端開會確認', false])
  }),
  T({
    id: 't_1004', title: '資料庫備份排程檢查', creatorId: 'u2', assigneeId: 'u1', projectId: 'p_ops',
    priority: 'high', deadline: day(-2), createdAt: at(-11),
    description: '確認每日備份是否正常執行，並測試一次還原。\n👉 測試：用 Leo 對這張「申請延期」，再切到 Mia 審核。',
    subtasks: subs(['檢查備份 log', false], ['還原到測試環境', false])
  }),
  T({
    id: 't_1005', title: 'SSL 憑證更新', creatorId: 'u2', assigneeId: 'u1', projectId: 'p_ops',
    status: 'in_progress', priority: 'high', deadline: day(1), createdAt: at(-5), updatedAt: at(0, 9, 15),
    description: '官網與 API 的憑證即將過期，需要更新並確認自動續約。',
    subtasks: subs(['申請新憑證', true], ['更新 API 伺服器', false], ['設定自動續約', false]),
    extensionRequests: [{ id: 'x_1005a', requesterId: 'u1', fromDeadline: day(1), toDeadline: day(6), reason: '憑證商審核要 3–5 個工作天，申請文件已送出。', status: 'pending', createdAt: at(0, 9, 15) }]
  }),
  T({
    id: 't_1010', title: '季度報告簡報', creatorId: 'u2', assigneeId: 'u1',
    deadline: day(30), createdAt: at(-1, 16, 40), updatedAt: at(-1, 16, 40),
    description: '整理本季各專案進度，做成 10 頁以內的簡報。'
  }),
  T({
    id: 't_1002', title: '修正報表匯出 CSV 亂碼', creatorId: 'u1', assigneeId: 'u1', projectId: 'p_admin',
    status: 'done', deadline: day(-4), createdAt: at(-9), updatedAt: at(-5),
    description: 'Excel 開啟 CSV 時中文變亂碼，需要加上 UTF-8 BOM。',
    subtasks: subs(['重現問題', true], ['加上 BOM 並測試', true])
  }),
  T({
    id: 't_1009', title: '研究新的監控工具', creatorId: 'u1', assigneeId: 'u1',
    priority: 'low', deadline: null, createdAt: at(-3),
    description: '比較 Grafana、Datadog 等方案，有空再看，沒有死線。'
  }),
  T({
    id: 't_1012', title: 'Ticket 系統加入通知功能', creatorId: 'u2', assigneeId: 'u1', projectId: 'p_admin',
    status: 'done', deadline: day(-1), createdAt: at(-8), updatedAt: at(-1)
  }),

  // ── 指派給 Mia ─────────────────────────────
  T({
    id: 't_1003', title: '撰寫 Ticket 系統使用說明', creatorId: 'u1', assigneeId: 'u2', projectId: 'p_admin',
    priority: 'low', deadline: day(15), createdAt: at(-2), updatedAt: at(0, 10, 30),
    description: '給新同事看的使用說明，包含建立、指派、追蹤 ticket 的方式。',
    subtasks: subs(['大綱', true], ['截圖', false]),
    extensionRequests: [{ id: 'x_1003a', requesterId: 'u2', fromDeadline: day(15), toDeadline: day(22), reason: '截圖要等新版 UI 上線後才能拍，預計晚一週。', status: 'pending', createdAt: at(0, 10, 30) }]
  }),
  T({
    id: 't_1006', title: '官網首頁改版設計稿', creatorId: 'u1', assigneeId: 'u2', projectId: 'p_web',
    status: 'in_progress', priority: 'high', deadline: day(3), createdAt: at(-10), updatedAt: at(-2),
    description: '首頁 Hero、產品介紹、客戶案例三個區塊的設計稿（桌機 + 手機）。',
    subtasks: subs(['Hero 區塊', true], ['產品介紹', true], ['客戶案例', false], ['手機版', false]),
    extensionRequests: [{ id: 'x_1006a', requesterId: 'u2', fromDeadline: day(-1), toDeadline: day(3), reason: '客戶臨時新增兩個區塊。', status: 'approved', createdAt: at(-3, 14), deciderId: 'u1', decidedAt: at(-2, 11), note: '了解，OK！' }]
  }),
  T({
    id: 't_1007', title: 'RWD 手機版測試', creatorId: 'u1', assigneeId: 'u2', projectId: 'p_web',
    deadline: day(-3), createdAt: at(-9), updatedAt: at(-4),
    description: '在 iOS / Android 主流機型上測試新版官網。',
    subtasks: subs(['iPhone', false], ['Android', false], ['平板', false]),
    extensionRequests: [{ id: 'x_1007a', requesterId: 'u2', fromDeadline: day(-3), toDeadline: day(4), reason: '測試機還沒借到。', status: 'rejected', createdAt: at(-5, 15), deciderId: 'u1', decidedAt: at(-4, 9), note: '可以先用 BrowserStack 測，請照原本時間。' }]
  }),
  T({
    id: 't_1008', title: '整理 SEO 關鍵字', creatorId: 'u2', assigneeId: 'u2', projectId: 'p_web',
    priority: 'low', deadline: null, createdAt: at(-4),
    description: '列出主要產品頁的目標關鍵字，沒有急迫性。'
  }),
  T({
    id: 't_1011', title: '伺服器 OS 升級', creatorId: 'u2', assigneeId: 'u2', projectId: 'p_ops',
    deadline: day(0), createdAt: at(-6),
    description: '把兩台 API 伺服器升級到最新 LTS。',
    subtasks: subs(['備份', true], ['升級 staging', true], ['升級 production', false])
  })
]

// 編號：固定值，方便測試時用同樣的編號搜尋（新建立的 ticket 才是隨機產生）
const CODES = { t_1001: 'TK-4QZ8MD', t_1002: 'TK-H7N2XK', t_1003: 'TK-9VCE3R', t_1004: 'TK-B6TW1J', t_1005: 'TK-R2KF8P', t_1006: 'TK-X5DM7A', t_1007: 'TK-7F3K9Q', t_1008: 'TK-N8GP4S', t_1009: 'TK-C1YV6H', t_1010: 'TK-M3QJ5W', t_1011: 'TK-E9RA2T', t_1012: 'TK-K4WN0B' }
for (const t of tickets) t.code = CODES[t.id]

const N = (o) => ({ read: false, ...o, ticketTitle: tickets.find(t => t.id === o.ticketId).title })
const notifications = [
  // Leo 的通知
  N({ id: 'n_01', userId: 'u1', kind: 'extension_requested', ticketId: 't_1003', actorId: 'u2', createdAt: at(0, 10, 30), requestId: 'x_1003a', deadline: day(15), toDeadline: day(22) }),
  N({ id: 'n_02', userId: 'u1', kind: 'ticket_assigned', ticketId: 't_1010', actorId: 'u2', createdAt: at(-1, 16, 40) }),
  N({ id: 'n_03', userId: 'u1', kind: 'ticket_assigned', ticketId: 't_1005', actorId: 'u2', createdAt: at(-5), read: true }),
  N({ id: 'n_04', userId: 'u1', kind: 'ticket_assigned', ticketId: 't_1004', actorId: 'u2', createdAt: at(-11), read: true }),
  // Mia 的通知
  N({ id: 'n_11', userId: 'u2', kind: 'extension_requested', ticketId: 't_1005', actorId: 'u1', createdAt: at(0, 9, 15), requestId: 'x_1005a', deadline: day(1), toDeadline: day(6) }),
  N({ id: 'n_12', userId: 'u2', kind: 'extension_decided', ticketId: 't_1007', actorId: 'u1', createdAt: at(-4, 9), requestId: 'x_1007a', decision: 'rejected', deadline: day(-3), toDeadline: day(4) }),
  N({ id: 'n_13', userId: 'u2', kind: 'extension_decided', ticketId: 't_1006', actorId: 'u1', createdAt: at(-2, 11), requestId: 'x_1006a', decision: 'approved', deadline: day(-1), toDeadline: day(3), read: true }),
  N({ id: 'n_14', userId: 'u2', kind: 'ticket_assigned', ticketId: 't_1003', actorId: 'u1', createdAt: at(-2), read: true })
]
// 死線提醒（快到期 / 逾期）不寫在這裡，第一次讀取通知時會依設定自動產生

const notificationSettings = [
  // Leo：自己的 ticket + 關注「官網改版」（可以看到 Mia 的 RWD 測試逾期）
  { userId: 'u1', myTickets: true, projectIds: ['p_web'], dueSoonDays: 3, overdue: true },
  // Mia：只看自己的，到期前 2 天提醒
  { userId: 'u2', myTickets: true, projectIds: [], dueSoonDays: 2, overdue: true }
]

const db = { users, projects, tickets, notifications, notificationSettings }
// data/ 不在 git 裡，clone 後可能還不存在
mkdirSync(resolve(import.meta.dirname, '../data'), { recursive: true })
writeFileSync(resolve(import.meta.dirname, '../data/db.json'), JSON.stringify(db, null, 2))
console.log(`✔ 已重設測試資料：${projects.length} 個專案、${tickets.length} 個 ticket、${notifications.length} 則通知`)
