<script setup lang="ts">
import type { TicketStatus } from '#shared/types'

useHead({ title: 'Tickets' })

const { currentUser } = useSession()
const { tickets, status } = useTickets()
const { projects } = useProjects()
const route = useRoute()
const router = useRouter()

// 專案篩選同步到網址 (?project=xxx)，專案頁可以直接連過來；'none' 代表未分類
const projectFilter = computed({
  get: () => typeof route.query.project === 'string' ? route.query.project : '',
  set: (v: string) => router.replace({ query: { ...route.query, project: v || undefined } })
})

type Scope = 'all' | 'mine' | 'created'
const scope = ref<Scope>('all')
const statusFilter = ref<TicketStatus | 'active' | ''>('')
const keyword = ref('')
const sortKey = ref<SortKey>('deadline')

const me = computed(() => currentUser.value?.id)

const scopeTabs = computed(() => [
  { key: 'all' as const, label: '全部', count: tickets.value.length },
  { key: 'mine' as const, label: '指派給我', count: tickets.value.filter(t => t.assigneeId === me.value).length },
  { key: 'created' as const, label: '我建立的', count: tickets.value.filter(t => t.creatorId === me.value).length }
])

// 「我的待辦」統計：只看指派給目前使用者的
const stats = computed(() => {
  const mine = tickets.value.filter(t => t.assigneeId === me.value)
  return [
    { label: '待辦', value: mine.filter(t => t.status === 'todo').length, tone: 'muted' },
    { label: '進行中', value: mine.filter(t => t.status === 'in_progress').length, tone: 'info' },
    { label: '已逾期', value: mine.filter(isOverdue).length, tone: 'danger' },
    { label: '已完成', value: mine.filter(t => t.status === 'done').length, tone: 'ok' }
  ]
})

// 我建立的 ticket 中，等我審核的延期申請
const approvals = computed(() => tickets.value.flatMap((t) => {
  const r = t.creatorId === me.value ? pendingExtension(t) : undefined
  return r ? [{ ticket: t, request: r }] : []
}))

// 輸入完整編號（TK-7F3K9Q、tk7f3k9q、7F3K9Q）時，對應的那張 ticket
const codeHit = computed(() => keyword.value.trim() ? findTicketByIdOrCode(tickets.value, keyword.value) : undefined)

const visible = computed(() => {
  const list = tickets.value.filter((t) => {
    if (scope.value === 'mine' && t.assigneeId !== me.value) return false
    if (scope.value === 'created' && t.creatorId !== me.value) return false
    if (projectFilter.value === 'none' && t.projectId !== null) return false
    if (projectFilter.value && projectFilter.value !== 'none' && t.projectId !== projectFilter.value) return false
    if (statusFilter.value === 'active' && t.status === 'done') return false
    if (statusFilter.value && statusFilter.value !== 'active' && t.status !== statusFilter.value) return false
    return matchesKeyword(t, keyword.value)
  })
  const sorted = sortTickets(list, sortKey.value)
  // 編號完全相符的排第一個
  const hit = codeHit.value
  return hit && sorted.includes(hit) ? [hit, ...sorted.filter(t => t !== hit)] : sorted
})

// 搜尋的編號存在，但被目前的分頁或篩選條件擋掉
const hiddenHit = computed(() => codeHit.value && !visible.value.includes(codeHit.value) ? codeHit.value : undefined)

function onSearchEnter() {
  if (codeHit.value) navigateTo(`/tickets/${codeHit.value.code}`)
}
</script>

