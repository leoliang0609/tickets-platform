<script setup lang="ts">
import type { TicketStatus } from '#shared/types'

const route = useRoute()
const id = computed(() => String(route.params.id))

const { userById, currentUser } = useSession()
const { tickets, status, updateTicket, deleteTicket, decideExtension } = useTickets()

// 網址可以是 id 或編號（/tickets/t_xxx 或 /tickets/TK-7F3K9Q，大小寫皆可）
const ticket = computed(() => findTicketByIdOrCode(tickets.value, id.value))
// 呼叫 API 一律用真正的 id
const ticketId = computed(() => ticket.value?.id ?? id.value)
useHead(() => ({ title: ticket.value ? `${ticket.value.code} ${ticket.value.title}` : 'Ticket' }))

async function copyCode() {
  if (!ticket.value) return
  try {
    await navigator.clipboard.writeText(ticket.value.code)
    notify(`已複製 ${ticket.value.code}`)
  }
  catch {
    notify('無法存取剪貼簿，請手動選取編號複製', true)
  }
}

const editing = ref(false)
const requesting = ref(false)
const decisionNote = ref('')
const deciding = ref(false)

const isCreator = computed(() => ticket.value?.creatorId === currentUser.value?.id)
const pending = computed(() => ticket.value ? pendingExtension(ticket.value) : undefined)
const history = computed(() => (ticket.value?.extensionRequests ?? []).filter(r => r.status !== 'pending').reverse())
// 被指派者（且不是建立者）才需要走延期申請
const canRequest = computed(() => {
  const t = ticket.value
  return !!t && t.assigneeId === currentUser.value?.id && !isCreator.value && t.status !== 'done' && !!t.deadline && !pending.value
})

async function decide(decision: 'approved' | 'rejected') {
  if (!pending.value) return
  deciding.value = true
  try {
    await decideExtension(ticketId.value, pending.value.id, decision, decisionNote.value)
    decisionNote.value = ''
    notify(decision === 'approved' ? '已核准，死線已更新' : '已駁回申請')
  }
  catch (e) {
    notify(apiErrorMessage(e), true)
  }
  finally {
    deciding.value = false
  }
}
const toast = ref<{ msg: string, error?: boolean } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | undefined

function notify(msg: string, error = false) {
  toast.value = { msg, error }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = null), 2200)
}

const progress = computed(() => ticket.value ? subtaskProgress(ticket.value) : { done: 0, total: 0, pct: 0 })
const due = computed(() => ticket.value ? deadlineInfo(ticket.value) : null)

async function save(patch: Parameters<typeof updateTicket>[1]) {
  try {
    await updateTicket(ticketId.value, patch)
  }
  catch (e) {
    notify(apiErrorMessage(e), true)
  }
}

function setStatus(s: TicketStatus) {
  save({ status: s })
}

function toggleSubtask(subId: string) {
  if (!ticket.value) return
  const subtasks = ticket.value.subtasks.map(s => s.id === subId ? { ...s, done: !s.done } : s)
  save({ subtasks })
}

async function remove() {
  if (!confirm('確定要刪除這個 ticket 嗎？')) return
  try {
    await deleteTicket(ticketId.value)
    navigateTo('/')
  }
  catch (e) {
    notify(apiErrorMessage(e), true)
  }
}

const STATUS_OPTIONS: TicketStatus[] = ['todo', 'in_progress', 'done']
</script>

