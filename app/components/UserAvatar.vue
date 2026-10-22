<script setup lang="ts">
import type { User } from '#shared/types'

const props = withDefaults(defineProps<{ user?: User, size?: number }>(), { size: 24 })
const initial = computed(() => props.user?.name.slice(0, 1).toUpperCase() ?? '?')
</script>

<template>
  <span
    class="avatar"
    :title="user?.name"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${size * 0.45}px`, '--c': user?.color ?? '#7d889c' }"
  >{{ initial }}</span>
</template>

<style scoped>
.avatar {
  flex: none; display: inline-grid; place-items: center; border-radius: 50%;
  font-weight: 700; color: var(--c);
  background: color-mix(in srgb, var(--c) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 40%, transparent);
}
</style>
