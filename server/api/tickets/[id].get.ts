export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const db = await readDb()
  // 可以用 id 或編號查詢：/api/tickets/t_xxx 或 /api/tickets/TK-7F3K9Q
  const ticket = findTicket(db, id)
  if (!ticket) throw createError({ statusCode: 404, message: '找不到這個 ticket' })
  return ticket
})
