import type { AppNotification, NotificationSettings } from '#shared/types'

export function useNotifications() {
  const { uid } = useSession()
  const { data: notifications, refresh } = useFetch<AppNotification[]>('/api/notifications', {
    key: 'notifications',
    default: () => []
  })

  const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

  async function markRead(ids: string[]) {
    if (!ids.length) return
    notifications.value = notifications.value.map(n => ids.includes(n.id) ? { ...n, read: true } : n)
    notifications.value = await $fetch<AppNotification[]>('/api/notifications/read', { method: 'POST', body: { ids } })
  }

  async function markAllRead() {
    notifications.value = await $fetch<AppNotification[]>('/api/notifications/read', { method: 'POST', body: { all: true } })
  }

  return { uid, notifications, unreadCount, refresh, markRead, markAllRead }
}

/** 需要 await：設定表單要在 SSR 時就用真正的設定初始化，否則會 hydration mismatch */
export async function useNotificationSettings() {
  const { data: settings, refresh } = await useFetch<NotificationSettings>('/api/notifications/settings', { key: 'notification-settings' })

  async function saveSettings(s: Omit<NotificationSettings, 'userId'>) {
    settings.value = await $fetch<NotificationSettings>('/api/notifications/settings', { method: 'PUT', body: s })
    // 設定會影響死線提醒，重新抓通知
    await refreshNuxtData('notifications')
    return settings.value
  }

  return { settings, refresh, saveSettings }
}

/** 相對時間：剛剛 / 5 分鐘前 / 3 小時前 / 2 天前 / 日期 */
export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return '剛剛'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`
  return iso.slice(0, 10)
}
