export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const userId = getCookie(event, 'uid')

  await updateDb((db) => {
    requireUser(db, userId)
    const ticket = findTicket(db, id)
    if (!ticket) throw createError({ statusCode: 404, message: '找不到這個 ticket' })
    db.tickets.splice(db.tickets.indexOf(ticket), 1)
    db.notifications = db.notifications.filter(n => n.ticketId !== ticket.id)
  })
  return { ok: true }
})