<template>
  <div>
    <section class="hero">
      <div>
        <h1>嗨，{{ currentUser?.name }}</h1>
        <p class="sub">這是目前所有的 ticket，上方數字是指派給你的工作。</p>
      </div>
      <div class="stats">
        <div v-for="s in stats" :key="s.label" class="stat card" :class="`stat-${s.tone}`">
          <span class="stat-value">{{ s.value }}</span>
          <span class="stat-label">{{ s.label }}</span>
        </div>
      </div>
    </section>

    <section v-if="approvals.length" class="approvals card">
      <div class="ap-title">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
        {{ approvals.length }} 個延期申請等你審核
      </div>
      <ul>
        <li v-for="a in approvals" :key="a.request.id">
          <NuxtLink :to="`/tickets/${a.ticket.id}`">
            <span class="ap-name">{{ a.ticket.code }} {{ a.ticket.title }}</span>
            <span class="ap-range">{{ a.request.fromDeadline }} → {{ a.request.toDeadline }}</span>
            <span class="ap-go">審核 →</span>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <section class="toolbar">
      <div class="tabs" role="tablist">
        <button
          v-for="tab in scopeTabs"
          :key="tab.key"
          role="tab"
          class="tab"
          :class="{ active: scope === tab.key }"
          :aria-selected="scope === tab.key"
          @click="scope = tab.key"
        >
          {{ tab.label }}<span class="count">{{ tab.count }}</span>
        </button>
      </div>

      <div class="filters">
        <div class="search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input
            v-model="keyword"
            class="input"
            placeholder="搜尋編號、標題、內容"
            title="輸入完整編號（例如 TK-7F3K9Q）後按 Enter 直接打開"
            @keydown.enter="onSearchEnter"
          >
        </div>
        <select v-model="projectFilter" class="select" aria-label="專案">
          <option value="">所有專案</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
          <option value="none">未分類</option>
        </select>
        <select v-model="statusFilter" class="select" aria-label="狀態">
          <option value="">所有狀態</option>
          <option value="active">未完成</option>
          <option value="todo">待辦</option>
          <option value="in_progress">進行中</option>
          <option value="done">已完成</option>
        </select>
        <select v-model="sortKey" class="select" aria-label="排序">
          <option value="deadline">依死線</option>
          <option value="priority">依優先度</option>
          <option value="createdAt">依建立時間</option>
        </select>
      </div>
    </section>

    <div v-if="hiddenHit" class="hidden-hit">
      {{ hiddenHit.code }}「{{ hiddenHit.title }}」不在目前的分頁或篩選條件中，
      <NuxtLink :to="`/tickets/${hiddenHit.code}`">直接打開 →</NuxtLink>
    </div>

    <div v-if="status === 'pending' && !tickets.length" class="empty">載入中…</div>
    <div v-else-if="!visible.length" class="empty">沒有符合條件的 ticket</div>
    <section v-else class="grid">
      <TicketCard v-for="t in visible" :key="t.id" :ticket="t" />
    </section>
  </div>
</template>

<style scoped>
.hero { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; flex-wrap: wrap; margin-bottom: 28px; }
h1 { margin: 0 0 4px; font-size: 26px; font-weight: 700; letter-spacing: -.01em; }
.sub { margin: 0; color: var(--muted); }

.stats { display: grid; grid-template-columns: repeat(4, minmax(96px, 1fr)); gap: 10px; }
.stat { display: flex; flex-direction: column; padding: 12px 16px; }
.stat-value { font-size: 24px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.2; }
.stat-label { font-size: 12px; color: var(--muted); }
.stat-info .stat-value { color: var(--info); }
.stat-danger .stat-value { color: var(--danger); }
.stat-ok .stat-value { color: var(--ok); }

.approvals { margin-bottom: 22px; padding: 14px 16px; border-color: rgba(242, 184, 75, .4); background: linear-gradient(var(--warn-soft), var(--warn-soft)), var(--surface); }
.ap-title { display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--warn); margin-bottom: 8px; }
.approvals ul { list-style: none; margin: 0; padding: 0; }
.approvals a { display: flex; align-items: center; gap: 12px; padding: 7px 8px; margin: 0 -8px; border-radius: var(--radius-sm); }
.approvals a:hover { background: rgba(255, 255, 255, .04); }
.ap-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ap-range { font-size: 12px; color: var(--text-2); font-variant-numeric: tabular-nums; }
.ap-go { font-size: 12px; font-weight: 600; color: var(--warn); }

.toolbar {
  display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid var(--border);
}
.tabs { display: flex; gap: 4px; }
.tab {
  display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 12px;
  border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--text-2);
  font: inherit; font-weight: 500; cursor: pointer;
}
.tab:hover { background: var(--surface); color: var(--text); }
.tab.active { background: var(--accent-soft); color: var(--accent); }
.count {
  min-width: 20px; height: 18px; padding: 0 6px; border-radius: 999px;
  background: var(--surface-2); color: var(--text-2); font-size: 11px; font-weight: 600;
  display: inline-grid; place-items: center;
}
.tab.active .count { background: var(--accent); color: #0b0e14; }

.filters { display: flex; gap: 8px; flex-wrap: wrap; }
.filters .select { width: auto; min-width: 120px; }
.search { position: relative; width: 220px; }
.search svg { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none; }
.search .input { padding-left: 34px; }

.hidden-hit {
  margin-bottom: 14px; padding: 10px 14px; border-radius: var(--radius-sm);
  background: var(--surface); border: 1px solid var(--border); color: var(--text-2); font-size: 13px;
}
.hidden-hit a { color: var(--accent); font-weight: 600; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }

@media (max-width: 760px) {
  .stats { grid-template-columns: repeat(2, 1fr); width: 100%; }
  .filters, .search { width: 100%; }
  .filters .select { flex: 1; }
}
</style>
