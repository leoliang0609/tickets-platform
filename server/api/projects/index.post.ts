import type { Project } from '#shared/types'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const userId = getCookie(event, 'uid')

  const project = await updateDb((db) => {
    const creator = requireUser(db, userId)
    const input = validateProjectInput(body)
    const p: Project = {
      id: newId('p'),
      name: input.name!,
      description: input.description ?? '',
      color: input.color!,
      createdAt: new Date().toISOString(),
      creatorId: creator.id
    }
    db.projects.push(p)
    return p
  })

  setResponseStatus(event, 201)
  return project
})
