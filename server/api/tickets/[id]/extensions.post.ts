import type { ExtensionRequest } from '#shared/types'

/** 被指派者提出延期申請 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const userId = getCookie(event, 'uid')

  return updateDb((db) => {
    const user = requireUser(db, userId)
    const ticket = findTicket(db, id)
    if (!ticket) fail('找不到這個 ticket', 404)

    if (user.id !== ticket.assigneeId) fail('只有被指派的人可以申請延期', 403)
    if (user.id === ticket.creatorId) fail('你是建立者，可以直接編輯死線')
    if (ticket.status === 'done') fail('已完成的 ticket 不需要延期')
    if (!ticket.deadline) fail('這個 ticket 沒有死線')
    if (ticket.extensionRequests.some(r => r.status === 'pending')) fail('已有一筆延期申請在審核中')

    if (!isDateStr(body?.toDeadline)) fail('請選擇新的死線日期')
    if (body.toDeadline <= ticket.deadline) fail('新的死線必須晚於目前死線')
    if (typeof body.reason !== 'string' || !body.reason.trim()) fail('請填寫延期原因')

    const now = new Date().toISOString()
    const req: ExtensionRequest = {
      id: newId('x'),
      requesterId: user.id,
      fromDeadline: ticket.deadline,
      toDeadline: body.toDeadline,
      reason: body.reason.trim(),
      status: 'pending',
      createdAt: now
    }
    ticket.extensionRequests.push(req)
    ticket.updatedAt = now
    notify(db, {
      userId: ticket.creatorId,
      kind: 'extension_requested',
      ticket,
      actorId: user.id,
      requestId: req.id,
      deadline: req.fromDeadline,
      toDeadline: req.toDeadline
    })
    return ticket
  })
})
