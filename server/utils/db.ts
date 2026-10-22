import { readFile, writeFile, rename } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Database } from '#shared/types'
import { normalizeTicketCode, randomTicketCode, ticketCodeFromSeed } from '#shared/utils/ticketCode'

// JSON 檔暫代資料庫；之後換成真正的 DB 只需改這個檔案
const DB_PATH = resolve(process.cwd(), 'data/db.json')

let queue: Promise<unknown> = Promise.resolve()

export async function readDb(): Promise<Database> {
  const raw = await readFile(DB_PATH, 'utf-8')
  const db = JSON.parse(raw) as Database
  // 相容舊版資料（尚未有專案功能時建立的 db.json）
  db.projects ??= []
  db.notifications ??= []
  db.notificationSettings ??= []
  for (const t of db.tickets) {
    t.projectId ??= null
    t.deadline ??= null
    t.extensionRequests ??= []
  }
  assignMissingCodes(db)
  return db
}

/** 舊資料沒有編號時，由 id 算出固定的編號（重複讀取結果不變），撞號就加鹽重算 */
function assignMissingCodes(db: Database) {
  const used = new Set(db.tickets.map(t => t.code).filter(Boolean))
  for (const t of db.tickets) {
    // 移除先前版本的流水號欄位
    delete (t as { number?: number }).number
    if (t.code) continue
    let code = ticketCodeFromSeed(t.id)
    for (let salt = 1; used.has(code); salt++) code = ticketCodeFromSeed(`${t.id}#${salt}`)
    t.code = code
    used.add(code)
  }
  delete (db as { nextTicketNumber?: number }).nextTicketNumber
}

/** 產生一個沒有被用過的新編號 */
export function newTicketCode(db: Database) {
  const used = new Set(db.tickets.map(t => t.code))
  let code = randomTicketCode()
  while (used.has(code)) code = randomTicketCode()
  return code
}

/** 用 id 或編號（大小寫、有無前綴皆可）找 ticket */
export function findTicket(db: Database, idOrCode: string | undefined) {
  if (!idOrCode) return undefined
  const code = normalizeTicketCode(idOrCode)
  return db.tickets.find(t => t.id === idOrCode || (code !== null && t.code === code))
}

/** 依序執行「讀-改-寫」，避免同時寫入互相覆蓋 */
export function updateDb<T>(mutate: (db: Database) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await readDb()
    const result = await mutate(db)
    const tmp = `${DB_PATH}.tmp`
    await writeFile(tmp, JSON.stringify(db, null, 2), 'utf-8')
    await rename(tmp, DB_PATH)
    return result
  })
  queue = run.catch(() => {})
  return run
}

export function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
