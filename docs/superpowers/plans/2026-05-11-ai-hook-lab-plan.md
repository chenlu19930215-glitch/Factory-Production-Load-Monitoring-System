# AI Hook Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page Vue 3 app that generates 10 viral hooks via AI, with copy/favorite/history features.

**Architecture:** Vue 3 SPA with Vite build, Tailwind CSS dark theme, OpenAI-compatible API fetch from browser, localStorage persistence.

**Tech Stack:** Vue 3 (Composition API), Vite, Tailwind CSS 3, Lucide icons, nanoid

**Project root:** `d:\claude code text\ai-hook-lab\`

---

### Task 1: Scaffold Vue 3 + Vite + Tailwind Project

**Files:** Project initialization (no pre-existing files)

- [ ] **Step 1: Create Vite + Vue 3 project**

Run:
```bash
cd "d:/claude code text"
npm create vite@latest ai-hook-lab -- --template vue
cd ai-hook-lab
npm install
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install tailwindcss @tailwindcss/vite lucide-vue-next nanoid
```

- [ ] **Step 3: Configure Tailwind CSS via Vite plugin**

Edit `vite.config.js`:
```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
})
```

- [ ] **Step 4: Add Tailwind directives to `src/style.css`**

```css
@import "tailwindcss";
```

- [ ] **Step 5: Set `index.html` title**

Edit `index.html`:
```html
<title>AI Hook Lab</title>
```

- [ ] **Step 6: Verify it builds**

Run:
```bash
npm run build
```
Expected: No errors, `dist/` folder created.

---

### Task 2: Constants, Helpers, and Composables

**Files:**
- Create: `src/utils/constants.js`
- Create: `src/utils/helpers.js`
- Create: `src/composables/useToast.js`
- Create: `src/composables/useStorage.js`
- Create: `src/composables/useAiGeneration.js`

- [ ] **Step 1: Create `src/utils/constants.js`**

```js
export const PLATFORMS = [
  { id: 'xiaohongshu', label: '小红书' },
  { id: 'douyin', label: '抖音' },
  { id: 'bilibili', label: 'B站' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'x', label: 'X' },
]

export const CONTENT_TYPES = [
  { id: 'video', label: '视频' },
  { id: 'image-text', label: '图文' },
  { id: 'product-ad', label: '产品广告' },
  { id: 'tutorial', label: '教程' },
  { id: 'opinion', label: '观点帖' },
]

export const STYLE_POOL = [
  '悬念式', '颠覆认知', '共鸣式', '数据冲击', '反常识',
  '故事钩子', '痛点直击', '对比式', '互动式', '权威背书',
]

export const STORAGE_KEYS = {
  API_CONFIG: 'ai-hook-lab-api-config',
  HISTORY: 'ai-hook-lab-history',
  FAVORITES: 'ai-hook-lab-favorites',
}

export const DEFAULT_API_CONFIG = {
  baseUrl: 'https://api.deepseek.com/anthropic',
  model: 'deepseek-v4-flash',
}

