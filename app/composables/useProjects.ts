import type { Project, ProjectInput } from '#shared/types'

export const PROJECT_COLORS = ['#7c8cff', '#b07cff', '#f472b6', '#f2706f', '#f2b84b', '#3ccf91', '#4fb3ff', '#94a3b8']

export function useProjects() {
  const { data: projects, refresh } = useFetch<Project[]>('/api/projects', { key: 'projects', default: () => [] })

  const projectById = (id: string | null | undefined) => id ? projects.value.find(p => p.id === id) : undefined

  async function createProject(input: ProjectInput) {
    const p = await $fetch<Project>('/api/projects', { method: 'POST', body: input })
    projects.value = [...projects.value, p]
    return p
  }

  async function updateProject(id: string, patch: Partial<ProjectInput>) {
    const p = await $fetch<Project>(`/api/projects/${id}`, { method: 'PATCH', body: patch })
    projects.value = projects.value.map(x => x.id === id ? p : x)
    return p
  }

  async function deleteProject(id: string) {
    await $fetch(`/api/projects/${id}`, { method: 'DELETE' })
    projects.value = projects.value.filter(x => x.id !== id)
    // 該專案的 ticket 已在伺服器端改為未分類，重新抓一次
    await refreshNuxtData('tickets')
  }

  return { projects, refresh, projectById, createProject, updateProject, deleteProject }
}
