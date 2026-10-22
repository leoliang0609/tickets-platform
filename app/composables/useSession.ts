import type { User } from '#shared/types'

/**
 * 目前沒有登入系統，用 cookie 記住「現在是哪個使用者」。
 * 之後接到管理平台時，把這裡換成真正的登入資訊即可。
 */
export function useSession() {
  const uid = useCookie<string>('uid', { default: () => 'u1', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 })
  const { data: users } = useFetch<User[]>('/api/users', { key: 'users', default: () => [] })

  const currentUser = computed(() => users.value.find(u => u.id === uid.value) ?? users.value[0])
  const userById = (id: string) => users.value.find(u => u.id === id)

  return { uid, users, currentUser, userById }
}
