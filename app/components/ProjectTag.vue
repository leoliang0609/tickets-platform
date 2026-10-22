<script setup lang="ts">
const props = defineProps<{ projectId: string | null, link?: boolean }>()
const { projectById } = useProjects()
const project = computed(() => projectById(props.projectId))
</script>

<template>
  <NuxtLink
    v-if="link && project"
    :to="`/projects/${project.id}`"
    class="ptag"
    :style="{ '--c': project.color }"
  >{{ project.name }}</NuxtLink>
  <span v-else class="ptag" :class="{ none: !project }" :style="{ '--c': project?.color ?? '#7d889c' }">
    {{ project?.name ?? '未分類' }}
  </span>
</template>

<style scoped>
.ptag {
  display: inline-flex; align-items: center; gap: 6px; max-width: 100%;
  height: 22px; padding: 0 8px; border-radius: 6px;
  font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  color: color-mix(in srgb, var(--c) 80%, white);
  background: color-mix(in srgb, var(--c) 14%, transparent);
}
.ptag::before { content: ''; flex: none; width: 7px; height: 7px; border-radius: 2px; background: var(--c); }
a.ptag:hover { background: color-mix(in srgb, var(--c) 24%, transparent); }
.ptag.none { color: var(--muted); background: var(--surface-2); }
</style>
