<script setup lang="ts">
import type { Ticket } from '#shared/types'

const { uid, users, currentUser } = useSession()
const { state: createState, open: openCreate, close: closeCreate } = useCreateTicket()
const route = useRoute()

// 在專案頁按「新增 Ticket」時，預設歸屬該專案
function onCreateClick() {
  openCreate(route.name === 'projects-id' ? String(route.params.id) : null)
}

function onCreated(t: Ticket) {
  closeCreate()
  navigateTo(`/tickets/${t.id}`)
}

const isTickets = computed(() => route.path === '/' || route.path.startsWith('/tickets'))
const isProjects = computed(() => route.path.startsWith('/projects'))
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <div class="container bar">
        <NuxtLink to="/" class="brand">
          <span class="logo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 9a2 2 0 0 0 2-2V5h14v2a2 2 0 0 0 0 4v2a2 2 0 0 0 0 4v2H5v-2a2 2 0 0 0 0-4V9Z" /><path d="M9 9h6M9 13h6" /></svg>
          </span>
          Tickets
        </NuxtLink>

        <nav class="nav">
          <NuxtLink to="/" class="nav-link" :class="{ active: isTickets }">所有 Ticket</NuxtLink>
          <NuxtLink to="/projects" class="nav-link" :class="{ active: isProjects }">專案</NuxtLink>
          <NuxtLink to="/guide" class="nav-link" active-class="active">使用教學</NuxtLink>
        </nav>

        <div class="right">
          <div class="switcher" role="group" aria-label="切換使用者">
            <span class="switch-label">目前身分</span>
            <button
              v-for="u in users"
              :key="u.id"
              class="switch-btn"
              :class="{ active: u.id === currentUser?.id }"
              @click="uid = u.id"
            >
              <UserAvatar :user="u" :size="20" />
              {{ u.name }}
            </button>
          </div>
          <NotificationBell />
          <button class="btn btn-primary" aria-label="新增 Ticket" @click="onCreateClick">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M12 5v14M5 12h14" /></svg>
            <span class="new-label">新增 Ticket</span>
          </button>
        </div>
      </div>
    </header>

    <main class="container main">
      <NuxtPage />
    </main>

    <TicketFormModal
      v-if="createState.open"
      :default-project-id="createState.projectId"
      @close="closeCreate"
      @saved="onCreated"
    />
  </div>
</template>

<style scoped>
.shell { min-height: 100vh; }
.topbar {
  position: sticky; top: 0; z-index: 20;
  background: rgba(11, 14, 20, .82); backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
}
.bar { height: 60px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 16px; letter-spacing: .01em; }
.logo {
  display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px;
  background: linear-gradient(135deg, var(--accent), #b07cff); color: #0b0e14;
}
.nav { display: flex; gap: 4px; margin-right: auto; margin-left: 12px; }
.nav-link {
  height: 32px; padding: 0 12px; display: inline-flex; align-items: center; white-space: nowrap;
  border-radius: var(--radius-sm); color: var(--text-2); font-weight: 500;
}
.nav-link:hover { color: var(--text); background: var(--surface); }
.nav-link.active { color: var(--text); background: var(--surface-2); }
.right { display: flex; align-items: center; gap: 10px; }
.switcher {
  display: flex; align-items: center; gap: 2px; padding: 3px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
}
.switch-label { padding: 0 8px 0 6px; font-size: 12px; color: var(--muted); }
.switch-btn {
  display: flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px 0 4px;
  border: 0; border-radius: 7px; background: transparent; color: var(--text-2);
  font: inherit; font-size: 13px; cursor: pointer;
}
.switch-btn:hover { color: var(--text); }
.switch-btn.active { background: var(--surface-2); color: var(--text); box-shadow: inset 0 0 0 1px var(--border-strong); }
.main { padding-top: 28px; padding-bottom: 64px; }
/* 窄螢幕：導覽連結移到第二列 */
@media (max-width: 880px) {
  .bar { height: auto; flex-wrap: wrap; padding-top: 10px; padding-bottom: 8px; row-gap: 8px; }
  .nav { order: 3; width: 100%; margin: 0 -4px; overflow-x: auto; }
  .main { padding-top: 22px; }
}
@media (max-width: 640px) {
  .switch-label { display: none; }
  .brand { font-size: 0; gap: 0; }
  .nav-link { padding: 0 10px; }
}
@media (max-width: 420px) {
  .new-label { display: none; }
  .right { gap: 6px; }
}
</style>
