<script setup lang="ts">
import type { AppNotification, NotificationKind } from '#shared/types'

useHead({ title: '通知' })

const { uid, currentUser } = useSession()
const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
const { projects } = useProjects()
const { settings, refresh: refreshSettings, saveSettings } = await useNotificationSettings()

type Filter = 'all' | 'unread' | 'extension' | 'deadline' | 'assigned'
const filter = ref<Filter>('all')
const FILTER_KINDS: Record<Filter, NotificationKind[] | null> = {
  all: null,
  unread: null,
  extension: ['extension_requested', 'extension_decided'],
  deadline: ['due_soon', 'overdue'],
  assigned: ['ticket_assigned']
}
const filters: { key: Filter, label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'unread', label: '未讀' },
  { key: 'extension', label: '延期' },
  { key: 'deadline', label: '死線提醒' },
  { key: 'assigned', label: '指派' }
]

const list = computed(() => notifications.value.filter((n) => {
  if (filter.value === 'unread') return !n.read
  const kinds = FILTER_KINDS[filter.value]
  return !kinds || kinds.includes(n.kind)
}))

function openItem(n: AppNotification) {
  markRead([n.id])
  navigateTo(`/tickets/${n.ticketId}`)
}

// ---- 設定表單 ----
const form = reactive({ myTickets: true, projectIds: [] as string[], dueSoonDays: 3, overdue: true })
const saving = ref(false)
const savedMsg = ref('')
const errorMsg = ref('')

watch(settings, (s) => {
  if (!s) return
  Object.assign(form, { myTickets: s.myTickets, projectIds: [...s.projectIds], dueSoonDays: s.dueSoonDays, overdue: s.overdue })
}, { immediate: true })
watch(uid, () => refreshSettings(), { flush: 'post' })

const dirty = computed(() => {
  const s = settings.value
  if (!s) return false
  return s.myTickets !== form.myTickets || s.dueSoonDays !== form.dueSoonDays || s.overdue !== form.overdue
    || [...s.projectIds].sort().join() !== [...form.projectIds].sort().join()
})

function toggleProject(id: string) {
  form.projectIds = form.projectIds.includes(id) ? form.projectIds.filter(x => x !== id) : [...form.projectIds, id]
}

async function save() {
  saving.value = true
  errorMsg.value = ''
  try {
    await saveSettings({ ...form })
    savedMsg.value = '已儲存，死線提醒已重新計算'
    setTimeout(() => (savedMsg.value = ''), 2500)
  }
  catch (e) {
    errorMsg.value = apiErrorMessage(e)
  }
  finally {
    saving.value = false
  }
}

const DAY_OPTIONS = [0, 1, 2, 3, 5, 7, 14]
</script>

<template>
  <div class="layout">
    <section>
      <div class="head">
        <div>
          <h1>通知</h1>
          <p class="sub">{{ currentUser?.name }}，你有 {{ unreadCount }} 則未讀通知</p>
        </div>
        <button class="btn" :disabled="!unreadCount" @click="markAllRead">全部標為已讀</button>
      </div>

      <div class="tabs">
        <button v-for="f in filters" :key="f.key" class="tab" :class="{ active: filter === f.key }" @click="filter = f.key">
          {{ f.label }}
        </button>
      </div>

      <div class="card list">
        <NotificationItem v-for="n in list" :key="n.id" :n="n" @open="openItem" />
        <div v-if="!list.length" class="none">沒有通知</div>
      </div>
    </section>

    <aside id="settings" class="card settings">
      <h2>通知設定</h2>
      <p class="desc">「指派」與「延期」相關的通知一律會送出；下面設定的是<b>死線提醒</b>。</p>

      <div class="group">
        <h3>提醒範圍</h3>
        <label class="opt">
          <input v-model="form.myTickets" type="checkbox" class="checkbox">
          <span>
            指派給我的 ticket
            <small>不分專案，只要是我負責的都會提醒</small>
          </span>
        </label>
      </div>

      <div class="group">
        <h3>關注的專案</h3>
        <p class="hint">勾選後，該專案中<b>所有人</b>的 ticket 快到期或逾期都會通知你。</p>
        <div v-if="projects.length" class="projects">
          <label v-for="p in projects" :key="p.id" class="opt project" :style="{ '--c': p.color }">
            <input type="checkbox" class="checkbox" :checked="form.projectIds.includes(p.id)" @change="toggleProject(p.id)">
            <span class="p-dot" />
            <span>{{ p.name }}</span>
          </label>
        </div>
        <p v-else class="hint">還沒有專案</p>
      </div>

      <div class="group">
        <h3>提醒時機</h3>
        <label class="row">
          <span>快到期</span>
          <select v-model.number="form.dueSoonDays" class="select">
            <option v-for="d in DAY_OPTIONS" :key="d" :value="d">{{ d === 0 ? '只在當天提醒' : `到期前 ${d} 天` }}</option>
          </select>
        </label>
        <label class="opt">
          <input v-model="form.overdue" type="checkbox" class="checkbox">
          <span>已逾期也要提醒</span>
        </label>
      </div>

      <div class="save">
        <span v-if="savedMsg" class="tone-ok msg">{{ savedMsg }}</span>
        <span v-else-if="errorMsg" class="form-error msg">{{ errorMsg }}</span>
        <button class="btn btn-primary" :disabled="saving || !dirty" @click="save">{{ saving ? '儲存中…' : '儲存設定' }}</button>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 24px; align-items: start; }
.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
h1 { margin: 0 0 4px; font-size: 26px; font-weight: 700; }
.sub { margin: 0; color: var(--muted); }

.tabs { display: flex; gap: 4px; margin-bottom: 12px; flex-wrap: wrap; }
.tab {
  height: 32px; padding: 0 12px; border: 0; border-radius: var(--radius-sm);
  background: transparent; color: var(--text-2); font: inherit; font-weight: 500; cursor: pointer;
}
.tab:hover { background: var(--surface); color: var(--text); }
.tab.active { background: var(--accent-soft); color: var(--accent); }

.list { padding: 6px; }
.none { padding: 48px 16px; text-align: center; color: var(--muted); }

.settings { padding: 20px; position: sticky; top: 80px; scroll-margin-top: 80px; }
.settings h2 { margin: 0 0 4px; font-size: 16px; }
.desc { margin: 0; font-size: 12px; color: var(--muted); }
.desc b, .hint b { color: var(--text-2); font-weight: 600; }
.group { margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 10px; }
.group h3 { margin: 0; font-size: 12px; font-weight: 600; letter-spacing: .06em; color: var(--muted); }
.hint { margin: -4px 0 0; font-size: 12px; color: var(--muted); }
.opt { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 13px; }
.opt small { display: block; font-size: 12px; color: var(--muted); }
.projects { display: flex; flex-direction: column; gap: 2px; }
.project { align-items: center; padding: 6px 8px; margin: 0 -8px; border-radius: var(--radius-sm); }
.project:hover { background: var(--surface-2); }
.p-dot { width: 8px; height: 8px; border-radius: 2px; background: var(--c); }
.row { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 13px; }
.row .select { width: 160px; }
.save { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 20px; }
.msg { font-size: 12px; }

@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
  .settings { position: static; }
}
</style>
