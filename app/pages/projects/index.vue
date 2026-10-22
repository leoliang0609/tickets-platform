<script setup lang="ts">
import type { Project } from '#shared/types'

useHead({ title: '專案' })

const { projects } = useProjects()
const { tickets } = useTickets()
const { userById } = useSession()

const creating = ref(false)

function summary(p: Project) {
  const list = tickets.value.filter(t => t.projectId === p.id)
  const done = list.filter(t => t.status === 'done').length
  const assignees = [...new Set(list.map(t => t.assigneeId))].map(userById).filter(u => !!u)
  return {
    total: list.length,
    open: list.length - done,
    done,
    overdue: list.filter(isOverdue).length,
    pct: list.length ? Math.round((done / list.length) * 100) : 0,
    assignees
  }
}

const cards = computed(() => projects.value.map(p => ({ p, s: summary(p) })))

const unassignedCount = computed(() => tickets.value.filter(t => t.projectId === null).length)

function onCreated(p: Project) {
  creating.value = false
  navigateTo(`/projects/${p.id}`)
}
</script>

<template>
  <div>
    <section class="head">
      <div>
        <h1>專案</h1>
        <p class="sub">共 {{ projects.length }} 個專案，點進去可以看每個人在這個專案中的 ticket。</p>
      </div>
      <button class="btn" @click="creating = true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M12 5v14M5 12h14" /></svg>
        新增專案
      </button>
    </section>

    <div v-if="!projects.length" class="empty">
      還沒有任何專案。<br><button class="btn btn-primary" style="margin-top: 12px" @click="creating = true">建立第一個專案</button>
    </div>

    <section v-else class="grid">
      <NuxtLink
        v-for="{ p, s } in cards"
        :key="p.id"
        :to="`/projects/${p.id}`"
        class="project card"
        :style="{ '--c': p.color }"
      >
        <div class="p-head">
          <span class="p-icon">{{ p.name.slice(0, 1) }}</span>
          <div class="p-title">
            <h3>{{ p.name }}</h3>
            <span class="p-meta">建立於 {{ p.createdAt.slice(0, 10) }}</span>
          </div>
        </div>
        <p class="p-desc">{{ p.description || '沒有說明' }}</p>

        <div class="p-progress">
          <div class="p-progress-head">
            <span>{{ s.done }} / {{ s.total }} 完成</span>
            <span>{{ s.pct }}%</span>
          </div>
          <div class="progress" :class="{ 'is-done': s.total > 0 && s.pct === 100 }"><span :style="{ width: `${s.pct}%` }" /></div>
        </div>

        <div class="p-foot">
          <div class="p-counts">
            <span><b>{{ s.open }}</b> 未完成</span>
            <span v-if="s.overdue" class="tone-danger"><b>{{ s.overdue }}</b> 逾期</span>
          </div>
          <div class="p-people">
            <UserAvatar v-for="u in s.assignees" :key="u.id" :user="u" :size="24" />
          </div>
        </div>
      </NuxtLink>
    </section>

    <p v-if="unassignedCount" class="unassigned">
      另有 {{ unassignedCount }} 個 ticket 未歸屬專案，
      <NuxtLink to="/?project=none">在所有 Ticket 中查看 →</NuxtLink>
    </p>

    <ProjectFormModal v-if="creating" @close="creating = false" @saved="onCreated" />
  </div>
</template>

<style scoped>
.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
h1 { margin: 0 0 4px; font-size: 26px; font-weight: 700; }
.sub { margin: 0; color: var(--muted); }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
.project {
  position: relative; display: flex; flex-direction: column; gap: 14px; padding: 18px; overflow: hidden;
  transition: border-color .15s, transform .15s, background .15s;
}
.project::before { content: ''; position: absolute; inset: 0 0 auto; height: 3px; background: var(--c); }
.project:hover { border-color: var(--border-strong); background: var(--surface-hover); transform: translateY(-1px); }

.p-head { display: flex; align-items: center; gap: 12px; }
.p-icon {
  flex: none; display: grid; place-items: center; width: 38px; height: 38px; border-radius: 10px;
  font-weight: 700; font-size: 16px; color: var(--c);
  background: color-mix(in srgb, var(--c) 16%, transparent);
}
.p-title { min-width: 0; }
.p-title h3 { margin: 0; font-size: 16px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.p-meta { font-size: 12px; color: var(--muted); }
.p-desc {
  margin: 0; color: var(--text-2); font-size: 13px; min-height: 40px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.p-progress-head { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); margin-bottom: 6px; }
.p-progress .progress > span { background: var(--c); }
.p-progress .progress.is-done > span { background: var(--ok); }
.p-foot { display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--border); }
.p-counts { display: flex; gap: 12px; font-size: 12px; color: var(--muted); }
.p-counts b { font-size: 14px; color: var(--text); margin-right: 2px; }
.p-counts .tone-danger b { color: var(--danger); }
.p-people { display: flex; }
.p-people > * + * { margin-left: -6px; }
.p-people > * { box-shadow: 0 0 0 2px var(--surface); }

.unassigned { margin-top: 20px; color: var(--muted); font-size: 13px; }
.unassigned a { color: var(--accent); }
</style>
