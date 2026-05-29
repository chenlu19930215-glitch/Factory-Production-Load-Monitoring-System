# AI Hook Lab — Design Spec

## Overview

AI Hook Lab is a browser-based single-page application that generates 10 viral-style "hook" openings for social media content in one click. Users input a topic, select a platform and content type, and receive 10 diverse hooks with style tags, score ratings, and recommendation reasons. Built as a pure frontend SPA — the AI API is called directly from the browser using the user's own API key.

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Vue 3 (Composition API) | Component-based, reactive state management, low boilerplate |
| Build tool | Vite | Fast dev server, optimized production builds |
| Styling | Tailwind CSS 3 | Utility-first responsive design, dark mode built-in |
| AI API | OpenAI-compatible fetch (OpenAI / DeepSeek / Anthropic) | User-configurable base URL + key, broad compatibility |
| Storage | localStorage | Persist favorites, generation history, API config |
| Icons | Lucide (via @lucide/vue-next) | Clean icon set for operations (copy, star, history, settings) |
| No router needed | Single-page, no navigation | All content on one view |

## Architecture

### Component Tree

```
App.vue
├── AppHeader.vue             — Logo, API Key button, History button
├── ApiKeyModal.vue           — Modal: API Base URL + Key + Model config
├── HookGenerator.vue         — Topic input, platform chips, type chips, generate button
├── ResultsPanel.vue          — Grid container for hook cards
│   └── HookCard.vue ×10     — Individual hook display + copy/favorite actions
├── HistoryPanel.vue          — Slide-out drawer of past generations
├── EmptyState.vue            — Prompt shown when no results yet
├── SkeletonLoader.vue        — Loading skeleton for each hook card slot
└── ToastNotification.vue     — Transient feedback (copy success, error, etc.)
```

### Data Flow

```
User fills form → HookGenerator emits → App.vue stores form state
  → User clicks "生成" → App.vue calls aiGenerate(topic, platform, type)
    → Check API key configured? No → Show ApiKeyModal
    → fetch() to user-configured API endpoint with structured prompt
    → Parse JSON response → Handle errors
    → Update currentResult reactive state → ResultsPanel renders HookCard ×10
    → User can copy (clipboard API), favorite (localStorage), view history
```

## Data Models

```typescript
interface ApiConfig {
  baseUrl: string;    // default: https://api.deepseek.com/anthropic
  apiKey: string;
  model: string;      // default: deepseek-v4-flash
}

interface Hook {
  id: string;          // nanoid
  text: string;        // hook copy, ≤20 chars
  style: string;       // style label
  score: number;       // 0-100 click desire score
  reason: string;      // recommendation reason
}

interface GenerationResult {
  id: string;          // nanoid
  topic: string;
  platform: Platform;
  contentType: ContentType;
  hooks: Hook[];
  timestamp: number;   // Date.now()
}

interface AppState {
  apiConfig: ApiConfig | null;
  topic: string;
  platform: Platform;
  contentType: ContentType;
  currentResult: GenerationResult | null;
  isLoading: boolean;
  error: string | null;
  history: GenerationResult[];
  favorites: Hook[];
}
```

## AI Prompt Design

System prompt sets role and output format. User message includes topic, platform, and content type. Response is strictly JSON.

**Prompt structure:**

```
你是一个社交媒体爆款文案专家。

根据用户提供的主题、平台和内容类型，生成10个不同风格的爆款开头hook。

平台：{platform}
内容类型：{contentType}
主题：{topic}

规则：
- 每个hook文案控制在20字以内
- 10个hook必须覆盖不同风格
- 为每个hook提供：文案、风格标签、点击欲评分(0-100)、推荐理由

风格池（每个hook用不同风格）：
悬念式、颠覆认知、共鸣式、数据冲击、反常识、故事钩子、痛点直击、对比式、互动式、权威背书

返回JSON格式（不要markdown代码块，纯JSON）：
{"hooks":[{"text":"...","style":"...","score":95,"reason":"..."}]}
```

On the frontend, the raw text is parsed as JSON. If parsing fails, an error toast is shown and the user can retry.

## UI & Layout

### Design Tokens

