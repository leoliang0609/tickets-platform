<script setup lang="ts">
import type { Project } from '#shared/types'

const props = defineProps<{ project?: Project | null }>()
const emit = defineEmits<{ close: [], saved: [Project] }>()

const { createProject, updateProject } = useProjects()
const isEdit = computed(() => !!props.project)

const form = reactive({
  name: props.project?.name ?? '',
  description: props.project?.description ?? '',
  color: props.project?.color ?? PROJECT_COLORS[0]!
})
const saving = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  if (!form.name.trim()) { error.value = '請輸入專案名稱'; return }
  saving.value = true
  try {
    const saved = isEdit.value ? await updateProject(props.project!.id, { ...form }) : await createProject({ ...form })
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
      <form class="modal card" style="max-width: 480px" @submit.prevent="submit">
        <header class="modal-head">
          <h2>{{ isEdit ? '編輯專案' : '新增專案' }}</h2>
          <button type="button" class="btn btn-ghost btn-icon btn-sm" aria-label="關閉" @click="emit('close')">✕</button>
        </header>

        <div class="modal-body">
          <div>
            <label class="label" for="p-name">專案名稱</label>
            <input id="p-name" v-model="form.name" class="input" placeholder="例如：官網改版" maxlength="60" autofocus>
          </div>
          <div>
            <label class="label" for="p-desc">說明</label>
            <textarea id="p-desc" v-model="form.description" class="textarea" style="min-height: 80px" placeholder="這個專案在做什麼？" />
          </div>
          <div>
            <span class="label">顏色</span>
            <div class="colors">
              <button
                v-for="c in PROJECT_COLORS"
                :key="c"
                type="button"
                class="swatch"
                :class="{ active: form.color === c }"
                :style="{ background: c }"
                :aria-label="c"
                @click="form.color = c"
              />
            </div>
          </div>
          <p v-if="error" class="form-error">{{ error }}</p>
        </div>

        <footer class="modal-foot">
          <button type="button" class="btn btn-ghost" @click="emit('close')">取消</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? '儲存中…' : isEdit ? '儲存變更' : '建立專案' }}</button>
        </footer>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
.colors { display: flex; gap: 10px; flex-wrap: wrap; }
.swatch {
  width: 28px; height: 28px; border-radius: 8px; border: 0; cursor: pointer;
  box-shadow: 0 0 0 2px var(--surface), 0 0 0 3px transparent; transition: box-shadow .15s;
}
.swatch.active { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--text); }
</style>
