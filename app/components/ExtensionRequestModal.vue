<script setup lang="ts">
import type { Ticket } from '#shared/types'
import { addDays, daysUntil, todayStr } from '#shared/utils/date'

const props = defineProps<{ ticket: Ticket }>()
const emit = defineEmits<{ close: [], saved: [Ticket] }>()

const { requestExtension } = useTickets()
const { userById } = useSession()

const current = props.ticket.deadline!
const minDate = addDays(current, 1)
// 已逾期的話，從今天往後算比較合理
const base = current > todayStr() ? current : todayStr()
const toDeadline = ref(addDays(base, 3))
const reason = ref('')
const saving = ref(false)
const error = ref('')

const extraDays = computed(() => {
  if (!toDeadline.value) return 0
  return daysUntil(toDeadline.value) - daysUntil(current)
})

async function submit() {
  error.value = ''
  if (!toDeadline.value || toDeadline.value <= current) { error.value = '新的死線必須晚於目前死線'; return }
  if (!reason.value.trim()) { error.value = '請填寫延期原因'; return }
  saving.value = true
  try {
    emit('saved', await requestExtension(props.ticket.id, { toDeadline: toDeadline.value, reason: reason.value }))
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
      <form class="modal card" style="max-width: 460px" @submit.prevent="submit">
        <header class="modal-head">
          <h2>申請延期</h2>
          <button type="button" class="btn btn-ghost btn-icon btn-sm" aria-label="關閉" @click="emit('close')">✕</button>
        </header>

        <div class="modal-body">
          <div class="dates">
            <div>
              <span class="label">目前死線</span>
              <div class="date-now">{{ current }}</div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
            <div>
              <label class="label" for="x-to">延到</label>
              <input id="x-to" v-model="toDeadline" type="date" class="input" :min="minDate">
            </div>
          </div>
          <p v-if="extraDays > 0" class="extra">延長 {{ extraDays }} 天</p>

          <div>
            <label class="label" for="x-reason">原因</label>
            <textarea id="x-reason" v-model="reason" class="textarea" style="min-height: 90px" placeholder="說明為什麼需要更多時間…" autofocus />
          </div>

          <p class="hint">送出後會由建立者 <b>{{ userById(ticket.creatorId)?.name }}</b> 審核，核准後死線會自動更新。</p>
          <p v-if="error" class="form-error">{{ error }}</p>
        </div>

        <footer class="modal-foot">
          <button type="button" class="btn btn-ghost" @click="emit('close')">取消</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? '送出中…' : '送出申請' }}</button>
        </footer>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
.dates { display: grid; grid-template-columns: 1fr auto 1fr; align-items: end; gap: 12px; }
.dates svg { color: var(--muted); margin-bottom: 10px; }
.date-now {
  height: 38px; display: flex; align-items: center; padding: 0 12px;
  border: 1px dashed var(--border-strong); border-radius: var(--radius-sm); color: var(--text-2);
}
.extra { margin: -8px 0 0; font-size: 12px; font-weight: 600; color: var(--warn); text-align: right; }
.hint { margin: 0; font-size: 12px; color: var(--muted); }
.hint b { color: var(--text-2); }
</style>
