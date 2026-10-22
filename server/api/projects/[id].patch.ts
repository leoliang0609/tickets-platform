export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const userId = getCookie(event, 'uid')

  return updateDb((db) => {
    requireUser(db, userId)
    const project = db.projects.find(p => p.id === id)
    if (!project) throw createError({ statusCode: 404, message: '找不到這個專案' })
    Object.assign(project, validateProjectInput(body, true))
    return project
  })
})
