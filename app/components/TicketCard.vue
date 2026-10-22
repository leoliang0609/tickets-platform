<script setup lang="ts">
import type { Ticket } from '#shared/types'

const props = withDefaults(defineProps<{ ticket: Ticket, showProject?: boolean }>(), { showProject: true })
const { userById } = useSession()

const creator = computed(() => userById(props.ticket.creatorId))
const assignee = computed(() => userById(props.ticket.assigneeId))
const progress = computed(() => subtaskProgress(props.ticket))
const due = computed(() => deadlineInfo(props.ticket))
const pending = computed(() => pendingExtension(props.ticket))
</script>

<template>
  <NuxtLink
    :to="`/tickets/${ticket.code}`"
    class="ticket card"
    :class="{ 'is-done': ticket.status === 'done', 'is-overdue': isOverdue(ticket) }"
  >
    <div class="top">
      <span class="badge" :class="`badge-${ticket.status}`">{{ STATUS_LABEL[ticket.status] }}</span>
      <div class="top-right">
        <ProjectTag v-if="showProject" :project-id="ticket.projectId" />
        <span class="prio" :class="`prio-${ticket.priority}`">{{ PRIORITY_LABEL[ticket.priority] }}</span>
      </div>
    </div>

    <span class="code">{{ ticket.code }}</span>
    <h3 class="title">{{ ticket.title }}</h3>
    <p v-if="ticket.description" class="desc">{{ ticket.description }}</p>

    <div v-if="progress.total" class="sub">
      <div class="sub-head">
        <span>子項目</span>
        <span>{{ progress.done }} / {{ progress.total }}</span>
      </div>
      <div class="progress" :class="{ 'is-done': progress.pct === 100 }"><span :style="{ width: `${progress.pct}%` }" /></div>
    </div>

    <div class="foot">
      <div class="people" :title="`${creator?.name} → ${assignee?.name}`">
        <UserAvatar :user="creator" :size="22" />
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
        <UserAvatar :user="assignee" :size="22" />
      </div>
      <div class="dates">
        <span class="due" :class="`tone-${due.tone}`">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          {{ due.text }}
        </span>
        <span v-if="pending" class="ext" :title="`申請延期至 ${pending.toDeadline}`">延期申請中 → {{ pending.toDeadline.slice(5) }}</span>
        <span class="created">建立 {{ ticket.createdAt.slice(0, 10) }}</span>
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
.ticket {
  position: relative; display: flex; flex-direction: column; gap: 10px;
  padding: 16px 16px 14px; overflow: hidden;
  transition: border-color .15s, transform .15s, background .15s;
}
.ticket::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: transparent;
}
.ticket.is-overdue::before { background: var(--danger); }
.ticket:hover { border-color: var(--border-strong); background: var(--surface-hover); transform: translateY(-1px); }
.ticket.is-done { opacity: .62; }
.ticket.is-done .title { text-decoration: line-through; text-decoration-color: var(--muted); }

.top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.top-right { display: flex; align-items: center; gap: 6px; min-width: 0; }
.title { margin: 0; font-size: 15px; font-weight: 600; line-height: 1.4; }
.code { margin-bottom: -6px; font: 500 11px/1 ui-monospace, 'Cascadia Mono', Consolas, monospace; letter-spacing: .04em; color: var(--muted); }
.desc {
  margin: 0; color: var(--muted); font-size: 13px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.sub-head { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); margin-bottom: 5px; }

.foot {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 8px;
  margin-top: auto; padding-top: 10px; border-top: 1px solid var(--border);
}
.people { display: flex; align-items: center; gap: 4px; color: var(--muted); }
.dates { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
.due { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; }
.created { font-size: 11px; color: var(--muted); }
.ext { font-size: 11px; font-weight: 600; color: var(--warn); }
</style>
