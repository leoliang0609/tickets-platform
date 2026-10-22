// 日期工具（前後端共用）。日期一律用本地時區的 YYYY-MM-DD 字串

function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayStr() {
  return fmt(new Date())
}

/** 距離死線的天數（負數代表已逾期） */
export function daysUntil(deadline: string) {
  const [y, m, d] = deadline.split('-').map(Number)
  const target = new Date(y!, m! - 1, d!)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export function addDays(date: string, n: number) {
  const [y, m, d] = date.split('-').map(Number)
  return fmt(new Date(y!, m! - 1, d! + n))
}
