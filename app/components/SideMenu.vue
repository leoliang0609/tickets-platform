<script setup lang="ts">
// 左側抽屜選單：放不需要常駐在導覽列的項目（使用教學、之後的登出）
const open = defineModel<boolean>({ required: true })
const route = useRoute()

// 換頁後自動收起
watch(() => route.fullPath, () => { open.value = false })

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) open.value = false
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="drawer-overlay" @click.self="open = false">
        <aside class="drawer" role="dialog" aria-modal="true" aria-label="選單">
          <div class="drawer-head">
            <span class="drawer-title">選單</span>
            <button class="btn btn-ghost btn-icon btn-sm" aria-label="收合選單" title="收合選單" @click="open = false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M16 9l-3 3 3 3" /></svg>
            </button>
          </div>

          <nav class="drawer-nav">
            <NuxtLink to="/guide" class="drawer-link" active-class="active">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z" /><path d="M4 19a2 2 0 0 1 2-2h13M9 8h6" /></svg>
              使用教學
            </NuxtLink>
          </nav>

          <!-- 帳號相關（之後的登出放這裡） -->
          <div class="drawer-foot" />
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-overlay { position: fixed; inset: 0; z-index: 60; background: rgba(0, 0, 0, .45); }
.drawer {
  position: absolute; top: 0; bottom: 0; left: 0; width: min(280px, 85vw);
  display: flex; flex-direction: column;
  background: var(--bg-elev); border-right: 1px solid var(--border); box-shadow: 8px 0 32px rgba(0, 0, 0, .35);
}
.drawer-head { display: flex; align-items: center; justify-content: space-between; height: 60px; padding: 0 12px 0 20px; border-bottom: 1px solid var(--border); }
.drawer-title { font-size: 12px; font-weight: 600; letter-spacing: .06em; color: var(--muted); }
.drawer-nav { display: flex; flex-direction: column; gap: 2px; padding: 12px; }
.drawer-link {
  display: flex; align-items: center; gap: 10px; height: 38px; padding: 0 12px;
  border-radius: var(--radius-sm); color: var(--text-2); font-weight: 500;
}
.drawer-link:hover { color: var(--text); background: var(--surface); }
.drawer-link.active { color: var(--text); background: var(--surface-2); }
.drawer-foot { margin-top: auto; padding: 12px; }
.drawer-foot:empty { display: none; }

.drawer-enter-active, .drawer-leave-active { transition: opacity .18s ease; }
.drawer-enter-active .drawer, .drawer-leave-active .drawer { transition: transform .2s ease; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
.drawer-enter-from .drawer, .drawer-leave-to .drawer { transform: translateX(-100%); }
</style>
