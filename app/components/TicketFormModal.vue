<script setup lang="ts">
import type { Ticket, TicketInput, TicketPriority } from '#shared/types'
import { addDays, todayStr } from '#shared/utils/date'

const props = defineProps<{ ticket?: Ticket | null, defaultProjectId?: string | null }>()
const emit = defineEmits<{ close: [], saved: [Ticket] }>()

const { users, currentUser } = useSession()
const { createTicket, updateTicket } = useTickets()
const { projects } = useProjects()

const isEdit = computed(() => !!props.ticket)
// 編輯時只有建立者能直接改死線，其他人要走延期申請
const deadlineLocked = computed(() => isEdit.value && props.ticket!.creatorId !== currentUser.value?.id)

// 新增時預設指派給「另一個使用者」
const otherUser = computed(() => users.value.find(u => u.id !== currentUser.value?.id))

const form = reactive({
  title: props.ticket?.title ?? '',
  description: props.ticket?.description ?? '',
  assigneeId: props.ticket?.assigneeId ?? otherUser.value?.id ?? '',
  projectId: (props.ticket ? props.ticket.projectId : props.defaultProjectId) ?? null,
  priority: (props.ticket?.priority ?? 'medium') as TicketPriority,
  deadline: (props.ticket ? props.ticket.deadline : addDays(todayStr(), 7)) as string | null,
  subtasks: (props.ticket?.subtasks ?? []).map(s => ({ ...s }))
})

// 勾選「無死線」時先記住原本的日期，取消勾選可以還原
let lastDeadline = form.deadline ?? addDays(todayStr(), 7)
const noDeadline = computed({
  get: () => form.deadline === null,
  set: (v: boolean) => {
    if (v) { lastDeadline = form.deadline ?? lastDeadline; form.deadline = null }
    else form.deadline = lastDeadline
  }
})
const newSubtask = ref('')
const saving = ref(false)
const error = ref('')

function addSubtask() {
  const title = newSubtask.value.trim()
  if (!title) return
  form.subtasks.push({ id: '', title, done: false })
  newSubtask.value = ''
}

async function submit() {
  error.value = ''
  if (!form.title.trim()) { error.value = '請輸入標題'; return }
  if (!noDeadline.value && !form.deadline) { error.value = '請選擇死線，或勾選「無死線」'; return }
  if (newSubtask.value.trim()) addSubtask()
  saving.value = true
  try {
    const payload: TicketInput = { ...form }
    if (deadlineLocked.value) delete (payload as Partial<TicketInput>).deadline
    const saved = isEdit.value ? await updateTicket(props.ticket!.id, payload) : await createTicket(payload)
    emit('saved', saved)
  }
  catch (e) {
    error.value = apiErrorMessage(e)
  }
  finally {
    saving.value = false
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @mousedown.self="emit('close')">
      <form class="modal card" @submit.prevent="submit">
        <header class="modal-head">
          <h2>{{ isEdit ? '編輯 Ticket' : '新增 Ticket' }}</h2>
          <button type="button" class="btn btn-ghost btn-icon btn-sm" aria-label="關閉" @click="emit('close')">✕</button>
        </header>

        <div class="modal-body">
          <div class="row-2">
            <div class="field">
              <label class="label" for="f-title">標題</label>
              <input id="f-title" v-model="form.title" class="input" placeholder="要做什麼？" maxlength="120" autofocus>
            </div>
            <div class="field">
              <label class="label" for="f-project">專案</label>
              <select id="f-project" v-model="form.projectId" class="select">
                <option :value="null">未分類</option>
                <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
          </div>

          <div class="row">
            <div class="field">
              <label class="label" for="f-assignee">指派給</label>
              <select id="f-assignee" v-model="form.assigneeId" class="select">
                <option v-for="u in users" :key="u.id" :value="u.id">
                  {{ u.name }}{{ u.id === currentUser?.id ? '（我）' : '' }}
                </option>
              </select>
            </div>
            <div class="field">
              <label class="label" for="f-priority">優先度</label>
              <select id="f-priority" v-model="form.priority" class="select">
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
            <div class="field">
              <div class="label-row">
                <label class="label" for="f-deadline">死線</label>
                <label v-if="!deadlineLocked" class="inline-check">
                  <input v-model="noDeadline" type="checkbox" class="checkbox checkbox-sm">
                  無死線
                </label>
              </div>
              <input
                v-if="!noDeadline"
                id="f-deadline"
                v-model="form.deadline"
                type="date"
                class="input"
                :disabled="deadlineLocked"
                :title="deadlineLocked ? '只有建立者可以直接修改死線，請在 ticket 頁面申請延期' : undefined"
              >
              <div v-else class="input no-deadline">不設定死線</div>
            </div>
          </div>
          <p v-if="deadlineLocked" class="hint">死線只有建立者能直接修改；需要更多時間請在 ticket 頁面「申請延期」。</p>

          <div class="field">
            <label class="label" for="f-desc">詳細內容</label>
            <textarea id="f-desc" v-model="form.description" class="textarea" placeholder="背景、需求、驗收標準…" />
          </div>

          <div class="field">
            <span class="label">子項目</span>
            <ul v-if="form.subtasks.length" class="subs">
              <li v-for="(s, i) in form.subtasks" :key="i">
                <input v-model="s.done" type="checkbox" class="checkbox">
                <input v-model="s.title" class="input sub-input">
                <button type="button" class="btn btn-ghost btn-icon btn-sm" aria-label="移除" @click="form.subtasks.splice(i, 1)">✕</button>
              </li>
            </ul>
            <div class="add-sub">
              <input v-model="newSubtask" class="input" placeholder="新增子項目，按 Enter 加入" @keydown.enter.prevent="addSubtask">
              <button type="button" class="btn" @click="addSubtask">加入</button>
            </div>
          </div>

          <p v-if="error" class="form-error">{{ error }}</p>
        </div>

        <footer class="modal-foot">
          <button type="button" class="btn btn-ghost" @click="emit('close')">取消</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? '儲存中…' : isEdit ? '儲存變更' : '建立 Ticket' }}</button>
        </footer>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
.row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.row-2 { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; }
.label-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.label-row .label { margin: 0; }
.inline-check { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text-2); cursor: pointer; }
.no-deadline { display: flex; align-items: center; color: var(--muted); }
.input:disabled { opacity: .55; cursor: not-allowed; }
.hint { margin: -8px 0 0; font-size: 12px; color: var(--muted); }
.subs { list-style: none; margin: 0 0 8px; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.subs li { display: flex; align-items: center; gap: 8px; }
.sub-input { height: 34px; }
.add-sub { display: flex; gap: 8px; }
@media (max-width: 560px) { .row, .row-2 { grid-template-columns: 1fr; } }
</style>
