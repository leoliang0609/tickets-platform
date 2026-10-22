import type { Ticket, TicketInput } from '#shared/types'

export function useTickets() {
  const { data: tickets, refresh, status } = useFetch<Ticket[]>('/api/tickets', { key: 'tickets', default: () => [] })

  // ticket 變動可能影響通知（完成、改死線、審核延期…），不用等它
  const syncNotifications = () => { refreshNuxtData('notifications') }

  async function createTicket(input: TicketInput) {
    const t = await $fetch<Ticket>('/api/tickets', { method: 'POST', body: input })
    await refresh()
    syncNotifications()
    return t
  }

  async function updateTicket(id: string, patch: Partial<TicketInput>) {
    return replace(await $fetch<Ticket>(`/api/tickets/${id}`, { method: 'PATCH', body: patch }))
  }

  async function deleteTicket(id: string) {
    await $fetch(`/api/tickets/${id}`, { method: 'DELETE' })
    tickets.value = tickets.value.filter(x => x.id !== id)
    syncNotifications()
  }

  // useFetch 的 data 是 shallowRef，必須整個陣列重新指派才會觸發畫面更新
  function replace(t: Ticket) {
    tickets.value = tickets.value.map(x => x.id === t.id ? t : x)
    syncNotifications()
    return t
  }

  async function requestExtension(id: string, body: { toDeadline: string, reason: string }) {
    return replace(await $fetch<Ticket>(`/api/tickets/${id}/extensions`, { method: 'POST', body }))
  }

  async function decideExtension(id: string, extId: string, decision: 'approved' | 'rejected', note = '') {
    return replace(await $fetch<Ticket>(`/api/tickets/${id}/extensions/${extId}`, { method: 'PATCH', body: { decision, note } }))
  }

  return { tickets, status, refresh, createTicket, updateTicket, deleteTicket, requestExtension, decideExtension }
}

/** 全域「新增 Ticket」視窗；可帶入預設專案 */
export function useCreateTicket() {
  const state = useState('createTicket', () => ({ open: false, projectId: null as string | null }))
  const open = (projectId: string | null = null) => { state.value = { open: true, projectId } }
  const close = () => { state.value = { open: false, projectId: null } }
  return { state, open, close }
}

export function apiErrorMessage(err: unknown) {
  const e = err as { data?: { message?: string }, message?: string }
  return e?.data?.message || e?.message || '發生錯誤'
}