export const MAX_HISTORY = 50
```

- [ ] **Step 2: Create `src/utils/helpers.js`**

```js
// nanoid-like ID generator (no external dep needed for short IDs)
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export function formatDate(ts) {
  const d = new Date(ts)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${min}`
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}
```

- [ ] **Step 3: Create `src/composables/useToast.js`**

```js
import { ref } from 'vue'

const toasts = ref([])
let toastId = 0

export function useToast() {
  function show(message, type = 'success', duration = 2500) {
    const id = ++toastId
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, duration)
  }

  function remove(id) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return { toasts, show, remove }
}
```

- [ ] **Step 4: Create `src/composables/useStorage.js`**

```js
import { ref, watch } from 'vue'
import { STORAGE_KEYS, MAX_HISTORY } from '../utils/constants.js'

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function useStorage() {
  const apiConfig = ref(loadJSON(STORAGE_KEYS.API_CONFIG, null))
  const history = ref(loadJSON(STORAGE_KEYS.HISTORY, []))
  const favorites = ref(loadJSON(STORAGE_KEYS.FAVORITES, []))

  watch(apiConfig, (v) => {
    if (v) localStorage.setItem(STORAGE_KEYS.API_CONFIG, JSON.stringify(v))
    else localStorage.removeItem(STORAGE_KEYS.API_CONFIG)
  }, { deep: true })

  watch(history, (v) => {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(v.slice(0, MAX_HISTORY)))
  }, { deep: true })

  watch(favorites, (v) => {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(v))
  }, { deep: true })

  function addToHistory(result) {
    history.value = [result, ...history.value].slice(0, MAX_HISTORY)
  }

  function toggleFavorite(hook) {
    const idx = favorites.value.findIndex(f => f.id === hook.id)
    if (idx >= 0) {
      favorites.value.splice(idx, 1)
      hook.favorited = false
    } else {
      favorites.value.push({ ...hook, favorited: true })
      hook.favorited = true
    }
  }

  function isFavorited(hookId) {
    return favorites.value.some(f => f.id === hookId)
  }

  return { apiConfig, history, favorites, addToHistory, toggleFavorite, isFavorited }
}
```

- [ ] **Step 5: Create `src/composables/useAiGeneration.js`**

```js
import { ref } from 'vue'
import { generateId } from '../utils/helpers.js'

export function useAiGeneration(apiConfig) {
  const isLoading = ref(false)
  const error = ref(null)

  async function generate(topic, platform, contentType) {
    isLoading.value = true
    error.value = null

    if (!apiConfig.value || !apiConfig.value.apiKey) {
      error.value = '请先配置 API Key'
      isLoading.value = false
      return null
    }

    const prompt = `你是一个社交媒体爆款文案专家。

根据用户提供的主题、平台和内容类型，生成10个不同风格的爆款开头hook。

平台：${platform}
内容类型：${contentType}
主题：${topic}

规则：
- 每个hook文案控制在20字以内
- 10个hook必须覆盖不同风格
- 为每个hook提供：文案、风格标签、点击欲评分(0-100)、推荐理由

风格池（每个hook用不同风格）：
悬念式、颠覆认知、共鸣式、数据冲击、反常识、故事钩子、痛点直击、对比式、互动式、权威背书

返回JSON格式（不要markdown代码块，纯JSON）：
{"hooks":[{"text":"...","style":"...","score":95,"reason":"..."}]}`

    try {
      const res = await fetch(`${apiConfig.value.baseUrl.replace(/\/+$/, '')}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.value.apiKey}`,
        },
        body: JSON.stringify({
          model: apiConfig.value.model,
          messages: [
            { role: 'system', content: 'You are a viral copywriting expert. Always respond with valid JSON only, no markdown.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.9,
          max_tokens: 2000,
        }),
      })

      if (!res.ok) {
        const errBody = await res.text().catch(() => '')
        throw new Error(`API ${res.status}: ${errBody || res.statusText}`)
      }

      const data = await res.json()
      const content = data.choices?.[0]?.message?.content || ''

      let parsed
      try {
        parsed = JSON.parse(content)
      } catch {
        // Try extracting JSON from markdown code block
        const match = content.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (match) {
          parsed = JSON.parse(match[1])
        } else {
          throw new Error('Failed to parse AI response as JSON')
        }
      }

      if (!parsed.hooks || !Array.isArray(parsed.hooks) || parsed.hooks.length === 0) {
        throw new Error('AI returned empty hooks array')
      }

      const hooks = parsed.hooks.slice(0, 10).map(h => ({
        id: generateId(),
        text: h.text,
        style: h.style,
        score: Math.min(100, Math.max(0, Number(h.score) || 0)),
        reason: h.reason,
        platform,
        contentType,
        topic,
        timestamp: Date.now(),
        favorited: false,
      }))

      return {
        id: generateId(),
        topic,
        platform,
        contentType,
        hooks,
        timestamp: Date.now(),
      }
    } catch (err) {
      error.value = err.message
      return null
    } finally {
      isLoading.value = false
    }
  }

  return { isLoading, error, generate }
}
```

---

### Task 3: Create ToastNotification Component

**Files:**
- Create: `src/components/ToastNotification.vue`

