/** 建立者審核延期申請：{ decision: 'approved' | 'rejected', note?: string } */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const extId = getRouterParam(event, 'extId')
  const body = await readBody(event)
  const userId = getCookie(event, 'uid')

  return updateDb((db) => {
    const user = requireUser(db, userId)
    const ticket = findTicket(db, id)
    if (!ticket) fail('找不到這個 ticket', 404)
    const req = ticket.extensionRequests.find(r => r.id === extId)
    if (!req) fail('找不到這筆延期申請', 404)

    if (user.id !== ticket.creatorId) fail('只有建立者可以審核延期申請', 403)
    if (req.status !== 'pending') fail('這筆申請已經審核過了')
    if (body?.decision !== 'approved' && body?.decision !== 'rejected') fail('審核結果不正確')

    const now = new Date().toISOString()
    req.status = body.decision
    req.deciderId = user.id
    req.decidedAt = now
    if (typeof body.note === 'string' && body.note.trim()) req.note = body.note.trim()
    if (req.status === 'approved') ticket.deadline = req.toDeadline
    ticket.updatedAt = now

    // 審核完，對應的「待審核」通知自動標為已讀
    for (const n of db.notifications) {
      if (n.kind === 'extension_requested' && n.requestId === req.id) n.read = true
    }
    notify(db, {
      userId: req.requesterId,
      kind: 'extension_decided',
      ticket,
      actorId: user.id,
      requestId: req.id,
      decision: req.status,
      deadline: req.fromDeadline,
      toDeadline: req.toDeadline
    })
    return ticket
  })
})
