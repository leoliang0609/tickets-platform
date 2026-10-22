// Ticket 編號：TK-7F3K9Q
// 設計給 commit 訊息引用：固定前綴方便 grep / 自動辨識，隨機碼避免撞號、也不會和 GitHub 的 #12 混淆。

/** 想換成公司或專案縮寫，改這裡即可（只影響之後新產生的編號） */
export const TICKET_CODE_PREFIX = 'TK'

/** Crockford Base32：不含 I、L、O、U，避免和 1、0 看錯 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const LENGTH = 6 // 32^6 ≈ 10 億種組合

/** 從 commit 訊息等文字中找出所有 ticket 編號用（記得加 g 旗標時要重設 lastIndex） */
export const TICKET_CODE_PATTERN = new RegExp(`\\b${TICKET_CODE_PREFIX}-[${ALPHABET}]{${LENGTH}}\\b`, 'gi')

function encode(bits: (i: number) => number) {
  let s = ''
  for (let i = 0; i < LENGTH; i++) s += ALPHABET[bits(i) & 31]
  return `${TICKET_CODE_PREFIX}-${s}`
}

export function randomTicketCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(LENGTH))
  return encode(i => bytes[i]!)
}

/** 由固定字串產生編號（替舊資料補編號用，每次結果都一樣） */
export function ticketCodeFromSeed(seed: string) {
  // FNV-1a 32-bit
  let h = 0x811C9DC5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  // 再打散一次，避免相近的字串（t_1001、t_1002）產生相似的編號
  h ^= h >>> 16
  h = Math.imul(h, 0x85EBCA6B) >>> 0
  h ^= h >>> 13
  h = Math.imul(h, 0xC2B2AE35) >>> 0
  h ^= h >>> 16
  return encode(i => h >>> (i * 5))
}

/**
 * 把使用者輸入轉成標準編號，不是編號格式就回傳 null。
 * 接受：TK-7F3K9Q、tk7f3k9q、#TK-7F3K9Q、7F3K9Q；O 視為 0，I / L 視為 1。
 */
export function normalizeTicketCode(input: string): string | null {
  const raw = input.trim().toUpperCase().replace(/^#/, '')
  const prefix = TICKET_CODE_PREFIX.toUpperCase()
  // 有前綴就先試去掉前綴；隨機碼本身也可能以 TK 開頭，所以原字串也要試
  const candidates = raw.startsWith(prefix) ? [raw.slice(prefix.length).replace(/^[-_\s]/, ''), raw] : [raw]
  for (const c of candidates) {
    const s = c.replace(/O/g, '0').replace(/[IL]/g, '1')
    if (s.length === LENGTH && [...s].every(ch => ALPHABET.includes(ch))) return `${TICKET_CODE_PREFIX}-${s}`
  }
  return null
}