- [ ] **Step 1: Create the component**

```vue
<script setup>
import { useToast } from '../composables/useToast.js'
import { X } from 'lucide-vue-next'

const { toasts, remove } = useToast()
</script>

<template>
  <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="[
          'flex items-start gap-2 px-4 py-3 rounded-xl text-sm shadow-lg backdrop-blur-sm',
          toast.type === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : '',
          toast.type === 'error' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : '',
          toast.type === 'info' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : '',
        ]"
      >
        <span class="flex-1">{{ toast.message }}</span>
        <button @click="remove(toast.id)" class="text-white/40 hover:text-white/80 transition-colors">
          <X :size="14" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active { animation: slideIn 0.25s ease-out; }
.toast-leave-active { animation: slideOut 0.2s ease-in; }
@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes slideOut {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100%); opacity: 0; }
}
</style>
```

---

### Task 4: Create AppHeader Component

**Files:**
- Create: `src/components/AppHeader.vue`

- [ ] **Step 1: Create the component**

```vue
<script setup>
import { Settings, BookOpen, Zap } from 'lucide-vue-next'

defineProps({
  hasApiKey: Boolean,
})

const emit = defineEmits(['open-api-key', 'open-history'])
</script>

<template>
  <header class="sticky top-0 z-40 backdrop-blur-xl bg-[#0f0f0f]/80 border-b border-white/5">
    <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00f57c] to-emerald-600 flex items-center justify-center">
          <Zap :size="20" class="text-[#0f0f0f]" />
        </div>
        <div>
          <h1 class="text-lg font-bold text-white tracking-tight leading-none">AI Hook Lab</h1>
          <p class="text-[10px] text-gray-500 tracking-wide">hook 工厂</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="emit('open-history')"
          class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <BookOpen :size="16" />
          <span class="hidden sm:inline">历史</span>
        </button>
        <button
          @click="emit('open-api-key')"
          :class="[
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all',
            hasApiKey
              ? 'text-[#00f57c] hover:bg-[#00f57c]/10'
              : 'text-orange-400 hover:bg-orange-400/10 animate-pulse',
          ]"
        >
          <Settings :size="16" />
          <span class="hidden sm:inline">{{ hasApiKey ? 'API Key' : '配置 API' }}</span>
          <span v-if="!hasApiKey" class="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
        </button>
      </div>
    </div>
  </header>
</template>
```

---

### Task 5: Create ApiKeyModal Component

**Files:**
- Create: `src/components/ApiKeyModal.vue`

- [ ] **Step 1: Create the component**

```vue
<script setup>
import { ref, computed } from 'vue'
import { DEFAULT_API_CONFIG } from '../utils/constants.js'
import { X, Check, Eye, EyeOff } from 'lucide-vue-next'

const props = defineProps({
  modelValue: Boolean,
  config: Object,
})

const emit = defineEmits(['update:modelValue', 'save'])

const showKey = ref(false)
const editing = ref({
  baseUrl: props.config?.baseUrl || DEFAULT_API_CONFIG.baseUrl,
  apiKey: props.config?.apiKey || '',
  model: props.config?.model || DEFAULT_API_CONFIG.model,
})

const isValid = computed(() => editing.value.baseUrl && editing.value.apiKey && editing.value.model)

function save() {
  if (!isValid.value) return
  emit('save', { ...editing.value })
  emit('update:modelValue', false)
}

function handleOverlayClick(e) {
  if (e.target === e.currentTarget) emit('update:modelValue', false)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click="handleOverlayClick">
        <div class="w-full max-w-md bg-[#1a1a1a] rounded-2xl border border-white/10 p-6 shadow-2xl">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-bold text-white">API 配置</h2>
            <button @click="emit('update:modelValue', false)" class="text-gray-500 hover:text-white transition-colors">
              <X :size="20" />
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-xs text-gray-400 mb-1.5 font-medium">API Base URL</label>
              <input v-model="editing.baseUrl" type="url" placeholder="https://api.deepseek.com/anthropic" class="w-full bg-[#0f0f0f] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00f57c]/50 transition-colors" />
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1.5 font-medium">API Key</label>
              <div class="relative">
                <input v-model="editing.apiKey" :type="showKey ? 'text' : 'password'" placeholder="sk-..." class="w-full bg-[#0f0f0f] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00f57c]/50 transition-colors pr-10" />
                <button @click="showKey = !showKey" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  <EyeOff v-if="!showKey" :size="16" />
                  <Eye v-else :size="16" />
                </button>
              </div>
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1.5 font-medium">Model</label>
              <input v-model="editing.model" type="text" placeholder="deepseek-v4-flash" class="w-full bg-[#0f0f0f] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00f57c]/50 transition-colors" />
            </div>
          </div>

          <div class="flex gap-3 mt-8">
            <button @click="emit('update:modelValue', false)" class="flex-1 px-4 py-2.5 rounded-xl text-sm text-gray-400 border border-white/10 hover:bg-white/5 transition-all">
              取消
            </button>
            <button @click="save" :disabled="!isValid" :class="[
              'flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2',
              isValid ? 'bg-[#00f57c] text-[#0f0f0f] hover:bg-[#00f57c]/90' : 'bg-gray-800 text-gray-500 cursor-not-allowed',
            ]">
              <Check :size="16" />
              保存
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active { transition: all 0.2s ease-out; }
.modal-leave-active { transition: all 0.15s ease-in; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .bg-\\[\\#1a1a1a\\], .modal-leave-to .bg-\\[\\#1a1a1a\\] { transform: scale(0.95); }
</style>
```

