<script setup lang="ts">
import type { AppNotification } from '#shared/types'

const { uid, notifications, unreadCount, refresh, markRead, markAllRead } = useNotifications()
const { refresh: refreshTickets } = useTickets()

const open = ref(false)
const onlyUnread = ref(false)
const root = ref<HTMLElement>()

const list = computed(() => (onlyUnread.value ? notifications.value.filter(n => !n.read) : notifications.value).slice(0, 30))

function openItem(n: AppNotification) {
  markRead([n.id])
  open.value = false
  navigateTo(`/tickets/${n.ticketId}`)
}

// 切換使用者時重新抓（flush: post 確保 cookie 已更新）
watch(uid, () => refresh(), { flush: 'post' })

// 沒有即時推播，先每 30 秒輪詢一次；別人建立的 ticket 也一併更新
let timer: ReturnType<typeof setInterval> | undefined
function onDocClick(e: MouseEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}
onMounted(() => {
  timer = setInterval(() => { refresh(); refreshTickets() }, 30_000)
  document.addEventListener('mousedown', onDocClick)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  document.removeEventListener('mousedown', onDocClick)
  document.removeEventListener('keydown', onKey)
})

const route = useRoute()
watch(() => route.fullPath, () => { open.value = false })
</script>

<template>
  <div ref="root" class="bell-wrap">
    <button class="bell btn btn-ghost btn-icon" :class="{ active: open }" aria-label="通知" @click="open = !open; if (open) refresh()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
      <span v-if="unreadCount" class="count">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </button>

    <div v-if="open" class="panel card">
      <header>
        <h3>通知</h3>
        <div class="head-actions">
          <button class="btn btn-ghost btn-sm" :class="{ on: onlyUnread }" @click="onlyUnread = !onlyUnread">只看未讀</button>
          <button class="btn btn-ghost btn-sm" :disabled="!unreadCount" @click="markAllRead">全部已讀</button>
        </div>
      </header>

      <div class="list">
        <NotificationItem v-for="n in list" :key="n.id" :n="n" @open="openItem" />
        <div v-if="!list.length" class="none">{{ onlyUnread ? '沒有未讀通知' : '目前沒有通知' }}</div>
      </div>

      <footer>
        <NuxtLink to="/notifications" class="foot-link">查看全部</NuxtLink>
        <NuxtLink to="/notifications#settings" class="foot-link">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-.66 0-1.25.4-1.51 1Z" /></svg>
          通知設定
        </NuxtLink>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.bell-wrap { position: relative; }
.bell { position: relative; width: 36px; height: 36px; }
.bell.active { background: var(--surface-2); color: var(--text); }
.count {
  position: absolute; top: 2px; right: 1px; min-width: 17px; height: 17px; padding: 0 4px;
  display: grid; place-items: center; border-radius: 999px;
  background: var(--danger); color: #fff; font-size: 10px; font-weight: 700;
  box-shadow: 0 0 0 2px var(--bg);
}
.panel {
  position: absolute; top: calc(100% + 8px); right: 0; z-index: 40;
  width: 400px; max-width: calc(100vw - 24px); max-height: min(560px, calc(100vh - 90px));
  display: flex; flex-direction: column; box-shadow: var(--shadow);
}
header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--border); }
h3 { margin: 0; font-size: 15px; }
.head-actions { display: flex; gap: 2px; }
.head-actions .on { color: var(--accent); background: var(--accent-soft); }
.list { overflow-y: auto; padding: 6px; }
.none { padding: 40px 16px; text-align: center; color: var(--muted); }
footer { display: flex; justify-content: space-between; padding: 10px 14px; border-top: 1px solid var(--border); }
.foot-link { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; color: var(--accent); }
.foot-link:hover { text-decoration: underline; }
@media (max-width: 640px) {
  .panel { position: fixed; top: 64px; right: 12px; left: 12px; width: auto; }
}
</style>