- Background: `#0f0f0f` (page), `#1a1a1a` (card/surface)
- Primary: `#00f57c` (neon green — buttons, accents, score bars)
- Text: `#ffffff` (primary), `#a0a0a0` (secondary), `#666666` (tertiary)
- Border: `#2a2a2a`
- Danger: `#ff4444`
- Success toast: `#00f57c` bg
- Border radius: `12px` (cards), `8px` (buttons/inputs)
- Font: system-ui stack; monospace for scores

### Layout

**Desktop (≥1024px):**
- Two-column layout: left column (form, ~380px fixed) + right column (results, fluid)
- Hook cards in 2-column grid
- Header fixed at top

**Tablet (768-1023px):**
- Single column stacked: form on top, results below
- Hook cards in 2-column grid

**Mobile (<768px):**
- Full-width single column
- Hook cards in 1-column grid
- Bottom sheet for history drawer (instead of side drawer)

### Empty State

When no results exist:
```
┌──────────────────────────────────────┐
│                                      │
│           🪝  AI Hook Lab            │
│                                      │
│   输入主题，选择平台和内容类型，       │
│   一键生成 10 个爆款开头 hook        │
│                                      │
│   试试这些主题:                       │
│   [减肥秘籍] [搞钱方法] [职场生存]    │
│                                      │
└──────────────────────────────────────┘
```

### Loading State

Generate button shows spinner + "生成中...". 10 skeleton cards are rendered, each pulsing with a subtle animation.

### Error States

| Scenario | UX |
|----------|-----|
| No API key configured | On generate click, show ApiKeyModal. No key → button is disabled with tooltip "请先配置 API Key" |
| Network error / API timeout | Toast "API 请求失败，请检查网络和 API Key 配置" |
| Malformed response | Toast "AI 返回格式异常，请重试" |
| Rate limit / 4xx | Show API error message in toast |
| Empty hooks array | Toast "暂无生成结果，请调整主题后重试" |

## Features Detail

### Generate Hook Flow
1. User enters topic, selects platform + content type
2. Clicks "✨ 生成 10 个 Hook"
3. If no API key → ApiKeyModal opens; after config → proceed
4. Button shows loading state, 10 skeleton cards appear
5. On response received: parse JSON → display HookCards with staggered fade-in
6. On error: clear loading, show error toast, preserve form state

### Copy
- Uses `navigator.clipboard.writeText()`
- HookCard copy button shows "已复制 ✓" for 2 seconds after click
- Toast notification: "已复制到剪贴板"

### Favorite
- Star icon toggles between outlined (☆) and filled (★)
- Favorited hooks saved to localStorage key `ai-hook-lab-favorites`
- Favorite state persists across sessions
- History entries show which hooks were favorited

### History
- Slide-out drawer from right (desktop) or bottom sheet (mobile)
- Groups by generation session, sorted newest-first
- Each group shows: topic, platform, type, timestamp, hook count
- Click a history entry → loads that GenerationResult into ResultsPanel
- Stored in localStorage key `ai-hook-lab-history`
- Max 50 entries, auto-prune oldest on overflow

### API Key Configuration
- Modal with 3 fields: API Base URL, API Key, Model name
- API Key is stored in localStorage (masked in UI as `••••••••`)
- A "Check Connection" button tests the config by sending a minimal request
- Config can be cleared from the header

## File Structure

```
ai-hook-lab/
├── index.html
├── vite.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── src/
│   ├── main.js
│   ├── App.vue
│   ├── components/
│   │   ├── AppHeader.vue
│   │   ├── ApiKeyModal.vue
│   │   ├── HookGenerator.vue
│   │   ├── ResultsPanel.vue
│   │   ├── HookCard.vue
│   │   ├── HistoryPanel.vue
│   │   ├── EmptyState.vue
│   │   ├── SkeletonLoader.vue
│   │   └── ToastNotification.vue
│   ├── composables/
│   │   ├── useAiGeneration.js    — AI API call logic
│   │   ├── useStorage.js         — localStorage read/write
│   │   └── useToast.js           — toast notification state
│   ├── utils/
│   │   ├── constants.js          — platforms, content types, style pool
│   │   └── helpers.js            — nanoid, date formatting, etc.
│   └── assets/
│       └── style.css             — Tailwind directives + custom global styles
└── public/
    └── favicon.svg
```

## Scope / Non-goals

- **In scope:** Topic input, platform/type selection, 10-hook generation, display, copy, favorite, history, API key config, error handling
- **Not in scope:** User accounts, backend server, social media publishing, A/B testing, analytics, collaborative editing, image generation