---

### Task 6: Create HookGenerator Component

**Files:**
- Create: `src/components/HookGenerator.vue`

- [ ] **Step 1: Create the component**

```vue
<script setup>
import { PLATFORMS, CONTENT_TYPES } from '../utils/constants.js'
import { Sparkles } from 'lucide-vue-next'

const props = defineProps({
  topic: String,
  platform: String,
  contentType: String,
  isLoading: Boolean,
})

const emit = defineEmits(['update:topic', 'update:platform', 'update:contentType', 'generate'])

function handleGenerate() {
  if (props.topic?.trim() && !props.isLoading) {
    emit('generate')
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Topic -->
    <div>
      <label class="block text-xs text-gray-400 mb-1.5 font-medium">主题</label>
      <input
        :value="topic"
        @input="emit('update:topic', $event.target.value)"
        @keyup.enter="handleGenerate"
        placeholder="输入一个主题，比如：减肥秘籍、搞钱方法、职场生存..."
        class="w-full bg-[#0f0f0f] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00f57c]/50 transition-colors"
      />
    </div>

    <!-- Platform -->
    <div>
      <label class="block text-xs text-gray-400 mb-2 font-medium">平台</label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="p in PLATFORMS"
          :key="p.id"
          @click="emit('update:platform', p.id)"
          :class="[
            'px-3.5 py-2 rounded-lg text-sm font-medium transition-all',
            platform === p.id
              ? 'bg-[#00f57c]/15 text-[#00f57c] border border-[#00f57c]/30'
              : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10 hover:text-gray-300',
          ]"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <!-- Content Type -->
    <div>
      <label class="block text-xs text-gray-400 mb-2 font-medium">内容类型</label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="t in CONTENT_TYPES"
          :key="t.id"
          @click="emit('update:contentType', t.id)"
          :class="[
            'px-3.5 py-2 rounded-lg text-sm font-medium transition-all',
            contentType === t.id
              ? 'bg-[#00f57c]/15 text-[#00f57c] border border-[#00f57c]/30'
              : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10 hover:text-gray-300',
          ]"
        >
          {{ t.label }}
        </button>
      </div>
    </div>

    <!-- Generate Button -->
    <button
      @click="handleGenerate"
      :disabled="!topic?.trim() || isLoading"
      :class="[
        'w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all',
        topic?.trim() && !isLoading
          ? 'bg-[#00f57c] text-[#0f0f0f] hover:bg-[#00f57c]/90 shadow-lg shadow-[#00f57c]/20'
          : 'bg-gray-800 text-gray-500 cursor-not-allowed',
      ]"
    >
      <Sparkles :size="18" :class="{ 'animate-spin': isLoading }" />
      {{ isLoading ? '生成中...' : '✨ 生成 10 个 Hook' }}
    </button>
  </div>
</template>
```

