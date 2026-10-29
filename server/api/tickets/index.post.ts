import type { Ticket } from '#shared/types'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const userId = getCookie(event, 'uid')

  const ticket = await updateDb((db) => {
    const creator = requireUser(db, userId)
    const input = validateTicketInput(body, db)
    const now = new Date().toISOString()
    const t: Ticket = {
      id: newId('t'),
      code: newTicketCode(db),
      title: input.title!,
      description: input.description ?? '',
      subtasks: input.subtasks ?? [],
      status: input.status ?? 'todo',
      priority: input.priority ?? 'medium',
      deadline: input.deadline ?? null,
      extensionRequests: [],
      createdAt: now,
      updatedAt: now,
      creatorId: creator.id,
      assigneeId: input.assigneeId!,
      projectId: input.projectId ?? null,
      prUrl: input.prUrl ?? null
    }
    db.tickets.unshift(t)
    notify(db, { userId: t.assigneeId, kind: 'ticket_assigned', ticket: t, actorId: creator.id })
    return t
  })

  setResponseStatus(event, 201)
  return ticket
})
