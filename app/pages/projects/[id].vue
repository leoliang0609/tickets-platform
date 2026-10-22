<script setup lang="ts">
const route = useRoute()
const id = computed(() => String(route.params.id))

const { projects, projectById, deleteProject } = useProjects()
const { tickets } = useTickets()
const { users, currentUser } = useSession()
const { open: openCreate } = useCreateTicket()

const project = computed(() => projectById(id.value))
useHead(() => ({ title: project.value?.name ?? '專案' }))

const editing = ref(false)
const showDone = ref(false)
const sortKey = ref<SortKey>('deadline')

const projectTickets = computed(() => tickets.value.filter(t => t.projectId === id.value))

const stats = computed(() => {
  const list = projectTickets.value
  return [
    { label: '全部', value: list.length, tone: '' },
    { label: '待辦', value: list.filter(t => t.status === 'todo').length, tone: '' },
    { label: '進行中', value: list.filter(t => t.status === 'in_progress').length, tone: 'info' },
    { label: '已逾期', value: list.filter(isOverdue).length, tone: 'danger' },
    { label: '已完成', value: list.filter(t => t.status === 'done').length, tone: 'ok' }
  ]
})

// 依「被指派的人」分欄，一眼看出大家手上有哪些 ticket
const columns = computed(() => users.value.map((u) => {
  const all = projectTickets.value.filter(t => t.assigneeId === u.id)
  const visible = showDone.value ? all : all.filter(t => t.status !== 'done')
  return {
    user: u,
    tickets: sortTickets(visible, sortKey.value),
    open: all.filter(t => t.status !== 'done').length,
    done: all.filter(t => t.status === 'done').length
  }
}))

async function remove() {
  if (!project.value) return
  const n = projectTickets.value.length
  const msg = n
    ? `確定要刪除「${project.value.name}」嗎？\n底下的 ${n} 個 ticket 不會被刪除，會改為「未分類」。`
    : `確定要刪除「${project.value.name}」嗎？`
  if (!confirm(msg)) return
  await deleteProject(id.value)
  navigateTo('/projects')
}
</script>

<template>
  <div>
    <NuxtLink to="/projects" class="back">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m15 18-6-6 6-6" /></svg>
      所有專案
    </NuxtLink>

    <div v-if="!project && !projects.length" class="empty">載入中…</div>
    <div v-else-if="!project" class="empty">找不到這個專案，可能已被刪除。</div>

    <template v-else>
      <section class="head card" :style="{ '--c': project.color }">
        <div class="head-main">
          <span class="p-icon">{{ project.name.slice(0, 1) }}</span>
          <div class="head-text">
            <h1>{{ project.name }}</h1>
            <p class="desc">{{ project.description || '沒有說明' }}</p>
          </div>
        </div>
        <div class="head-actions">
          <button class="btn btn-primary" @click="openCreate(project.id)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M12 5v14M5 12h14" /></svg>
            在此專案新增 Ticket
          </button>
          <button class="btn" @click="editing = true">編輯</button>
          <button class="btn btn-danger" @click="remove">刪除</button>
        </div>
        <div class="stats">
          <div v-for="s in stats" :key="s.label" class="stat" :class="s.tone && `stat-${s.tone}`">
            <span class="stat-value">{{ s.value }}</span>
            <span class="stat-label">{{ s.label }}</span>
          </div>
        </div>
      </section>

      <section class="toolbar">
        <h2>成員的 Ticket</h2>
        <div class="tools">
          <label class="toggle">
            <input v-model="showDone" type="checkbox" class="checkbox">
            顯示已完成
          </label>
          <select v-model="sortKey" class="select" aria-label="排序">
            <option value="deadline">依死線</option>
            <option value="priority">依優先度</option>
            <option value="createdAt">依建立時間</option>
          </select>
          <NuxtLink :to="`/?project=${project.id}`" class="btn">在所有 Ticket 中篩選</NuxtLink>
        </div>
      </section>

      <section class="columns">
        <div v-for="col in columns" :key="col.user.id" class="column">
          <header class="col-head">
            <UserAvatar :user="col.user" :size="28" />
            <div>
              <div class="col-name">
                {{ col.user.name }}
                <span v-if="col.user.id === currentUser?.id" class="me">我</span>
              </div>
              <div class="col-meta">{{ col.open }} 未完成 · {{ col.done }} 已完成</div>
            </div>
          </header>
          <div v-if="!col.tickets.length" class="empty col-empty">
            {{ col.open || col.done ? '沒有未完成的 ticket 🎉' : '目前沒有 ticket' }}
          </div>
          <div v-else class="col-list">
            <TicketCard v-for="t in col.tickets" :key="t.id" :ticket="t" :show-project="false" />
          </div>
        </div>
      </section>
    </template>

    <ProjectFormModal v-if="editing && project" :project="project" @close="editing = false" @saved="editing = false" />
  </div>
</template>

<style scoped>
.back { display: inline-flex; align-items: center; gap: 4px; margin-bottom: 18px; color: var(--muted); font-size: 13px; }
.back:hover { color: var(--text); }

.head {
  position: relative; overflow: hidden; padding: 24px;
  display: grid; grid-template-columns: 1fr auto; gap: 20px 24px; align-items: start;
}
.head::before { content: ''; position: absolute; inset: 0 0 auto; height: 3px; background: var(--c); }
.head-main { display: flex; gap: 16px; min-width: 0; }
.p-icon {
  flex: none; display: grid; place-items: center; width: 48px; height: 48px; border-radius: 12px;
  font-weight: 700; font-size: 20px; color: var(--c);
  background: color-mix(in srgb, var(--c) 16%, transparent);
}
.head-text { min-width: 0; }
h1 { margin: 0 0 4px; font-size: 24px; font-weight: 700; }
.desc { margin: 0; color: var(--text-2); white-space: pre-wrap; }
.head-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }

.stats { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(5, 1fr); gap: 1px; background: var(--border); border-radius: var(--radius-sm); overflow: hidden; }
.stat { display: flex; flex-direction: column; padding: 10px 14px; background: var(--bg-elev); }
.stat-value { font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.25; }
.stat-label { font-size: 12px; color: var(--muted); }
.stat-info .stat-value { color: var(--info); }
.stat-danger .stat-value { color: var(--danger); }
.stat-ok .stat-value { color: var(--ok); }

.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin: 28px 0 14px; }
.toolbar h2 { margin: 0; font-size: 16px; font-weight: 600; }
.tools { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.tools .select { width: auto; min-width: 120px; }
.toggle { display: flex; align-items: center; gap: 8px; margin-right: 4px; color: var(--text-2); cursor: pointer; font-size: 13px; }

.columns { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; align-items: start; }
.column { background: var(--bg-elev); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; }
.col-head { display: flex; align-items: center; gap: 10px; padding: 2px 2px 14px; }
.col-name { display: flex; align-items: center; gap: 6px; font-weight: 600; }
.col-meta { font-size: 12px; color: var(--muted); }
.me { font-size: 11px; padding: 0 6px; border-radius: 4px; background: var(--accent-soft); color: var(--accent); font-weight: 500; }
.col-list { display: flex; flex-direction: column; gap: 10px; }
.col-empty { padding: 32px 16px; }

@media (max-width: 760px) {
  .head { grid-template-columns: 1fr; }
  .head-actions { justify-content: flex-start; }
  .stats { grid-template-columns: repeat(3, 1fr); }
}
</style>