---

### Task 7: Create HookCard Component

**Files:**
- Create: `src/components/HookCard.vue`

- [ ] **Step 1: Create the component**

```vue
<script setup>
import { ref } from 'vue'
import { Copy, Star, Check } from 'lucide-vue-next'
import { useToast } from '../composables/useToast.js'

const props = defineProps({
  hook: Object,
})

const emit = defineEmits(['toggle-favorite'])
const { show } = useToast()
const copied = ref(false)

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(props.hook.text)
    copied.value = true
    show('已复制到剪贴板')
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    show('复制失败', 'error')
  }
}
</script>

<template>
  <div
    class="group bg-[#1a1a1a] border border-white/5 rounded-xl p-4 hover:border-[#00f57c]/20 hover:bg-[#1e1e1e] transition-all duration-300 flex flex-col"
  >
    <!-- Style badge + score -->
    <div class="flex items-center justify-between mb-3">
      <span class="inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold bg-gradient-to-r from-[#00f57c]/20 to-emerald-500/20 text-[#00f57c] border border-[#00f57c]/20">
        {{ hook.style }}
      </span>
      <div class="flex items-center gap-1.5">
        <div class="h-1.5 w-16 bg-white/5 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-1000"
            :class="hook.score >= 80 ? 'bg-[#00f57c]' : hook.score >= 60 ? 'bg-yellow-500' : 'bg-orange-500'"
            :style="{ width: hook.score + '%' }"
          ></div>
        </div>
        <span class="text-xs font-mono font-bold" :class="hook.score >= 80 ? 'text-[#00f57c]' : hook.score >= 60 ? 'text-yellow-500' : 'text-orange-500'">
          {{ hook.score }}
        </span>
      </div>
    </div>

    <!-- Hook text -->
    <p class="text-white text-base font-bold leading-snug mb-3 flex-1">
      "{{ hook.text }}"
    </p>

    <!-- Reason -->
    <p class="text-xs text-gray-500 mb-4 leading-relaxed">
      💡 {{ hook.reason }}
    </p>

    <!-- Actions -->
    <div class="flex items-center gap-2 pt-3 border-t border-white/5">
      <button
        @click="handleCopy"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
        :class="copied ? 'bg-[#00f57c]/20 text-[#00f57c]' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'"
      >
        <Check v-if="copied" :size="14" />
        <Copy v-else :size="14" />
        {{ copied ? '已复制' : '复制' }}
      </button>
      <button
        @click="emit('toggle-favorite', hook)"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
        :class="hook.favorited ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'"
      >
        <Star :size="14" :fill="hook.favorited ? 'currentColor' : 'none'" />
        {{ hook.favorited ? '已收藏' : '收藏' }}
      </button>
    </div>
  </div>
</script>
```

---

### Task 8: Create EmptyState and SkeletonLoader Components

**Files:**
- Create: `src/components/EmptyState.vue`
- Create: `src/components/SkeletonLoader.vue`

- [ ] **Step 1: Create `src/components/EmptyState.vue`**

