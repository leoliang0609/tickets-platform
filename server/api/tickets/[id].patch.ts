export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const userId = getCookie(event, 'uid')

  return updateDb((db) => {
    const user = requireUser(db, userId)
    const ticket = findTicket(db, id)
    if (!ticket) throw createError({ statusCode: 404, message: '找不到這個 ticket' })
    const input = validateTicketInput(body, db, true)
    // 死線只有建立者能直接改，其他人要走延期申請
    if ('deadline' in input && input.deadline !== ticket.deadline && user.id !== ticket.creatorId) {
      fail('只有建立者可以直接修改死線，請改用「申請延期」', 403)
    }
    const prevAssignee = ticket.assigneeId
    Object.assign(ticket, input, { updatedAt: new Date().toISOString() })
    if (ticket.assigneeId !== prevAssignee) {
      notify(db, { userId: ticket.assigneeId, kind: 'ticket_assigned', ticket, actorId: user.id })
    }
    return ticket
  })
})
