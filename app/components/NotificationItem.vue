<script setup lang="ts">
import type { AppNotification } from '#shared/types'
import { daysUntil } from '#shared/utils/date'

const props = defineProps<{ n: AppNotification }>()
const emit = defineEmits<{ open: [AppNotification] }>()

const { userById, currentUser } = useSession()
const { tickets, decideExtension } = useTickets()
const { markRead } = useNotifications()

const ticket = computed(() => tickets.value.find(t => t.id === props.n.ticketId))
const actor = computed(() => userById(props.n.actorId ?? ''))
const title = computed(() => ticket.value ? `${ticket.value.code} ${ticket.value.title}` : props.n.ticketTitle)

// 死線提醒如果是別人的 ticket（來自關注的專案），標出負責人
const otherAssignee = computed(() => {
  const t = ticket.value
  return t && t.assigneeId !== currentUser.value?.id ? userById(t.assigneeId) : undefined
})

const icon = computed(() => ({
  ticket_assigned: { c: 'accent', d: 'M12 5v14M5 12h14' },
  extension_requested: { c: 'warn', d: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z' },
  extension_decided: props.n.decision === 'approved'
    ? { c: 'ok', d: 'm5 12 5 5 9-10' }
    : { c: 'danger', d: 'M6 6l12 12M18 6 6 18' },
  due_soon: { c: 'warn', d: 'M12 8v5m0 3h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z' },
  overdue: { c: 'danger', d: 'M12 8v5m0 3h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z' }
}[props.n.kind]))

const dueText = computed(() => {
  if (!props.n.deadline) return ''
  const d = daysUntil(props.n.deadline)
  if (d < 0) return `已逾期 ${-d} 天`
  if (d === 0) return '今天到期'
  return `${d} 天後到期`
})

// 「延期申請」通知可以直接在這裡審核
const canDecide = computed(() => {
  if (props.n.kind !== 'extension_requested' || !ticket.value) return false
  return ticket.value.creatorId === currentUser.value?.id && pendingExtension(ticket.value)?.id === props.n.requestId
})
const deciding = ref(false)
const errorMsg = ref('')

async function decide(decision: 'approved' | 'rejected') {
  deciding.value = true
  errorMsg.value = ''
  try {
    await decideExtension(props.n.ticketId, props.n.requestId!, decision)
    await markRead([props.n.id])
  }
  catch (e) {
    errorMsg.value = apiErrorMessage(e)
  }
  finally {
    deciding.value = false
  }
}
</script>

<template>
  <div class="item" :class="{ unread: !n.read }" role="button" tabindex="0" @click="emit('open', n)" @keydown.enter="emit('open', n)">
    <span class="icon" :class="`i-${icon.c}`">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path :d="icon.d" /></svg>
    </span>

    <div class="content">
      <p class="text">
        <template v-if="n.kind === 'ticket_assigned'">
          <b>{{ actor?.name }}</b> 指派了 <b>{{ title }}</b> 給你
        </template>
        <template v-else-if="n.kind === 'extension_requested'">
          <b>{{ actor?.name }}</b> 申請將 <b>{{ title }}</b> 延期
          <span class="range">{{ n.deadline }} → {{ n.toDeadline }}</span>
        </template>
        <template v-else-if="n.kind === 'extension_decided'">
          <b>{{ actor?.name }}</b> {{ n.decision === 'approved' ? '核准' : '駁回' }}了你對 <b>{{ title }}</b> 的延期申請
          <span v-if="n.decision === 'approved'" class="range">新死線 {{ n.toDeadline }}</span>
        </template>
        <template v-else>
          <b>{{ title }}</b>
          <span v-if="otherAssignee" class="who">（{{ otherAssignee.name }}）</span>
          <span :class="n.kind === 'overdue' ? 'tone-danger' : 'tone-warn'" class="due"> {{ dueText }}</span>
          <span class="range">死線 {{ n.deadline }}</span>
        </template>
      </p>

      <div class="meta">
        <ProjectTag v-if="ticket" :project-id="ticket.projectId" />
        <span>{{ timeAgo(n.createdAt) }}</span>
        <span v-if="!ticket" class="gone">ticket 已刪除</span>
      </div>

      <div v-if="canDecide" class="actions" @click.stop>
        <button class="btn btn-sm btn-danger" :disabled="deciding" @click="decide('rejected')">駁回</button>
        <button class="btn btn-sm btn-primary" :disabled="deciding" @click="decide('approved')">核准延期</button>
      </div>
      <p v-if="errorMsg" class="form-error">{{ errorMsg }}</p>
    </div>

    <span v-if="!n.read" class="dot" aria-label="未讀" />
  </div>
</template>

<style scoped>
.item {
  position: relative; display: flex; gap: 12px; padding: 12px 14px;
  border-radius: var(--radius-sm); cursor: pointer; outline: none;
}
.item:hover, .item:focus-visible { background: var(--surface-2); }
.item:not(.unread) .text { color: var(--text-2); }
.item:not(.unread) .icon { opacity: .6; }

.icon { flex: none; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; }
.i-accent { color: var(--accent); background: var(--accent-soft); }
.i-warn { color: var(--warn); background: var(--warn-soft); }
.i-ok { color: var(--ok); background: var(--ok-soft); }
.i-danger { color: var(--danger); background: var(--danger-soft); }

.content { flex: 1; min-width: 0; }
.text { margin: 0; font-size: 13px; line-height: 1.5; color: var(--text); }
.text b { font-weight: 600; }
.range { display: block; font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
.who { color: var(--text-2); }
.due { font-weight: 600; }
.meta { display: flex; align-items: center; gap: 8px; margin-top: 4px; font-size: 11px; color: var(--muted); }
.gone { font-style: italic; }
.actions { display: flex; gap: 6px; margin-top: 8px; }
.dot { flex: none; width: 8px; height: 8px; margin-top: 6px; border-radius: 50%; background: var(--accent); }
</style>