```vue
<script setup>
import { Sparkles, MessageSquare } from 'lucide-vue-next'

const suggestions = ['减肥秘籍', '搞钱方法', '职场生存', '恋爱技巧', '效率提升']
const emit = defineEmits(['select-topic'])
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00f57c]/20 to-emerald-500/20 flex items-center justify-center mb-6 border border-[#00f57c]/10">
      <MessageSquare :size="32" class="text-[#00f57c]" />
    </div>
    <h2 class="text-xl font-bold text-white mb-2">AI Hook Lab</h2>
    <p class="text-sm text-gray-500 max-w-sm mb-8 leading-relaxed">
      输入主题，选择平台和内容类型，<br />一键生成 10 个爆款开头 hook
    </p>
    <div class="flex flex-wrap justify-center gap-2">
      <button
        v-for="s in suggestions"
        :key="s"
        @click="emit('select-topic', s)"
        class="px-3.5 py-2 rounded-lg text-sm bg-white/5 text-gray-400 border border-white/5 hover:bg-[#00f57c]/10 hover:text-[#00f57c] hover:border-[#00f57c]/20 transition-all"
      >
        <Sparkles :size="14" class="inline mr-1" />
        {{ s }}
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Create `src/components/SkeletonLoader.vue`**

```vue
<template>
  <div class="bg-[#1a1a1a] border border-white/5 rounded-xl p-4 animate-pulse">
    <div class="flex items-center justify-between mb-3">
      <div class="h-5 w-16 bg-white/5 rounded-md"></div>
      <div class="h-3 w-20 bg-white/5 rounded-full"></div>
    </div>
    <div class="h-6 w-full bg-white/5 rounded-lg mb-3"></div>
    <div class="h-6 w-3/4 bg-white/5 rounded-lg mb-4"></div>
    <div class="h-4 w-full bg-white/5 rounded mb-4"></div>
    <div class="flex gap-2 pt-3 border-t border-white/5">
      <div class="h-7 w-16 bg-white/5 rounded-lg"></div>
      <div class="h-7 w-16 bg-white/5 rounded-lg"></div>
    </div>
  </div>
</template>
```

---

### Task 9: Create ResultsPanel and HistoryPanel Components

**Files:**
- Create: `src/components/ResultsPanel.vue`
- Create: `src/components/HistoryPanel.vue`

- [ ] **Step 1: Create `src/components/ResultsPanel.vue`**

```vue
<script setup>
import HookCard from './HookCard.vue'
import SkeletonLoader from './SkeletonLoader.vue'

defineProps({
  result: Object,
  isLoading: Boolean,
})

const emit = defineEmits(['toggle-favorite'])

function getPlatformLabel(id) {
  const map = { xiaohongshu: '小红书', douyin: '抖音', bilibili: 'B站', youtube: 'YouTube', x: 'X' }
  return map[id] || id
}

function getContentTypeLabel(id) {
  const map = { video: '视频', 'image-text': '图文', 'product-ad': '产品广告', tutorial: '教程', opinion: '观点帖' }
  return map[id] || id
}
</script>

<template>
  <div>
    <!-- Result header -->
    <div v-if="result && !isLoading" class="mb-4 flex items-center justify-between">
      <div>
        <h3 class="text-sm text-gray-400">
          <span class="text-white font-semibold">{{ result.topic }}</span>
          <span class="mx-1.5">·</span>
          {{ getPlatformLabel(result.platform) }}
          <span class="mx-1.5">·</span>
          {{ getContentTypeLabel(result.contentType) }}
        </h3>
        <p class="text-xs text-gray-600 mt-0.5">共 {{ result.hooks.length }} 个 hook</p>
      </div>
    </div>

    <!-- Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <!-- Loading skeletons -->
      <template v-if="isLoading">
        <SkeletonLoader v-for="n in 10" :key="n" />
      </template>

      <!-- Hook cards -->
      <template v-else-if="result">
        <TransitionGroup name="hook-card">
          <HookCard
            v-for="(hook, index) in result.hooks"
            :key="hook.id"
            :hook="hook"
            :style="{ transitionDelay: index * 50 + 'ms' }"
            @toggle-favorite="emit('toggle-favorite', $event)"
          />
        </TransitionGroup>
      </template>
    </div>
  </div>
</template>

<style scoped>
.hook-card-enter-active {
  transition: all 0.3s ease-out;
}
.hook-card-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
</style>
```

- [ ] **Step 2: Create `src/components/HistoryPanel.vue`**

```vue
<script setup>
import { formatDate } from '../utils/helpers.js'
import { X, Clock, Trash2 } from 'lucide-vue-next'

const props = defineProps({
  open: Boolean,
  history: Array,
})

const emit = defineEmits(['close', 'select', 'clear'])

function getPlatformLabel(id) {
  const map = { xiaohongshu: '小红书', douyin: '抖音', bilibili: 'B站', youtube: 'YouTube', x: 'X' }
  return map[id] || id
}