<template>
  <div>
    <NuxtLink to="/" class="back">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m15 18-6-6 6-6" /></svg>
      所有 Ticket
    </NuxtLink>

    <div v-if="status === 'pending' && !ticket" class="empty">載入中…</div>
    <div v-else-if="!ticket" class="empty">找不到這個 ticket，可能已被刪除。</div>

    <div v-else class="layout">
      <article class="main card">
        <div class="head">
          <div class="head-tags">
            <span class="badge" :class="`badge-${ticket.status}`">{{ STATUS_LABEL[ticket.status] }}</span>
            <span class="prio" :class="`prio-${ticket.priority}`">優先度 {{ PRIORITY_LABEL[ticket.priority] }}</span>
            <button class="tid" title="複製編號，可貼到 commit 訊息" @click="copyCode">
              {{ ticket.code }}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
            </button>
          </div>
          <div class="head-actions">
            <button class="btn btn-sm" @click="editing = true">編輯</button>
            <button class="btn btn-sm btn-danger" @click="remove">刪除</button>
          </div>
        </div>

        <h1>{{ ticket.title }}</h1>

        <section class="block">
          <h2>詳細內容</h2>
          <p v-if="ticket.description" class="desc">{{ ticket.description }}</p>
          <p v-else class="desc placeholder">沒有填寫詳細內容</p>
        </section>

        <section class="block">
          <div class="block-head">
            <h2>子項目</h2>
            <span v-if="progress.total" class="muted">{{ progress.done }} / {{ progress.total }} 完成</span>
          </div>
          <div v-if="progress.total" class="progress" :class="{ 'is-done': progress.pct === 100 }">
            <span :style="{ width: `${progress.pct}%` }" />
          </div>
          <!-- 這裡只能勾選完成；新增、修改、刪除子項目請到「編輯」 -->
          <ul v-if="ticket.subtasks.length" class="subs">
            <li v-for="s in ticket.subtasks" :key="s.id" :class="{ done: s.done }">
              <label>
                <input type="checkbox" class="checkbox" :checked="s.done" @change="toggleSubtask(s.id)">
                <span>{{ s.title }}</span>
              </label>
            </li>
          </ul>
          <p v-else class="desc placeholder">
            沒有子項目，<button class="link-btn" @click="editing = true">到編輯中新增</button>
          </p>
        </section>
      </article>

      <aside class="side">
        <div class="card panel">
          <h2>狀態</h2>
          <div class="status-group">
            <button
              v-for="s in STATUS_OPTIONS"
              :key="s"
              class="status-btn"
              :class="[`s-${s}`, { active: ticket.status === s }]"
              @click="setStatus(s)"
            >{{ STATUS_LABEL[s] }}</button>
          </div>
        </div>

        <div class="card panel">
          <h2>死線</h2>
          <div class="deadline">
            <span class="deadline-date" :class="{ none: !ticket.deadline }">{{ ticket.deadline ?? '無死線' }}</span>
            <span v-if="due && ticket.deadline && due.text !== ticket.deadline" :class="`tone-${due.tone}`" class="due-note">{{ due.text }}</span>
          </div>

          <div v-if="pending" class="ext-pending">
            <div class="ext-title">
              <UserAvatar :user="userById(pending.requesterId)" :size="18" />
              {{ userById(pending.requesterId)?.name }} 申請延期
            </div>
            <div class="ext-range">{{ pending.fromDeadline }} → <b>{{ pending.toDeadline }}</b></div>
            <p class="ext-reason">{{ pending.reason }}</p>
            <div class="ext-time">{{ formatDateTime(pending.createdAt) }}</div>

            <template v-if="isCreator">
              <textarea v-model="decisionNote" class="textarea ext-note" placeholder="回覆（選填）" />
              <div class="ext-actions">
                <button class="btn btn-sm btn-danger" :disabled="deciding" @click="decide('rejected')">駁回</button>
                <button class="btn btn-sm btn-primary" :disabled="deciding" @click="decide('approved')">核准延期</button>
              </div>
            </template>
            <div v-else class="ext-wait">等待 {{ userById(ticket.creatorId)?.name }} 審核中</div>
          </div>

          <button v-else-if="canRequest" class="btn btn-sm ext-btn" @click="requesting = true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
            申請延期
          </button>

          <details v-if="history.length" class="ext-history">
            <summary>延期紀錄（{{ history.length }}）</summary>
            <ul>
              <li v-for="r in history" :key="r.id">
                <div class="h-head">
                  <span class="h-status" :class="r.status">{{ r.status === 'approved' ? '已核准' : '已駁回' }}</span>
                  <span>{{ r.fromDeadline }} → {{ r.toDeadline }}</span>
                </div>
                <p class="h-reason">{{ userById(r.requesterId)?.name }}：{{ r.reason }}</p>
                <p v-if="r.note" class="h-reason">{{ userById(r.deciderId ?? '')?.name }}：{{ r.note }}</p>
                <div class="ext-time">{{ formatDateTime(r.decidedAt ?? r.createdAt) }}</div>
              </li>
            </ul>
          </details>
        </div>

        <div class="card panel">
          <dl>
            <dt>專案</dt>
            <dd><ProjectTag :project-id="ticket.projectId" link /></dd>
            <dt>指派給</dt>
            <dd class="person">
              <UserAvatar :user="userById(ticket.assigneeId)" :size="22" />
              {{ userById(ticket.assigneeId)?.name }}
              <span v-if="ticket.assigneeId === currentUser?.id" class="me">我</span>
            </dd>
            <dt>建立者</dt>
            <dd class="person">
              <UserAvatar :user="userById(ticket.creatorId)" :size="22" />
              {{ userById(ticket.creatorId)?.name }}
              <span v-if="ticket.creatorId === currentUser?.id" class="me">我</span>
            </dd>
            <dt>建立時間</dt>
            <dd>{{ formatDateTime(ticket.createdAt) }}</dd>
            <dt>最後更新</dt>
            <dd>{{ formatDateTime(ticket.updatedAt) }}</dd>
          </dl>
        </div>
      </aside>
    </div>

    <TicketFormModal v-if="editing && ticket" :ticket="ticket" @close="editing = false" @saved="editing = false; notify('已儲存')" />
    <ExtensionRequestModal v-if="requesting && ticket" :ticket="ticket" @close="requesting = false" @saved="requesting = false; notify('已送出延期申請')" />
    <div v-if="toast" class="toast" :class="{ 'is-error': toast.error }">{{ toast.msg }}</div>
  </div>
</template>