function getContentTypeLabel(id) {
  const map = { video: '视频', 'image-text': '图文', 'product-ad': '产品广告', tutorial: '教程', opinion: '观点帖' }
  return map[id] || id
}

function handleOverlayClick(e) {
  if (e.target === e.currentTarget) emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="fixed inset-0 z-50 flex justify-end" @click="handleOverlayClick">
        <div class="w-full max-w-sm bg-[#1a1a1a] border-l border-white/10 h-full flex flex-col shadow-2xl">
          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h2 class="text-base font-bold text-white">生成历史</h2>
            <button @click="emit('close')" class="text-gray-500 hover:text-white transition-colors">
              <X :size="18" />
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto p-4 space-y-3">
            <div v-if="history.length === 0" class="text-center text-gray-500 text-sm py-12">
              <Clock :size="32" class="mx-auto mb-3 opacity-30" />
              暂无历史记录
            </div>

            <button
              v-for="item in history"
              :key="item.id"
              @click="emit('select', item.id)"
              class="w-full text-left bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-all border border-transparent hover:border-white/10"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-semibold text-white truncate mr-2">{{ item.topic }}</span>
                <span class="text-[10px] text-gray-600 whitespace-nowrap">{{ formatDate(item.timestamp) }}</span>
              </div>
              <div class="flex items-center gap-2 text-xs text-gray-500">
                <span>{{ getPlatformLabel(item.platform) }}</span>
                <span>·</span>
                <span>{{ getContentTypeLabel(item.contentType) }}</span>
                <span>·</span>
                <span>{{ item.hooks.length }} hooks</span>
              </div>
            </button>
          </div>

          <!-- Clear button -->
          <div v-if="history.length > 0" class="px-4 py-3 border-t border-white/5">
            <button @click="emit('clear')" class="flex items-center gap-2 text-xs text-gray-500 hover:text-red-400 transition-colors px-3 py-2 rounded-lg hover:bg-red-500/10">
              <Trash2 :size="14" />
              清空历史
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-enter-active { transition: all 0.25s ease-out; }
.drawer-leave-active { transition: all 0.2s ease-in; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
.drawer-enter-from > div, .drawer-leave-to > div { transform: translateX(100%); }
</style>
```

---

### Task 10: Wire Up App.vue

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: Replace App.vue content**

```vue
<script setup>
import { ref, watch, onMounted } from 'vue'
import AppHeader from './components/AppHeader.vue'
import ApiKeyModal from './components/ApiKeyModal.vue'
import HookGenerator from './components/HookGenerator.vue'
import ResultsPanel from './components/ResultsPanel.vue'
import HistoryPanel from './components/HistoryPanel.vue'
import EmptyState from './components/EmptyState.vue'
import ToastNotification from './components/ToastNotification.vue'
import { useStorage } from './composables/useStorage.js'
import { useAiGeneration } from './composables/useAiGeneration.js'
import { useToast } from './composables/useToast.js'

const { apiConfig, history, favorites, addToHistory, toggleFavorite, isFavorited } = useStorage()
const { isLoading, error, generate } = useAiGeneration(apiConfig)
const { show } = useToast()

const topic = ref('')
const platform = ref('xiaohongshu')
const contentType = ref('video')
const currentResult = ref(null)
const showApiKeyModal = ref(false)
const showHistory = ref(false)

async function handleGenerate() {
  if (!apiConfig.value) {
    showApiKeyModal.value = true
    return
  }
  currentResult.value = null
  const result = await generate(topic.value, platform.value, getContentTypeLabel(contentType.value))
  if (result) {
    // Re-check favorited status
    result.hooks.forEach(h => {
      h.favorited = isFavorited(h.id)
    })
    currentResult.value = result
    addToHistory(result)
    show(`已生成 ${result.hooks.length} 个 hook 🪝`)
  }
  if (error.value) {
    show(error.value, 'error')
  }
}

function saveApiConfig(config) {
  apiConfig.value = config
  show('API 配置已保存', 'success')
  // If there's a pending generation, retry
  if (topic.value.trim()) {
    handleGenerate()
  }
}

function handleToggleFavorite(hook) {
  toggleFavorite(hook)
  show(hook.favorited ? '已收藏' : '已取消收藏')
}

function selectFromHistory(id) {
  const item = history.value.find(h => h.id === id)
  if (item) {
    item.hooks.forEach(h => {
      h.favorited = isFavorited(h.id)
    })
    currentResult.value = item
    showHistory.value = false
  }
}

function clearHistory() {
  history.value = []
  show('历史已清空')
}

function selectSuggestion(s) {
  topic.value = s
}

function getContentTypeLabel(id) {
  const map = { video: '视频', 'image-text': '图文', 'product-ad': '产品广告', tutorial: '教程', opinion: '观点帖' }
  return map[id] || id
}

watch(error, (err) => {
  if (err && err !== '请先配置 API Key') {
    show(err, 'error')
  }
})
</script>

<template>
  <div class="min-h-screen bg-[#0f0f0f] text-white">
    <AppHeader
      :has-api-key="!!apiConfig"
      @open-api-key="showApiKeyModal = true"
      @open-history="showHistory = true"
    />

    <main class="max-w-7xl mx-auto px-4 py-6">
      <div class="flex flex-col lg:flex-row gap-8">
        <!-- Sidebar: form -->
        <aside class="w-full lg:w-80 shrink-0">
          <div class="lg:sticky lg:top-24">
            <HookGenerator
              v-model:topic="topic"
              v-model:platform="platform"
              v-model:content-type="contentType"
              :is-loading="isLoading"
              @generate="handleGenerate"
            />
          </div>
        </aside>

        <!-- Main: results -->
        <section class="flex-1 min-w-0">
          <ResultsPanel
            v-if="currentResult || isLoading"
            :result="currentResult"
            :is-loading="isLoading"
            @toggle-favorite="handleToggleFavorite"
          />
          <EmptyState v-else @select-topic="selectSuggestion" />
        </section>
      </div>
    </main>

    <!-- Modals & Overlays -->
    <ApiKeyModal
      v-model="showApiKeyModal"
      :config="apiConfig"
      @save="saveApiConfig"
    />

    <HistoryPanel
      :open="showHistory"
      :history="history"
      @close="showHistory = false"
      @select="selectFromHistory"
      @clear="clearHistory"
    />

    <ToastNotification />
  </div>
</template>
```

---

### Task 11: Update main.js and index.html

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Update `src/main.js`**

```js
import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).mount('#app')
```

- [ ] **Step 2: Ensure `index.html` has proper viewport meta**

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

---

### Task 12: Build and Verify

- [ ] **Step 1: Run production build**

```bash
npm run build
```

Expected: No errors, all files compiled successfully.

- [ ] **Step 2: Start dev server to verify**

```bash
npm run dev
```

Open the URL shown in terminal. Verify:
- Empty state with suggestion chips renders
- Clicking a suggestion fills the topic input
- Form validation prevents generate without topic
- API Key modal opens and saves
- Skeleton loaders show during generation
- Results render in 2-column grid
- Copy works (in browser context)
- Favorite toggles
- History drawer opens/closes
- Responsive layout at mobile widths

---

### Task 13: Add Tailwind Dark Mode Theme Configuration

**Files:**
- Modify: `src/style.css`

- [ ] **Step 1: Add base styles and custom theme**

```css
@import "tailwindcss";

@theme {
  --color-surface: #1a1a1a;
  --color-surface-hover: #1e1e1e;
  --color-border: rgba(255, 255, 255, 0.05);
  --color-primary: #00f57c;
  --color-bg: #0f0f0f;
}

@layer base {
  * {
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.08) transparent;
  }

  body {
    @apply bg-[#0f0f0f] text-white antialiased;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  ::selection {
    background-color: rgba(0, 245, 124, 0.2);
  }
}
```

---

### Task 14: Final Polish — Scrollbar, Transitions, Mobile Optimization

- [ ] **Step 1: Verify all transitions work smoothly**
- [ ] **Step 2: Test responsive breakpoints (mobile first)**
- [ ] **Step 3: Ensure sticky sidebar doesn't overflow on short viewports**
- [ ] **Step 4: Verify API error messages display correctly in toast**