<style scoped>
.back { display: inline-flex; align-items: center; gap: 4px; margin-bottom: 18px; color: var(--muted); font-size: 13px; }
.back:hover { color: var(--text); }

.layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 18px; align-items: start; }
.main { padding: 24px 28px 28px; }
.head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.head-tags { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.head-actions { display: flex; gap: 6px; }
.tid {
  display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 8px;
  border: 1px solid var(--border); border-radius: 6px; background: var(--bg-elev); color: var(--text-2);
  font: 600 12px/1 ui-monospace, 'Cascadia Mono', Consolas, monospace; letter-spacing: .03em; cursor: pointer; user-select: all;
}
.tid:hover { border-color: var(--border-strong); color: var(--text); }
.tid svg { opacity: .7; }
h1 { margin: 16px 0 8px; font-size: 24px; line-height: 1.35; font-weight: 700; }

.block { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border); }
.block h2, .panel h2 { margin: 0 0 10px; font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
.block-head { display: flex; justify-content: space-between; align-items: baseline; }
.block-head h2 { margin: 0; }
.block .progress { margin: 10px 0 6px; }
.muted { color: var(--muted); font-size: 12px; }
.desc { margin: 0; white-space: pre-wrap; color: var(--text-2); }
.desc.placeholder { color: var(--muted); font-style: italic; }

.subs { list-style: none; margin: 8px 0 12px; padding: 0; }
.subs li {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 8px 8px 8px 10px; border-radius: var(--radius-sm);
}
.subs li:hover { background: var(--surface-2); }
.subs label { display: flex; align-items: center; gap: 10px; cursor: pointer; flex: 1; }
.subs li.done span { color: var(--muted); text-decoration: line-through; }
.block .desc.placeholder { margin-top: 10px; }
.link-btn { padding: 0; border: 0; background: none; color: var(--accent); font: inherit; font-style: normal; cursor: pointer; }
.link-btn:hover { text-decoration: underline; }

.side { display: flex; flex-direction: column; gap: 14px; position: sticky; top: 80px; }
.panel { padding: 16px 18px; }
.status-group { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.status-btn {
  height: 34px; border-radius: var(--radius-sm); border: 1px solid var(--border);
  background: var(--bg-elev); color: var(--text-2); font: inherit; font-size: 13px; font-weight: 500; cursor: pointer;
}
.status-btn:hover { border-color: var(--border-strong); color: var(--text); }
.status-btn.active.s-todo { background: var(--surface-2); color: var(--text); border-color: var(--border-strong); }
.status-btn.active.s-in_progress { background: var(--info-soft); color: var(--info); border-color: var(--info); }
.status-btn.active.s-done { background: var(--ok-soft); color: var(--ok); border-color: var(--ok); }

dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 12px 14px; align-items: center; }
dt { font-size: 12px; color: var(--muted); }
dd { margin: 0; font-size: 13px; }
.person { display: flex; align-items: center; gap: 8px; }
.me { font-size: 11px; padding: 0 6px; border-radius: 4px; background: var(--accent-soft); color: var(--accent); }
.due-note { font-weight: 600; font-size: 13px; }

.deadline { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.deadline-date { font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; }
.deadline-date.none { color: var(--muted); font-weight: 500; font-size: 15px; }
.ext-btn { margin-top: 12px; width: 100%; }

.ext-pending {
  margin-top: 12px; padding: 12px; border-radius: var(--radius-sm);
  background: var(--warn-soft); border: 1px solid rgba(242, 184, 75, .35);
}
.ext-title { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--warn); }
.ext-range { margin-top: 6px; font-size: 13px; color: var(--text-2); font-variant-numeric: tabular-nums; }
.ext-range b { color: var(--text); }
.ext-reason { margin: 6px 0 0; font-size: 13px; white-space: pre-wrap; }
.ext-time { margin-top: 4px; font-size: 11px; color: var(--muted); }
.ext-note { min-height: 56px; margin-top: 10px; font-size: 13px; }
.ext-actions { display: flex; justify-content: flex-end; gap: 6px; margin-top: 8px; }
.ext-wait { margin-top: 8px; font-size: 12px; color: var(--text-2); }

.ext-history { margin-top: 14px; font-size: 13px; }
.ext-history summary { cursor: pointer; color: var(--muted); font-size: 12px; }
.ext-history summary:hover { color: var(--text); }
.ext-history ul { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.ext-history li { padding: 10px; border-radius: var(--radius-sm); background: var(--bg-elev); border: 1px solid var(--border); }
.h-head { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-2); font-variant-numeric: tabular-nums; }
.h-status { font-weight: 600; }
.h-status.approved { color: var(--ok); }
.h-status.rejected { color: var(--danger); }
.h-reason { margin: 4px 0 0; font-size: 12px; color: var(--text-2); white-space: pre-wrap; }

@media (max-width: 860px) {
  .layout { grid-template-columns: 1fr; }
  .side { position: static; order: -1; }
  .main { padding: 20px; }
}
</style>
