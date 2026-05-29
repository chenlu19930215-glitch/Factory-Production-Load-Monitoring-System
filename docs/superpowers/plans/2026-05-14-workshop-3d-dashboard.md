# 食品代工厂车间3D可视化大屏 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Phase 1 Demo of a food factory workshop 3D visualization dashboard — one workshop, mock data, geometric 3D models, 1920×1080 TV display.

**Architecture:** Vue 3 SPA with Three.js 3D scene in center, ECharts panels on left/right, Pinia stores for state. All data from local JSON mock files via an API abstraction layer. CSS scale transform for resolution adaptation.

**Tech Stack:** Vue 3 + Vite 5, Three.js r165+, ECharts 5, Pinia, Tailwind CSS v3, pnpm

---

## File Structure

All new files under `d:/claude code text/一家园工厂可视化项目/workshop-dashboard/`:

### Configuration & Root
- `package.json` — deps: vue, vue-router, pinia, three, echarts, tailwindcss, postcss, autoprefixer
- `vite.config.js` — path alias `@` → `src/`, configure Tailwind
- `tailwind.config.js` — dark theme, content paths
- `postcss.config.js` — Tailwind + autoprefixer
- `index.html` — entry HTML
- `src/main.js` — app bootstrap
- `src/App.vue` — root component with scale adapter

### Mock Data (5 files)
- `src/mock/workshop.json` — workshop info + zones
- `src/mock/energy.json` — electricity/water/gas consumption + trend
- `src/mock/production.json` — products, shift, capacity, weekly trend
- `src/mock/personnel.json` — on-duty count, positions by zone
- `src/mock/equipment.json` — 24 devices with positions, status, utilization

### API Layer (6 files)
- `src/api/index.js` — unified export
- `src/api/workshop.js` — getWorkshopInfo(workshopId)
- `src/api/energy.js` — getEnergyData(workshopId)
- `src/api/production.js` — getProductionData(workshopId)
- `src/api/personnel.js` — getPersonnelData(workshopId)
- `src/api/equipment.js` — getEquipmentData(workshopId)

### Pinia Stores (2 files)
- `src/stores/useWorkshopStore.js` — workshop info, energy, production, personnel
- `src/stores/useEquipmentStore.js` — equipment list, selected device, polling timer

### Layout Components (4 files)
- `src/components/layout/DashboardHeader.vue` — title, clock, alerts
- `src/components/layout/LeftPanel.vue` — panel container
- `src/components/layout/RightPanel.vue` — panel container
- `src/components/layout/BottomBar.vue` — status bar

### 3D Scene (6 files)
- `src/components/scene/WorkshopScene.vue` — Vue container mounting Three.js
- `src/components/scene/useThreeScene.js` — Three.js init composable
- `src/components/scene/WorkshopModel.js` — building geometry
- `src/components/scene/EquipmentMarkers.js` — device 3D markers
- `src/components/scene/PersonnelMarkers.js` — personnel zone indicators
- `src/components/scene/InfoLabel.js` — CSS2D floating labels

### Chart Components (5 files)
- `src/components/charts/LineChart.vue`
- `src/components/charts/RingChart.vue`
- `src/components/charts/BarChart.vue`
- `src/components/charts/GaugeChart.vue`
- `src/components/charts/StatusPill.vue`

### Panel Components (5 files)
- `src/components/panels/WorkshopInfoPanel.vue`
- `src/components/panels/EnergyPanel.vue`
- `src/components/panels/ProductionPanel.vue`
- `src/components/panels/PersonnelPanel.vue`
- `src/components/panels/EquipmentPanel.vue`

### Views, Router, Utils (5 files)
- `src/views/DashboardView.vue` — main layout grid
- `src/router/index.js` — single route
- `src/utils/formatters.js` — number/unit formatting
- `src/utils/scaleAdapter.js` — 1920px scale transform
- `src/assets/` — empty static assets folder

---

### Task 1: Project Scaffolding

**Files:**
- Create: `workshop-dashboard/package.json`
- Create: `workshop-dashboard/vite.config.js`
- Create: `workshop-dashboard/tailwind.config.js`
- Create: `workshop-dashboard/postcss.config.js`
- Create: `workshop-dashboard/index.html`
- Create: `workshop-dashboard/src/main.js`
- Create: `workshop-dashboard/src/App.vue`
- Create: `workshop-dashboard/src/utils/scaleAdapter.js`
- Create: `workshop-dashboard/src/utils/formatters.js`
- Create: `workshop-dashboard/src/router/index.js`
- Create: `workshop-dashboard/src/assets/.gitkeep`
- Create: all 5 mock JSON files in `src/mock/`
- Create: all 6 API files in `src/api/`

- [ ] **Step 1: Scaffold Vite project and install deps**

```bash
cd "/d/claude code text/一家园工厂可视化项目"
pnpm create vite workshop-dashboard --template vue
cd workshop-dashboard
pnpm install three@0.165.0 echarts pinia vue-router@4
pnpm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```

This creates the base project, installs all runtime and dev dependencies, and generates tailwind.config.js + postcss.config.js.

- [ ] **Step 2: Configure vite.config.js with path alias**

Write `vite.config.js`:
```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
```

- [ ] **Step 3: Configure tailwind.config.js for dark theme**

Write `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        'dashboard-bg': '#0a0e1a',
        'panel-bg': 'rgba(255,255,255,0.04)',
        'panel-border': 'rgba(255,255,255,0.1)',
        'theme-blue': '#00d4ff',
        'warning': '#ff8c00',
        'danger': '#ff3b3b',
        'success': '#00e676',
        'text-primary': '#e0e6ed',
        'text-secondary': '#8892a4',
      },
      fontFamily: {
        'display': ['system-ui', 'sans-serif'],
        'numbers': ['system-ui', 'sans-serif'],
      }
    }
  },
  plugins: []
}
```

- [ ] **Step 4: Write index.html**

Write `index.html`:
```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>车间运营驾驶舱</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 100%; height: 100%; overflow: hidden; background: #0a0e1a; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 5: Write main.js**

Write `src/main.js`:
```javascript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from '@/router'
import App from '@/App.vue'
import '@/assets/main.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
```

- [ ] **Step 6: Write App.vue with scale adapter**

Write `src/App.vue`:
```vue
<script setup>
import { onMounted, onUnmounted } from 'vue'
import { applyScaleAdapter } from '@/utils/scaleAdapter'

onMounted(() => {
  applyScaleAdapter()
  window.addEventListener('resize', applyScaleAdapter)
})

onUnmounted(() => {
  window.removeEventListener('resize', applyScaleAdapter)
})
</script>

<template>
  <div id="dashboard-root">
    <router-view />
  </div>
</template>

<style>
#dashboard-root {
  width: 1920px;
  height: 1080px;
  transform-origin: top left;
  background: #0a0e1a;
  overflow: hidden;
  position: relative;
}
</style>
```

- [ ] **Step 7: Write scaleAdapter.js**

Write `src/utils/scaleAdapter.js`:
```javascript
export function applyScaleAdapter() {
  const BASE_WIDTH = 1920
  const BASE_HEIGHT = 1080
  const scaleX = window.innerWidth / BASE_WIDTH
  const scaleY = window.innerHeight / BASE_HEIGHT
  const scale = Math.min(scaleX, scaleY)
  const root = document.getElementById('dashboard-root')
  if (root) {
    root.style.transform = `scale(${scale})`
  }
}
```

- [ ] **Step 8: Write formatters.js**

Write `src/utils/formatters.js`:
```javascript
export function formatNumber(num) {
  return Number(num).toLocaleString('zh-CN')
}

export function formatPercent(rate) {
  return `${(rate * 100).toFixed(1)}%`
}

export function formatUnit(value, unit) {
  return `${formatNumber(value)} ${unit}`
}

export function formatTime(date) {
  const d = date || new Date()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export function formatDate(date) {
  const d = date || new Date()
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}
```

- [ ] **Step 9: Write router/index.js**

Write `src/router/index.js`:
```javascript
import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'

const routes = [
  { path: '/', name: 'dashboard', component: DashboardView }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
```

- [ ] **Step 10: Create all 5 mock JSON files**

Write `src/mock/workshop.json`:
```json
{
  "id": "ws-001",
  "name": "1号灌装车间",
  "area": 2400,
  "areaUnit": "㎡",
  "floors": 1,
  "height": 6.5,
  "zones": [
    { "id": "zone-01", "name": "灌装区", "area": 800, "color": "#1a6dff" },
    { "id": "zone-02", "name": "包装区", "area": 600, "color": "#00c48c" },
    { "id": "zone-03", "name": "质检区", "area": 300, "color": "#f7b731" },
    { "id": "zone-04", "name": "暂存区", "area": 700, "color": "#a55eea" }
  ],
  "updatedAt": "2025-05-14T08:00:00Z"
}
```

Write `src/mock/energy.json`:
```json
{
  "workshopId": "ws-001",
  "today": {
    "electricity": { "value": 1280, "unit": "kWh", "cost": 896, "threshold": 1500 },
    "water":       { "value": 42,   "unit": "m³",  "cost": 126, "threshold": 60 },
    "gas":         { "value": 85,   "unit": "m³",  "cost": 340, "threshold": 100 }
  },
  "trend": {
    "labels": ["08:00","09:00","10:00","11:00","12:00","13:00","14:00"],
    "electricity": [120, 145, 160, 155, 90, 130, 148],
    "water":       [4.2, 5.0, 5.8, 5.5, 3.2, 4.8, 5.2],
    "gas":         [10, 12, 14, 13, 8, 11, 12]
  },
  "updatedAt": "2025-05-14T14:00:00Z"
}
```

Write `src/mock/production.json`:
```json
{
  "workshopId": "ws-001",
  "currentShift": "早班",
  "products": [
    { "id": "prod-01", "name": "苹果汁 250ml", "planned": 12000, "actual": 10800, "unit": "瓶", "completionRate": 0.90 },
    { "id": "prod-02", "name": "橙汁 330ml", "planned": 8000, "actual": 7200, "unit": "瓶", "completionRate": 0.90 }
  ],
  "capacityUtilization": 0.85,
  "trend": {
    "labels": ["周一","周二","周三","周四","周五","周六","周日"],
    "output": [18000, 20000, 19500, 21000, 20800, 15000, 0]
  },
  "updatedAt": "2025-05-14T14:00:00Z"
}
```

Write `src/mock/personnel.json`:
```json
{
  "workshopId": "ws-001",
  "totalOnDuty": 24,
  "totalPlanned": 26,
  "attendanceRate": 0.923,
  "positions": [
    { "name": "操作工", "count": 14, "zoneId": "zone-01" },
    { "name": "包装工", "count": 6,  "zoneId": "zone-02" },
    { "name": "质检员", "count": 2,  "zoneId": "zone-03" },
    { "name": "班组长", "count": 2,  "zoneId": null }
  ],
  "updatedAt": "2025-05-14T14:00:00Z"
}
```

Write `src/mock/equipment.json`:
```json
{
  "workshopId": "ws-001",
  "summary": { "total": 24, "running": 20, "stopped": 2, "maintenance": 2 },
  "utilizationRate": 0.83,
  "items": [
    { "id": "eq-001", "name": "灌装机A", "type": "灌装设备", "status": "running", "utilizationRate": 0.92, "position3d": { "x": -8, "y": 0, "z": -4 }, "lastMaintenance": "2025-04-20", "runningHoursToday": 5.5 },
    { "id": "eq-002", "name": "灌装机B", "type": "灌装设备", "status": "maintenance", "utilizationRate": 0, "position3d": { "x": -4, "y": 0, "z": -4 }, "lastMaintenance": "2025-05-14", "runningHoursToday": 0 },
    { "id": "eq-003", "name": "灌装机C", "type": "灌装设备", "status": "running", "utilizationRate": 0.88, "position3d": { "x": -8, "y": 0, "z": 0 }, "lastMaintenance": "2025-04-28", "runningHoursToday": 5.0 },
    { "id": "eq-004", "name": "灌装机D", "type": "灌装设备", "status": "running", "utilizationRate": 0.95, "position3d": { "x": -4, "y": 0, "z": 0 }, "lastMaintenance": "2025-05-01", "runningHoursToday": 5.8 },
    { "id": "eq-005", "name": "灌装机E", "type": "灌装设备", "status": "stopped", "utilizationRate": 0, "position3d": { "x": -8, "y": 0, "z": 4 }, "lastMaintenance": "2025-05-10", "runningHoursToday": 2.0 },
    { "id": "eq-006", "name": "灌装机F", "type": "灌装设备", "status": "running", "utilizationRate": 0.91, "position3d": { "x": -4, "y": 0, "z": 4 }, "lastMaintenance": "2025-04-15", "runningHoursToday": 5.2 },
    { "id": "eq-007", "name": "封口机A", "type": "包装设备", "status": "running", "utilizationRate": 0.85, "position3d": { "x": 2, "y": 0, "z": -6 }, "lastMaintenance": "2025-04-22", "runningHoursToday": 5.0 },
    { "id": "eq-008", "name": "封口机B", "type": "包装设备", "status": "running", "utilizationRate": 0.82, "position3d": { "x": 6, "y": 0, "z": -6 }, "lastMaintenance": "2025-04-30", "runningHoursToday": 4.8 },
    { "id": "eq-009", "name": "封口机C", "type": "包装设备", "status": "maintenance", "utilizationRate": 0, "position3d": { "x": 10, "y": 0, "z": -6 }, "lastMaintenance": "2025-05-13", "runningHoursToday": 1.2 },
    { "id": "eq-010", "name": "封口机D", "type": "包装设备", "status": "running", "utilizationRate": 0.87, "position3d": { "x": 2, "y": 0, "z": -2 }, "lastMaintenance": "2025-04-18", "runningHoursToday": 5.3 },
    { "id": "eq-011", "name": "贴标机A", "type": "包装设备", "status": "running", "utilizationRate": 0.78, "position3d": { "x": 6, "y": 0, "z": -2 }, "lastMaintenance": "2025-05-05", "runningHoursToday": 4.5 },
    { "id": "eq-012", "name": "贴标机B", "type": "包装设备", "status": "stopped", "utilizationRate": 0, "position3d": { "x": 10, "y": 0, "z": -2 }, "lastMaintenance": "2025-05-08", "runningHoursToday": 3.0 },
    { "id": "eq-013", "name": "传送带A", "type": "输送设备", "status": "running", "utilizationRate": 0.96, "position3d": { "x": 2, "y": 0, "z": 2 }, "lastMaintenance": "2025-04-10", "runningHoursToday": 5.8 },
    { "id": "eq-014", "name": "传送带B", "type": "输送设备", "status": "running", "utilizationRate": 0.94, "position3d": { "x": 6, "y": 0, "z": 2 }, "lastMaintenance": "2025-04-12", "runningHoursToday": 5.5 },
    { "id": "eq-015", "name": "传送带C", "type": "输送设备", "status": "running", "utilizationRate": 0.90, "position3d": { "x": 10, "y": 0, "z": 2 }, "lastMaintenance": "2025-04-14", "runningHoursToday": 5.2 },
    { "id": "eq-016", "name": "质检台A", "type": "质检设备", "status": "running", "utilizationRate": 0.75, "position3d": { "x": 2, "y": 0, "z": 6 }, "lastMaintenance": "2025-05-02", "runningHoursToday": 4.0 },
    { "id": "eq-017", "name": "质检台B", "type": "质检设备", "status": "running", "utilizationRate": 0.72, "position3d": { "x": 6, "y": 0, "z": 6 }, "lastMaintenance": "2025-05-03", "runningHoursToday": 3.8 },
    { "id": "eq-018", "name": "质检仪", "type": "质检设备", "status": "running", "utilizationRate": 0.68, "position3d": { "x": 10, "y": 0, "z": 6 }, "lastMaintenance": "2025-04-25", "runningHoursToday": 3.5 },
    { "id": "eq-019", "name": "堆垛机A", "type": "仓储设备", "status": "running", "utilizationRate": 0.88, "position3d": { "x": -4, "y": 0, "z": 10 }, "lastMaintenance": "2025-04-08", "runningHoursToday": 5.0 },
    { "id": "eq-020", "name": "堆垛机B", "type": "仓储设备", "status": "running", "utilizationRate": 0.85, "position3d": { "x": 0, "y": 0, "z": 10 }, "lastMaintenance": "2025-04-09", "runningHoursToday": 4.8 },
    { "id": "eq-021", "name": "叉车A", "type": "仓储设备", "status": "running", "utilizationRate": 0.70, "position3d": { "x": 4, "y": 0, "z": 10 }, "lastMaintenance": "2025-05-06", "runningHoursToday": 4.0 },
    { "id": "eq-022", "name": "叉车B", "type": "仓储设备", "status": "running", "utilizationRate": 0.65, "position3d": { "x": 8, "y": 0, "z": 10 }, "lastMaintenance": "2025-05-07", "runningHoursToday": 3.5 },
    { "id": "eq-023", "name": "控制柜", "type": "辅助设备", "status": "running", "utilizationRate": 1.0, "position3d": { "x": -8, "y": 0, "z": 10 }, "lastMaintenance": "2025-04-05", "runningHoursToday": 6.0 },
    { "id": "eq-024", "name": "空压机", "type": "辅助设备", "status": "running", "utilizationRate": 0.95, "position3d": { "x": -12, "y": 0, "z": 10 }, "lastMaintenance": "2025-04-02", "runningHoursToday": 5.8 }
  ],
  "updatedAt": "2025-05-14T14:00:00Z"
}
```

- [ ] **Step 11: Create API layer files**

Write `src/api/index.js`:
```javascript
export { getWorkshopInfo } from './workshop'
export { getEnergyData } from './energy'
export { getProductionData } from './production'
export { getPersonnelData } from './personnel'
export { getEquipmentData } from './equipment'
```

Write `src/api/workshop.js`:
```javascript
import mockData from '@/mock/workshop.json'

export async function getWorkshopInfo(workshopId) {
  // Phase 1: return mock data; Phase 2: replace with axios call
  return mockData
}
```

Write `src/api/energy.js`:
```javascript
import mockData from '@/mock/energy.json'

export async function getEnergyData(workshopId) {
  return mockData
}
```

Write `src/api/production.js`:
```javascript
import mockData from '@/mock/production.json'

export async function getProductionData(workshopId) {
  return mockData
}
```

Write `src/api/personnel.js`:
```javascript
import mockData from '@/mock/personnel.json'

export async function getPersonnelData(workshopId) {
  return mockData
}
```

Write `src/api/equipment.js`:
```javascript
import mockData from '@/mock/equipment.json'

export async function getEquipmentData(workshopId) {
  return mockData
}
```

- [ ] **Step 12: Create Tailwind entry CSS**

Write `src/assets/main.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Custom scrollbar for dark theme */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
```

- [ ] **Step 13: Create Pinia stores**

Write `src/stores/useWorkshopStore.js`:
```javascript
import { defineStore } from 'pinia'
import { getWorkshopInfo } from '@/api/workshop'
import { getEnergyData } from '@/api/energy'
import { getProductionData } from '@/api/production'
import { getPersonnelData } from '@/api/personnel'

export const useWorkshopStore = defineStore('workshop', {
  state: () => ({
    workshop: null,
    energy: null,
    production: null,
    personnel: null,
    loading: false,
    lastUpdated: null
  }),
  actions: {
    async fetchAll(workshopId = 'ws-001') {
      this.loading = true
      try {
        const [workshop, energy, production, personnel] = await Promise.all([
          getWorkshopInfo(workshopId),
          getEnergyData(workshopId),
          getProductionData(workshopId),
          getPersonnelData(workshopId)
        ])
        this.workshop = workshop
        this.energy = energy
        this.production = production
        this.personnel = personnel
        this.lastUpdated = new Date().toISOString()
      } catch (err) {
        console.error('Failed to fetch workshop data:', err)
      } finally {
        this.loading = false
      }
    }
  }
})
```

Write `src/stores/useEquipmentStore.js`:
```javascript
import { defineStore } from 'pinia'
import { getEquipmentData } from '@/api/equipment'

export const useEquipmentStore = defineStore('equipment', {
  state: () => ({
    equipment: null,
    selectedDeviceId: null,
    loading: false
  }),
  getters: {
    deviceList(state) {
      return state.equipment?.items ?? []
    },
    summary(state) {
      return state.equipment?.summary ?? { total: 0, running: 0, stopped: 0, maintenance: 0 }
    },
    utilizationRate(state) {
      return state.equipment?.utilizationRate ?? 0
    },
    selectedDevice(state) {
      if (!state.selectedDeviceId || !state.equipment?.items) return null
      return state.equipment.items.find(d => d.id === state.selectedDeviceId) ?? null
    }
  },
  actions: {
    async fetchEquipment(workshopId = 'ws-001') {
      this.loading = true
      try {
        this.equipment = await getEquipmentData(workshopId)
      } catch (err) {
        console.error('Failed to fetch equipment data:', err)
      } finally {
        this.loading = false
      }
    },
    selectDevice(deviceId) {
      this.selectedDeviceId = deviceId
    },
    clearSelection() {
      this.selectedDeviceId = null
    }
  }
})
```

- [ ] **Step 14: Create .gitkeep for assets**

Create empty file `src/assets/.gitkeep` (empty file).

- [ ] **Step 15: Verify project runs**

```bash
cd "/d/claude code text/一家园工厂可视化项目/workshop-dashboard"
pnpm dev
```

Expected: Vite dev server starts on http://localhost:5173, page loads with dark background (no content yet).

---

### Task 2: Main Dashboard Layout

**Files:**
- Create: `src/views/DashboardView.vue`
- Create: `src/components/layout/LeftPanel.vue`
- Create: `src/components/layout/RightPanel.vue`

- [ ] **Step 1: Write DashboardView.vue with full grid layout**

Write `src/views/DashboardView.vue`:
```vue
<script setup>
import { onMounted } from 'vue'
import { useWorkshopStore } from '@/stores/useWorkshopStore'
import { useEquipmentStore } from '@/stores/useEquipmentStore'
import DashboardHeader from '@/components/layout/DashboardHeader.vue'
import LeftPanel from '@/components/layout/LeftPanel.vue'
import RightPanel from '@/components/layout/RightPanel.vue'
import BottomBar from '@/components/layout/BottomBar.vue'
import WorkshopScene from '@/components/scene/WorkshopScene.vue'
import WorkshopInfoPanel from '@/components/panels/WorkshopInfoPanel.vue'
import EnergyPanel from '@/components/panels/EnergyPanel.vue'
import PersonnelPanel from '@/components/panels/PersonnelPanel.vue'
import ProductionPanel from '@/components/panels/ProductionPanel.vue'
import EquipmentPanel from '@/components/panels/EquipmentPanel.vue'

const workshopStore = useWorkshopStore()
const equipmentStore = useEquipmentStore()

onMounted(async () => {
  await Promise.all([
    workshopStore.fetchAll(),
    equipmentStore.fetchEquipment()
  ])
})
</script>

<template>
  <div class="dashboard">
    <DashboardHeader />
    <div class="dashboard-body">
      <LeftPanel>
        <WorkshopInfoPanel />
        <EnergyPanel />
        <PersonnelPanel />
      </LeftPanel>
      <div class="scene-area">
        <WorkshopScene />
      </div>
      <RightPanel>
        <ProductionPanel />
        <EquipmentPanel />
      </RightPanel>
    </div>
    <BottomBar />
  </div>
</template>

<style scoped>
.dashboard {
  width: 1920px;
  height: 1080px;
  display: flex;
  flex-direction: column;
  background: #0a0e1a;
  color: #e0e6ed;
}

.dashboard-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.scene-area {
  flex: 1;
  position: relative;
  min-width: 0;
}
</style>
```

- [ ] **Step 2: Write LeftPanel.vue**

Write `src/components/layout/LeftPanel.vue`:
```vue
<template>
  <div class="left-panel">
    <slot />
  </div>
</template>

<style scoped>
.left-panel {
  width: 380px;
  flex-shrink: 0;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
```

- [ ] **Step 3: Write RightPanel.vue**

Write `src/components/layout/RightPanel.vue`:
```vue
<template>
  <div class="right-panel">
    <slot />
  </div>
</template>

<style scoped>
.right-panel {
  width: 380px;
  flex-shrink: 0;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
```

---

### Task 3: Dashboard Header & Bottom Bar

**Files:**
- Create: `src/components/layout/DashboardHeader.vue`
- Create: `src/components/layout/BottomBar.vue`

- [ ] **Step 1: Write DashboardHeader.vue**

Write `src/components/layout/DashboardHeader.vue`:
```vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useWorkshopStore } from '@/stores/useWorkshopStore'
import { useEquipmentStore } from '@/stores/useEquipmentStore'
import { formatTime, formatDate } from '@/utils/formatters'

const workshopStore = useWorkshopStore()
const equipmentStore = useEquipmentStore()

const now = ref(new Date())
let timer = null

onMounted(() => {
  timer = setInterval(() => { now.value = new Date() }, 1000)
})

onUnmounted(() => {
  clearInterval(timer)
})

const alertCount = () => {
  const eq = equipmentStore.equipment
  if (!eq) return 0
  return eq.summary.maintenance + eq.summary.stopped
}
</script>

<template>
  <header class="dashboard-header">
    <div class="header-left">
      <div class="logo-placeholder">
        <span class="logo-icon">🏭</span>
      </div>
      <span class="project-title">车间运营驾驶舱</span>
    </div>
    <div class="header-center">
      <h1 class="workshop-name">{{ workshopStore.workshop?.name ?? '加载中...' }}</h1>
      <div class="header-clock">
        {{ formatDate(now) }} {{ formatTime(now) }}
      </div>
    </div>
    <div class="header-right">
      <div v-if="alertCount() > 0" class="alert-badge">
        <span class="alert-dot"></span>
        <span>{{ alertCount() }} 个报警</span>
      </div>
      <div class="update-time" v-if="workshopStore.lastUpdated">
        更新: {{ formatTime(new Date(workshopStore.lastUpdated)) }}
      </div>
      <span class="demo-badge">演示模式</span>
    </div>
  </header>
</template>

<style scoped>
.dashboard-header {
  height: 72px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: rgba(255,255,255,0.03);
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-placeholder {
  width: 40px; height: 40px;
  background: rgba(0,212,255,0.15);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px;
}

.project-title {
  font-size: 16px;
  color: #8892a4;
  letter-spacing: 2px;
}

.header-center {
  text-align: center;
}

.workshop-name {
  font-size: 24px;
  font-weight: 600;
  color: #e0e6ed;
  margin-bottom: 4px;
}

.header-clock {
  font-size: 14px;
  color: #00d4ff;
  font-variant-numeric: tabular-nums;
  letter-spacing: 1px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.alert-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: rgba(255,59,59,0.12);
  border: 1px solid rgba(255,59,59,0.3);
  border-radius: 4px;
  font-size: 13px;
  color: #ff3b3b;
}

.alert-dot {
  width: 6px; height: 6px;
  background: #ff3b3b;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.update-time {
  font-size: 12px;
  color: #5a6577;
}

.demo-badge {
  padding: 2px 10px;
  font-size: 12px;
  color: #00d4ff;
  border: 1px solid rgba(0,212,255,0.3);
  border-radius: 4px;
}
</style>
```

- [ ] **Step 2: Write BottomBar.vue**

Write `src/components/layout/BottomBar.vue`:
```vue
<script setup>
import { computed } from 'vue'
import { useWorkshopStore } from '@/stores/useWorkshopStore'
import { useEquipmentStore } from '@/stores/useEquipmentStore'

const workshopStore = useWorkshopStore()
const equipmentStore = useEquipmentStore()

const items = computed(() => {
  const s = equipmentStore.equipment?.summary ?? {}
  const p = workshopStore.production
  const pr = workshopStore.personnel
  return [
    { label: '总设备', value: s.total ?? 0, color: '#e0e6ed' },
    { label: '运行中', value: s.running ?? 0, color: '#00e676' },
    { label: '停机', value: s.stopped ?? 0, color: '#ff8c00' },
    { label: '维修', value: s.maintenance ?? 0, color: '#ff3b3b' },
    { label: '在岗人数', value: pr?.totalOnDuty ?? 0, color: '#00d4ff' },
    { label: '今日产量', value: p?.products?.reduce((a, b) => a + b.actual, 0) ?? 0, color: '#00d4ff' },
  ]
})
</script>

<template>
  <footer class="bottom-bar">
    <div
      v-for="item in items"
      :key="item.label"
      class="bar-item"
    >
      <span class="bar-label">{{ item.label }}</span>
      <span class="bar-value" :style="{ color: item.color }">
        {{ item.value.toLocaleString() }}
      </span>
    </div>
  </footer>
</template>

<style scoped>
.bottom-bar {
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 48px;
  background: rgba(255,255,255,0.03);
  border-top: 1px solid rgba(255,255,255,0.08);
  padding: 0 24px;
}

.bar-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.bar-label {
  font-size: 13px;
  color: #8892a4;
}

.bar-value {
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
</style>
```

---

### Task 4: Chart Components

**Files:**
- Create: `src/components/charts/LineChart.vue`
- Create: `src/components/charts/RingChart.vue`
- Create: `src/components/charts/BarChart.vue`
- Create: `src/components/charts/GaugeChart.vue`
- Create: `src/components/charts/StatusPill.vue`

- [ ] **Step 1: Write LineChart.vue — general-purpose trend line chart**

Write `src/components/charts/LineChart.vue`:
```vue
<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  data: { type: Object, required: true },
  smooth: { type: Boolean, default: true },
  height: { type: Number, default: 160 }
})

const chartRef = ref(null)
let chart = null

function render() {
  if (!chart || !props.data) return
  chart.setOption({
    tooltip: {
      trigger: 'axis',
      theme: 'dark',
      backgroundColor: 'rgba(10,14,26,0.9)',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#e0e6ed', fontSize: 12 }
    },
    grid: { top: 20, right: 12, bottom: 20, left: 40 },
    xAxis: {
      type: 'category',
      data: props.data.labels,
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      axisLabel: { color: '#5a6577', fontSize: 10 },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
      axisLabel: { color: '#5a6577', fontSize: 10 }
    },
    series: [{
      type: 'line',
      data: props.data.values,
      smooth: props.smooth,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { width: 2, color: '#00d4ff' },
      itemStyle: { color: '#00d4ff' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(0,212,255,0.25)' },
          { offset: 1, color: 'rgba(0,212,255,0.02)' }
        ])
      }
    }]
  })
}

watch(() => props.data, () => { nextTick(render) }, { deep: true })

onMounted(() => {
  chart = echarts.init(chartRef.value, null, { renderer: 'canvas' })
  render()
  window.addEventListener('resize', () => chart?.resize())
})

onUnmounted(() => {
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div ref="chartRef" :style="{ width: '100%', height: height + 'px' }"></div>
</template>
```

- [ ] **Step 2: Write RingChart.vue — donut chart with center total**

Write `src/components/charts/RingChart.vue`:
```vue
<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  data: { type: Array, required: true },
  centerText: { type: String, default: '' },
  height: { type: Number, default: 160 }
})

const chartRef = ref(null)
let chart = null

function render() {
  if (!chart) return
  const total = props.data.reduce((s, d) => s + d.value, 0)
  chart.setOption({
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(10,14,26,0.9)',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#e0e6ed', fontSize: 12 },
      formatter: '{b}: {c} ({d}%)'
    },
    series: [{
      type: 'pie',
      radius: ['50%', '75%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: false,
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 13, fontWeight: 'bold', color: '#e0e6ed' },
        itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' }
      },
      data: props.data.map(d => ({
        ...d,
        itemStyle: { color: d.color || '#00d4ff' }
      }))
    }]
  })
}

watch(() => props.data, () => { nextTick(render) }, { deep: true })

onMounted(() => {
  chart = echarts.init(chartRef.value, null, { renderer: 'canvas' })
  render()
  window.addEventListener('resize', () => chart?.resize())
})

onUnmounted(() => {
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div ref="chartRef" :style="{ width: '100%', height: height + 'px', position: 'relative' }">
    <div class="center-label" v-if="centerText">
      <span class="center-value">{{ centerText }}</span>
    </div>
  </div>
</template>

<style scoped>
.center-label {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  text-align: center;
}

.center-value {
  font-size: 18px;
  font-weight: 700;
  color: #e0e6ed;
  font-variant-numeric: tabular-nums;
}
</style>
```

- [ ] **Step 3: Write BarChart.vue — grouped/stacked bar chart**

Write `src/components/charts/BarChart.vue`:
```vue
<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  data: { type: Object, required: true },
  height: { type: Number, default: 160 }
})

const chartRef = ref(null)
let chart = null

function render() {
  if (!chart) return
  chart.setOption({
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(10,14,26,0.9)',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#e0e6ed', fontSize: 12 }
    },
    grid: { top: 20, right: 12, bottom: 24, left: 44 },
    xAxis: {
      type: 'category',
      data: props.data.labels,
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      axisLabel: { color: '#5a6577', fontSize: 10 },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
      axisLabel: { color: '#5a6577', fontSize: 10 }
    },
    series: props.data.series.map(s => ({
      type: 'bar',
      barWidth: '60%',
      ...s,
      itemStyle: {
        color: s.color || '#00d4ff',
        borderRadius: [2, 2, 0, 0]
      }
    }))
  })
}

watch(() => props.data, () => { nextTick(render) }, { deep: true })

onMounted(() => {
  chart = echarts.init(chartRef.value, null, { renderer: 'canvas' })
  render()
  window.addEventListener('resize', () => chart?.resize())
})

onUnmounted(() => {
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div ref="chartRef" :style="{ width: '100%', height: height + 'px' }"></div>
</template>
```

- [ ] **Step 4: Write GaugeChart.vue — capacity utilization gauge**

Write `src/components/charts/GaugeChart.vue`:
```vue
<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  value: { type: Number, required: true },
  max: { type: Number, default: 1 },
  height: { type: Number, default: 140 }
})

const chartRef = ref(null)
let chart = null

function render() {
  if (!chart) return
  const pct = (props.value / props.max) * 100
  const color = pct < 60 ? '#ff3b3b' : pct < 80 ? '#ff8c00' : '#00e676'

  chart.setOption({
    series: [{
      type: 'gauge',
      center: ['50%', '65%'],
      radius: '85%',
      startAngle: 210,
      endAngle: -30,
      min: 0,
      max: props.max,
      splitNumber: 5,
      progress: {
        show: true,
        width: 8,
        itemStyle: { color }
      },
      axisLine: {
        lineStyle: {
          width: 8,
          color: [[1, 'rgba(255,255,255,0.08)']]
        }
      },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: {
        offsetCenter: [0, 30],
        valueAnimation: true,
        formatter: `{value}%`,
        fontSize: 18,
        fontWeight: 700,
        color: '#e0e6ed'
      },
      data: [{ value: Math.round(pct * 10) / 10 }]
    }]
  })
}

watch(() => props.value, () => { nextTick(render) })

onMounted(() => {
  chart = echarts.init(chartRef.value, null, { renderer: 'canvas' })
  render()
  window.addEventListener('resize', () => chart?.resize())
})

onUnmounted(() => {
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div ref="chartRef" :style="{ width: '100%', height: height + 'px' }"></div>
</template>
```

- [ ] **Step 5: Write StatusPill.vue — device status badge**

Write `src/components/charts/StatusPill.vue`:
```vue
<script setup>
defineProps({
  status: { type: String, required: true }
})

const statusMap = {
  running: { label: '运行中', color: '#00e676', bg: 'rgba(0,230,118,0.12)' },
  stopped: { label: '停机', color: '#ff8c00', bg: 'rgba(255,140,0,0.12)' },
  maintenance: { label: '维修中', color: '#ff3b3b', bg: 'rgba(255,59,59,0.12)' }
}
</script>

<template>
  <span
    class="status-pill"
    :style="{
      color: statusMap[status]?.color || '#8892a4',
      background: statusMap[status]?.bg || 'rgba(255,255,255,0.05)',
    }"
  >
    {{ statusMap[status]?.label || status }}
  </span>
</template>

<style scoped>
.status-pill {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}
</style>
```

---

### Task 5: Data Panels

**Files:**
- Create: `src/components/panels/WorkshopInfoPanel.vue`
- Create: `src/components/panels/EnergyPanel.vue`
- Create: `src/components/panels/ProductionPanel.vue`
- Create: `src/components/panels/PersonnelPanel.vue`
- Create: `src/components/panels/EquipmentPanel.vue`

- [ ] **Step 1: Write WorkshopInfoPanel.vue**

Write `src/components/panels/WorkshopInfoPanel.vue`:
```vue
<script setup>
import { useWorkshopStore } from '@/stores/useWorkshopStore'

const store = useWorkshopStore()
</script>

<template>
  <div class="panel" v-if="store.workshop">
    <h3 class="panel-title">车间概况</h3>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">面积</span>
        <span class="info-value">{{ store.workshop.area }} {{ store.workshop.areaUnit }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">层高</span>
        <span class="info-value">{{ store.workshop.height }}m</span>
      </div>
      <div class="info-item">
        <span class="info-label">楼层</span>
        <span class="info-value">{{ store.workshop.floors }}F</span>
      </div>
      <div class="info-item">
        <span class="info-label">区域数</span>
        <span class="info-value">{{ store.workshop.zones.length }}</span>
      </div>
    </div>
    <div class="zones-list">
      <div v-for="zone in store.workshop.zones" :key="zone.id" class="zone-row">
        <span class="zone-dot" :style="{ background: zone.color }"></span>
        <span class="zone-name">{{ zone.name }}</span>
        <span class="zone-area">{{ zone.area }} ㎡</span>
      </div>
    </div>
  </div>
  <div class="panel" v-else>
    <h3 class="panel-title">车间概况</h3>
    <p class="loading-text">加载中...</p>
  </div>
</template>

<style scoped>
.panel {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 16px;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #00d4ff;
  margin-bottom: 12px;
  padding-left: 10px;
  border-left: 2px solid #00d4ff;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: 11px;
  color: #5a6577;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 16px;
  font-weight: 600;
  color: #e0e6ed;
  font-variant-numeric: tabular-nums;
}

.zones-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.zone-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.zone-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.zone-name {
  flex: 1;
  font-size: 13px;
  color: #c0c8d4;
}

.zone-area {
  font-size: 12px;
  color: #5a6577;
  font-variant-numeric: tabular-nums;
}

.loading-text {
  color: #5a6577;
  font-size: 13px;
  text-align: center;
  padding: 20px 0;
}
</style>
```

- [ ] **Step 2: Write EnergyPanel.vue**

Write `src/components/panels/EnergyPanel.vue`:
```vue
<script setup>
import { computed } from 'vue'
import { useWorkshopStore } from '@/stores/useWorkshopStore'
import LineChart from '@/components/charts/LineChart.vue'
import RingChart from '@/components/charts/RingChart.vue'
import { formatUnit } from '@/utils/formatters'

const store = useWorkshopStore()

const trendData = computed(() => {
  const e = store.energy?.trend
  if (!e) return null
  return { labels: e.labels, values: e.electricity }
})

const ringData = computed(() => {
  const t = store.energy?.today
  if (!t) return []
  return [
    { name: '电力', value: t.electricity.value, color: '#00d4ff' },
    { name: '水', value: t.water.value, color: '#00c48c' },
    { name: '燃气', value: t.gas.value, color: '#f7b731' },
  ]
})

const thresholdColor = (current, threshold) => {
  const ratio = current / threshold
  if (ratio >= 0.9) return '#ff3b3b'
  if (ratio >= 0.75) return '#ff8c00'
  return '#e0e6ed'
}
</script>

<template>
  <div class="panel" v-if="store.energy">
    <h3 class="panel-title">能耗监控</h3>

    <div class="energy-cards">
      <div class="energy-card">
        <span class="energy-label">电力</span>
        <span class="energy-value" :style="{ color: thresholdColor(store.energy.today.electricity.value, store.energy.today.electricity.threshold) }">
          {{ formatUnit(store.energy.today.electricity.value, store.energy.today.electricity.unit) }}
        </span>
      </div>
      <div class="energy-card">
        <span class="energy-label">水</span>
        <span class="energy-value" :style="{ color: thresholdColor(store.energy.today.water.value, store.energy.today.water.threshold) }">
          {{ formatUnit(store.energy.today.water.value, store.energy.today.water.unit) }}
        </span>
      </div>
      <div class="energy-card">
        <span class="energy-label">燃气</span>
        <span class="energy-value" :style="{ color: thresholdColor(store.energy.today.gas.value, store.energy.today.gas.threshold) }">
          {{ formatUnit(store.energy.today.gas.value, store.energy.today.gas.unit) }}
        </span>
      </div>
    </div>

    <div class="chart-section">
      <span class="chart-label">电力趋势</span>
      <LineChart v-if="trendData" :data="trendData" :height="120" />
    </div>

    <div class="chart-section">
      <span class="chart-label">能耗占比</span>
      <RingChart :data="ringData" :height="120" />
    </div>
  </div>
  <div class="panel" v-else>
    <h3 class="panel-title">能耗监控</h3>
    <p class="loading-text">加载中...</p>
  </div>
</template>

<style scoped>
.panel {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 16px;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #00d4ff;
  margin-bottom: 12px;
  padding-left: 10px;
  border-left: 2px solid #00d4ff;
}

.energy-cards {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.energy-card {
  text-align: center;
  padding: 8px 4px;
  background: rgba(255,255,255,0.03);
  border-radius: 6px;
}

.energy-label {
  display: block;
  font-size: 11px;
  color: #5a6577;
  margin-bottom: 4px;
}

.energy-value {
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.chart-section {
  margin-top: 12px;
}

.chart-label {
  display: block;
  font-size: 12px;
  color: #8892a4;
  margin-bottom: 6px;
}

.loading-text {
  color: #5a6577;
  font-size: 13px;
  text-align: center;
  padding: 20px 0;
}
</style>
```

- [ ] **Step 3: Write PersonnelPanel.vue**

Write `src/components/panels/PersonnelPanel.vue`:
```vue
<script setup>
import { computed } from 'vue'
import { useWorkshopStore } from '@/stores/useWorkshopStore'
import BarChart from '@/components/charts/BarChart.vue'
import { formatPercent } from '@/utils/formatters'

const store = useWorkshopStore()

const positionData = computed(() => {
  const p = store.personnel
  if (!p) return null
  return {
    labels: p.positions.map(pos => pos.name),
    series: [{
      name: '人数',
      data: p.positions.map(pos => pos.count),
      color: '#00d4ff'
    }]
  }
})
</script>

<template>
  <div class="panel" v-if="store.personnel">
    <h3 class="panel-title">人员信息</h3>

    <div class="personnel-summary">
      <div class="personnel-main">
        <span class="personnel-big">{{ store.personnel.totalOnDuty }}</span>
        <span class="personnel-unit">人在岗</span>
      </div>
      <div class="personnel-attendance">
        <span class="attendance-label">到岗率</span>
        <span class="attendance-value">{{ formatPercent(store.personnel.attendanceRate) }}</span>
      </div>
    </div>

    <div class="chart-section">
      <span class="chart-label">岗位分布</span>
      <BarChart v-if="positionData" :data="positionData" :height="120" />
    </div>
  </div>
  <div class="panel" v-else>
    <h3 class="panel-title">人员信息</h3>
    <p class="loading-text">加载中...</p>
  </div>
</template>

<style scoped>
.panel {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 16px;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #00d4ff;
  margin-bottom: 12px;
  padding-left: 10px;
  border-left: 2px solid #00d4ff;
}

.personnel-summary {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 12px;
}

.personnel-main {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.personnel-big {
  font-size: 36px;
  font-weight: 700;
  color: #00d4ff;
  font-variant-numeric: tabular-nums;
}

.personnel-unit {
  font-size: 14px;
  color: #5a6577;
}

.personnel-attendance {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.attendance-label {
  font-size: 11px;
  color: #5a6577;
}

.attendance-value {
  font-size: 20px;
  font-weight: 600;
  color: #00e676;
  font-variant-numeric: tabular-nums;
}

.chart-section {
  margin-top: 8px;
}

.chart-label {
  display: block;
  font-size: 12px;
  color: #8892a4;
  margin-bottom: 6px;
}

.loading-text {
  color: #5a6577;
  font-size: 13px;
  text-align: center;
  padding: 20px 0;
}
</style>
```

- [ ] **Step 4: Write ProductionPanel.vue**

Write `src/components/panels/ProductionPanel.vue`:
```vue
<script setup>
import { computed } from 'vue'
import { useWorkshopStore } from '@/stores/useWorkshopStore'
import BarChart from '@/components/charts/BarChart.vue'
import GaugeChart from '@/components/charts/GaugeChart.vue'
import { formatNumber } from '@/utils/formatters'

const store = useWorkshopStore()

const trendData = computed(() => {
  const p = store.production?.trend
  if (!p) return null
  return {
    labels: p.labels,
    series: [{ name: '产量', data: p.output, color: '#00d4ff' }]
  }
})

const completionColor = (rate) => {
  if (rate >= 1) return '#00e676'
  if (rate >= 0.8) return '#ff8c00'
  return '#ff3b3b'
}
</script>

<template>
  <div class="panel" v-if="store.production">
    <h3 class="panel-title">生产产量</h3>

    <div class="shift-info">
      <span class="shift-label">当前班次</span>
      <span class="shift-value">{{ store.production.currentShift }}</span>
    </div>

    <div class="product-list">
      <div v-for="prod in store.production.products" :key="prod.id" class="product-row">
        <div class="product-header">
          <span class="product-name">{{ prod.name }}</span>
          <span class="product-rate" :style="{ color: completionColor(prod.completionRate) }">
            {{ (prod.completionRate * 100).toFixed(0) }}%
          </span>
        </div>
        <div class="product-bar-track">
          <div
            class="product-bar-fill"
            :style="{ width: (prod.completionRate * 100) + '%', background: completionColor(prod.completionRate) }"
          ></div>
        </div>
        <div class="product-nums">
          <span class="product-actual">{{ formatNumber(prod.actual) }} / {{ formatNumber(prod.planned) }}</span>
          <span class="product-unit">{{ prod.unit }}</span>
        </div>
      </div>
    </div>

    <GaugeChart :value="store.production.capacityUtilization" :height="120" />
    <div class="gauge-label">产能利用率</div>

    <div class="chart-section">
      <span class="chart-label">周产量趋势</span>
      <BarChart v-if="trendData" :data="trendData" :height="120" />
    </div>
  </div>
  <div class="panel" v-else>
    <h3 class="panel-title">生产产量</h3>
    <p class="loading-text">加载中...</p>
  </div>
</template>

<style scoped>
.panel {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 16px;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #00d4ff;
  margin-bottom: 12px;
  padding-left: 10px;
  border-left: 2px solid #00d4ff;
}

.shift-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.shift-label {
  font-size: 12px;
  color: #5a6577;
}

.shift-value {
  font-size: 14px;
  font-weight: 600;
  color: #e0e6ed;
  padding: 2px 10px;
  background: rgba(0,212,255,0.1);
  border-radius: 4px;
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.product-row {
  padding: 8px;
  background: rgba(255,255,255,0.03);
  border-radius: 6px;
}

.product-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.product-name {
  font-size: 12px;
  color: #c0c8d4;
}

.product-rate {
  font-size: 13px;
  font-weight: 600;
}

.product-bar-track {
  height: 4px;
  background: rgba(255,255,255,0.08);
  border-radius: 2px;
  margin-bottom: 4px;
  overflow: hidden;
}

.product-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.5s ease;
}

.product-nums {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
}

.product-actual {
  color: #5a6577;
  font-variant-numeric: tabular-nums;
}

.product-unit {
  color: #5a6577;
}

.gauge-label {
  text-align: center;
  font-size: 12px;
  color: #5a6577;
  margin-bottom: 12px;
  margin-top: -8px;
}

.chart-section {
  margin-top: 8px;
}

.chart-label {
  display: block;
  font-size: 12px;
  color: #8892a4;
  margin-bottom: 6px;
}

.loading-text {
  color: #5a6577;
  font-size: 13px;
  text-align: center;
  padding: 20px 0;
}
</style>
```

- [ ] **Step 5: Write EquipmentPanel.vue**

Write `src/components/panels/EquipmentPanel.vue`:
```vue
<script setup>
import { computed, ref } from 'vue'
import { useEquipmentStore } from '@/stores/useEquipmentStore'
import StatusPill from '@/components/charts/StatusPill.vue'
import { formatPercent } from '@/utils/formatters'

const store = useEquipmentStore()
const filterStatus = ref('all')

const filteredList = computed(() => {
  const list = store.deviceList
  if (filterStatus.value === 'all') return list
  return list.filter(d => d.status === filterStatus.value)
})

const statusCounts = computed(() => {
  const s = store.summary
  return [
    { status: 'all', label: '全部', count: s.total, color: '#e0e6ed' },
    { status: 'running', label: '运行', count: s.running, color: '#00e676' },
    { status: 'stopped', label: '停机', count: s.stopped, color: '#ff8c00' },
    { status: 'maintenance', label: '维修', count: s.maintenance, color: '#ff3b3b' },
  ]
})
</script>

<template>
  <div class="panel" v-if="store.equipment">
    <h3 class="panel-title">设备状态</h3>

    <div class="equipment-summary">
      <div class="utilization-card">
        <span class="util-label">综合利用率</span>
        <span class="util-value">{{ formatPercent(store.utilizationRate) }}</span>
      </div>
    </div>

    <div class="status-tabs">
      <button
        v-for="tab in statusCounts"
        :key="tab.status"
        class="status-tab"
        :class="{ active: filterStatus === tab.status }"
        :style="{
          '--tab-color': tab.color,
          '--tab-bg': filterStatus === tab.status ? tab.color + '20' : 'transparent'
        }"
        @click="filterStatus = tab.status"
      >
        <span class="tab-count" :style="{ color: tab.color }">{{ tab.count }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <div class="device-list">
      <div
        v-for="device in filteredList"
        :key="device.id"
        class="device-row"
        :class="{ selected: store.selectedDeviceId === device.id }"
        @click="store.selectDevice(device.id)"
      >
        <div class="device-left">
          <span class="device-name">{{ device.name }}</span>
          <span class="device-type">{{ device.type }}</span>
        </div>
        <div class="device-right">
          <span class="device-util">{{ (device.utilizationRate * 100).toFixed(0) }}%</span>
          <StatusPill :status="device.status" />
        </div>
      </div>
    </div>
  </div>
  <div class="panel" v-else>
    <h3 class="panel-title">设备状态</h3>
    <p class="loading-text">加载中...</p>
  </div>
</template>

<style scoped>
.panel {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 16px;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #00d4ff;
  margin-bottom: 12px;
  padding-left: 10px;
  border-left: 2px solid #00d4ff;
}

.equipment-summary {
  margin-bottom: 12px;
}

.utilization-card {
  text-align: center;
  padding: 8px;
  background: rgba(255,255,255,0.03);
  border-radius: 6px;
}

.util-label {
  display: block;
  font-size: 11px;
  color: #5a6577;
  margin-bottom: 4px;
}

.util-value {
  font-size: 22px;
  font-weight: 700;
  color: #00d4ff;
  font-variant-numeric: tabular-nums;
}

.status-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}

.status-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 4px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.status-tab.active {
  border-color: var(--tab-color);
  background: var(--tab-bg);
}

.tab-count {
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.tab-label {
  font-size: 10px;
  color: #5a6577;
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 280px;
  overflow-y: auto;
}

.device-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: rgba(255,255,255,0.02);
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.device-row:hover {
  background: rgba(255,255,255,0.06);
}

.device-row.selected {
  border-color: rgba(0,212,255,0.3);
  background: rgba(0,212,255,0.06);
}

.device-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.device-name {
  font-size: 13px;
  color: #e0e6ed;
}

.device-type {
  font-size: 11px;
  color: #5a6577;
}

.device-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.device-util {
  font-size: 13px;
  font-weight: 500;
  color: #8892a4;
  font-variant-numeric: tabular-nums;
}

.loading-text {
  color: #5a6577;
  font-size: 13px;
  text-align: center;
  padding: 20px 0;
}
</style>
```

---

### Task 6: Three.js 3D Scene

**Files:**
- Create: `src/components/scene/WorkshopScene.vue`
- Create: `src/components/scene/useThreeScene.js`
- Create: `src/components/scene/WorkshopModel.js`
- Create: `src/components/scene/EquipmentMarkers.js`
- Create: `src/components/scene/PersonnelMarkers.js`
- Create: `src/components/scene/InfoLabel.js`

- [ ] **Step 1: Write useThreeScene.js — scene initialization composable**

Write `src/components/scene/useThreeScene.js`:
```javascript
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'

export function useThreeScene() {
  let scene, camera, renderer, labelRenderer, controls
  let animationId = null

  function initScene(container) {
    const width = container.clientWidth
    const height = container.clientHeight

    // Scene
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0d1117)

    // Camera
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(0, 20, 30)
    camera.lookAt(0, 0, 0)

    // WebGL Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)

    // CSS2D Renderer (labels)
    labelRenderer = new CSS2DRenderer()
    labelRenderer.setSize(width, height)
    labelRenderer.domElement.style.position = 'absolute'
    labelRenderer.domElement.style.top = '0'
    labelRenderer.domElement.style.pointerEvents = 'none'
    container.appendChild(labelRenderer.domElement)

    // Controls
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minPolarAngle = Math.PI / 6
    controls.maxPolarAngle = Math.PI / 2.2
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.3
    controls.target.set(0, 0, 0)
    controls.update()

    // Lights
    const ambientLight = new THREE.AmbientLight(0x334466, 0.8)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
    dirLight.position.set(15, 25, 10)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 1024
    dirLight.shadow.mapSize.height = 1024
    scene.add(dirLight)

    // Grid
    const grid = new THREE.GridHelper(40, 40, 0x1a2a4a, 0x1a2a4a)
    scene.add(grid)

    // Resize
    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      labelRenderer.setSize(w, h)
    })
    resizeObserver.observe(container)

    return { scene, camera, renderer, labelRenderer, controls, resizeObserver }
  }

  function startAnimation() {
    function animate() {
      animationId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
      labelRenderer.render(scene, camera)
    }
    animate()
  }

  function stopAnimation() {
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
  }

  function dispose() {
    stopAnimation()
    renderer?.dispose()
    labelRenderer?.dispose()
    scene?.clear()
  }

  return { initScene, startAnimation, stopAnimation, dispose }
}
```

- [ ] **Step 2: Write WorkshopModel.js — building geometry**

Write `src/components/scene/WorkshopModel.js`:
```javascript
import * as THREE from 'three'

export function buildWorkshopModel(scene, workshopData) {
  const group = new THREE.Group()

  // Floor
  const floorGeo = new THREE.PlaneGeometry(28, 20)
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    roughness: 0.8,
    metalness: 0.2
  })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.set(0, -0.05, 2)
  floor.receiveShadow = true
  group.add(floor)

  // Zone indicators (colored floor panels)
  if (workshopData.zones) {
    const zonePositions = {
      'zone-01': { x: -7, z: -4 },  // 灌装区
      'zone-02': { x: 6, z: -4 },   // 包装区
      'zone-03': { x: -7, z: 6 },   // 质检区
      'zone-04': { x: 6, z: 6 },    // 暂存区
    }

    workshopData.zones.forEach(zone => {
      const pos = zonePositions[zone.id] || { x: 0, z: 0 }
      const zoneGeo = new THREE.PlaneGeometry(12, 8)
      const zoneMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(zone.color),
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide
      })
      const zoneMesh = new THREE.Mesh(zoneGeo, zoneMat)
      zoneMesh.rotation.x = -Math.PI / 2
      zoneMesh.position.set(pos.x, 0.01, pos.z)
      group.add(zoneMesh)

      // Zone border
      const borderGeo = new THREE.EdgesGeometry(zoneGeo)
      const borderMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(zone.color),
        transparent: true,
        opacity: 0.3
      })
      const border = new THREE.LineSegments(borderGeo, borderMat)
      border.rotation.x = -Math.PI / 2
      border.position.set(pos.x, 0.02, pos.z)
      group.add(border)
    })
  }

  // Walls (semi-transparent)
  const wallMat = new THREE.MeshPhysicalMaterial({
    color: 0x4a6fa5,
    transparent: true,
    opacity: 0.10,
    roughness: 0.5,
    metalness: 0.1,
    side: THREE.DoubleSide
  })

  const wallPositions = [
    { pos: [0, 3, -6], scale: [28, 6, 0.1] },   // front
    { pos: [0, 3, 10], scale: [28, 6, 0.1] },    // back
    { pos: [-14, 3, 2], scale: [0.1, 6, 16] },   // left
    { pos: [14, 3, 2], scale: [0.1, 6, 16] },    // right
  ]

  wallPositions.forEach(({ pos, scale }) => {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(...scale),
      wallMat
    )
    wall.position.set(pos[0], pos[1], pos[2])
    group.add(wall)
  })

  scene.add(group)
  return group
}
```

- [ ] **Step 3: Write EquipmentMarkers.js — 3D device markers with status colors**

Write `src/components/scene/EquipmentMarkers.js`:
```javascript
import * as THREE from 'three'

const STATUS_COLORS = {
  running: 0x00e676,
  stopped: 0xff8c00,
  maintenance: 0xff3b3b
}

export function buildEquipmentMarkers(scene, equipmentData, onHover, onClick) {
  const group = new THREE.Group()
  const markers = []

  if (!equipmentData?.items) return { group, markers }

  equipmentData.items.forEach(device => {
    const pos = device.position3d
    const color = STATUS_COLORS[device.status] || 0x8892a4

    // Main body
    const geo = new THREE.BoxGeometry(0.8, device.type === '仓储设备' ? 1.6 : 0.8, 0.8)
    const mat = new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.3,
      metalness: 0.6,
      emissive: color,
      emissiveIntensity: device.status === 'running' ? 0.15 : 0.05
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(pos.x, device.type === '仓储设备' ? 1.0 : 0.6, pos.z)
    mesh.castShadow = true
    mesh.userData = { deviceId: device.id }
    group.add(mesh)

    // Glow ring for running devices
    if (device.status === 'running') {
      const ringGeo = new THREE.RingGeometry(0.5, 0.6, 32)
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = -Math.PI / 2
      ring.position.set(pos.x, 0.05, pos.z)
      group.add(ring)
      mesh.userData.ring = ring
    }

    markers.push({
      mesh,
      deviceId: device.id,
      deviceName: device.name,
      status: device.status,
      utilization: device.utilizationRate
    })
  })

  scene.add(group)
  return { group, markers }
}

export function updateMarkerStatus(markers, deviceId, newStatus) {
  const marker = markers.find(m => m.deviceId === deviceId)
  if (!marker) return

  const color = STATUS_COLORS[newStatus] || 0x8892a4
  marker.mesh.material.color.setHex(color)
  marker.mesh.material.emissive.setHex(color)
  marker.mesh.material.emissiveIntensity = newStatus === 'running' ? 0.15 : 0.05
}
```

- [ ] **Step 4: Write PersonnelMarkers.js — zone personnel indicators**

Write `src/components/scene/PersonnelMarkers.js`:
```javascript
import * as THREE from 'three'

export function buildPersonnelMarkers(scene, personnelData) {
  const group = new THREE.Group()

  if (!personnelData?.positions) return group

  const zoneCenters = {
    'zone-01': { x: -7, z: -4 },
    'zone-02': { x: 6, z: -4 },
    'zone-03': { x: -7, z: 6 },
  }

  personnelData.positions.forEach(pos => {
    if (!pos.zoneId || !zoneCenters[pos.zoneId]) return

    const center = zoneCenters[pos.zoneId]
    const intensity = Math.min(pos.count / 14, 1)

    const circleGeo = new THREE.CircleGeometry(1.2, 32)
    const circleMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.08 + intensity * 0.12,
      side: THREE.DoubleSide
    })
    const circle = new THREE.Mesh(circleGeo, circleMat)
    circle.rotation.x = -Math.PI / 2
    circle.position.set(center.x, 0.02, center.z)
    group.add(circle)

    // Small dots representing people
    for (let i = 0; i < Math.min(pos.count, 14); i++) {
      const angle = (i / Math.min(pos.count, 14)) * Math.PI * 2
      const radius = 0.5 + Math.random() * 0.6
      const dotGeo = new THREE.SphereGeometry(0.06, 8, 8)
      const dotMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff })
      const dot = new THREE.Mesh(dotGeo, dotMat)
      dot.position.set(
        center.x + Math.cos(angle) * radius,
        0.05,
        center.z + Math.sin(angle) * radius
      )
      group.add(dot)
    }
  })

  scene.add(group)
  return group
}
```

- [ ] **Step 5: Write InfoLabel.js — CSS2D floating label**

Write `src/components/scene/InfoLabel.js`:
```javascript
import * as THREE from 'three'
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'

export function createInfoLabel(text, position, color = '#00e676') {
  const div = document.createElement('div')
  div.textContent = text
  div.style.cssText = `
    background: rgba(10,14,26,0.9);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 6px;
    padding: 6px 10px;
    color: #e0e6ed;
    font-size: 12px;
    font-family: system-ui, sans-serif;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    border-left: 3px solid ${color};
  `

  const label = new CSS2DObject(div)
  label.position.set(position.x, position.y + 1.4, position.z)
  return label
}

export function createDeviceLabel(device, color) {
  const rate = (device.utilizationRate * 100).toFixed(0)
  return createInfoLabel(
    `${device.name}  |  利用率 ${rate}%`,
    device.position3d,
    color
  )
}
```

- [ ] **Step 6: Write WorkshopScene.vue — Vue container for Three.js**

Write `src/components/scene/WorkshopScene.vue`:
```vue
<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useThreeScene } from './useThreeScene'
import { buildWorkshopModel } from './WorkshopModel'
import { buildEquipmentMarkers } from './EquipmentMarkers'
import { buildPersonnelMarkers } from './PersonnelMarkers'
import { createDeviceLabel } from './InfoLabel'
import { useWorkshopStore } from '@/stores/useWorkshopStore'
import { useEquipmentStore } from '@/stores/useEquipmentStore'
import * as THREE from 'three'

const containerRef = ref(null)
const workshopStore = useWorkshopStore()
const equipmentStore = useEquipmentStore()

let three = null
let modelGroup = null
let equipmentGroup = null
let personnelGroup = null
let equipmentMarkers = []
let labelObjects = []
let raycaster = null
let mouse = null
let hoveredObject = null

function buildScene() {
  if (!containerRef.value || !workshopStore.workshop || !equipmentStore.equipment) return

  // Cleanup previous
  cleanupScene()

  three = useThreeScene()
  three.initScene(containerRef.value)

  // Build model
  modelGroup = buildWorkshopModel(three.scene, workshopStore.workshop)

  // Build equipment
  const eqResult = buildEquipmentMarkers(
    three.scene,
    equipmentStore.equipment
  )
  equipmentGroup = eqResult.group
  equipmentMarkers = eqResult.markers

  // Build personnel markers
  personnelGroup = buildPersonnelMarkers(three.scene, workshopStore.personnel)

  // Raycaster for interaction
  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()

  three.renderer.domElement.addEventListener('pointermove', onPointerMove)
  three.renderer.domElement.addEventListener('click', onClick)
  three.renderer.domElement.addEventListener('dblclick', onDoubleClick)

  three.startAnimation()
}

function cleanupScene() {
  if (labelObjects.length) {
    labelObjects.forEach(l => {
      l.parent?.remove(l)
      l.element?.remove()
    })
    labelObjects = []
  }

  if (three) {
    three.renderer?.domElement?.removeEventListener('pointermove', onPointerMove)
    three.renderer?.domElement?.removeEventListener('click', onClick)
    three.renderer?.domElement?.removeEventListener('dblclick', onDoubleClick)
    three.dispose()
    three = null
  }

  equipmentMarkers = []
  hoveredObject = null
}

function onPointerMove(event) {
  if (!three || !raycaster) return

  const rect = three.renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(mouse, three.camera)

  const meshes = equipmentMarkers.map(m => m.mesh)
  const intersects = raycaster.intersectObjects(meshes)

  // Remove old labels
  labelObjects.forEach(l => {
    l.parent?.remove(l)
    l.element?.remove()
  })
  labelObjects = []

  if (intersects.length > 0) {
    const hit = intersects[0].object
    const marker = equipmentMarkers.find(m => m.mesh === hit)
    if (marker) {
      const device = equipmentStore.deviceList.find(d => d.id === marker.deviceId)
      if (device) {
        const color = marker.mesh.material.color.getHex()
        const label = createDeviceLabel(device, '#' + color.toString(16).padStart(6, '0'))
        three.scene.add(label)
        labelObjects.push(label)
      }
    }
    three.renderer.domElement.style.cursor = 'pointer'
  } else {
    three.renderer.domElement.style.cursor = 'default'
  }
}

function onClick(event) {
  if (!three || !raycaster) return

  const rect = three.renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(mouse, three.camera)
  const meshes = equipmentMarkers.map(m => m.mesh)
  const intersects = raycaster.intersectObjects(meshes)

  if (intersects.length > 0) {
    const hit = intersects[0].object
    const marker = equipmentMarkers.find(m => m.mesh === hit)
    if (marker) {
      equipmentStore.selectDevice(marker.deviceId)
      // Animate camera to device
      const device = equipmentStore.deviceList.find(d => d.id === marker.deviceId)
      if (device && three) {
        animateCamera(device.position3d)
      }
    }
  }
}

function onDoubleClick() {
  if (!three) return
  animateCamera({ x: 0, y: 0, z: 0 })
  equipmentStore.clearSelection()
}

function animateCamera(targetPos) {
  if (!three) return
  const startPos = three.camera.position.clone()
  const endPos = new THREE.Vector3(targetPos.x, targetPos.y + 8, targetPos.z + 12)
  const startTarget = three.controls.target.clone()
  const endTarget = new THREE.Vector3(targetPos.x, 0, targetPos.z)

  let t = 0
  const duration = 60

  three.controls.autoRotate = false

  function step() {
    t++
    const progress = Math.min(t / duration, 1)
    const ease = 1 - Math.pow(1 - progress, 3)

    three.camera.position.lerpVectors(startPos, endPos, ease)
    three.controls.target.lerpVectors(startTarget, endTarget, ease)
    three.controls.update()

    if (progress < 1) {
      requestAnimationFrame(step)
    } else {
      setTimeout(() => { three.controls.autoRotate = true }, 3000)
    }
  }
  step()
}

watch(() => equipmentStore.selectedDeviceId, (newId) => {
  if (!newId) return
  const device = equipmentStore.deviceList.find(d => d.id === newId)
  if (device && three) {
    animateCamera(device.position3d)
  }
})

onMounted(() => {
  watch(
    () => workshopStore.workshop && equipmentStore.equipment,
    (ready) => { if (ready) buildScene() },
    { immediate: true }
  )
})

onUnmounted(() => {
  cleanupScene()
})
</script>

<template>
  <div ref="containerRef" class="scene-container"></div>
</template>

<style scoped>
.scene-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: #0d1117;
}
</style>
```

---

### Task 7: Final Wiring, Interaction Polish & Auto-Refresh

**Files:**
- Modify: `src/views/DashboardView.vue` — add polling timer
- Modify: `src/components/scene/WorkshopScene.vue` — add highlight-on-select visual

- [ ] **Step 1: Add auto-refresh polling to DashboardView.vue**

Modify DashboardView.vue — add timer to refresh data every 30s:
```vue
<script setup>
import { onMounted, onUnmounted } from 'vue'
// ... existing imports

const workshopStore = useWorkshopStore()
const equipmentStore = useEquipmentStore()
let refreshTimer = null

onMounted(async () => {
  await Promise.all([
    workshopStore.fetchAll(),
    equipmentStore.fetchEquipment()
  ])
  refreshTimer = setInterval(() => {
    workshopStore.fetchAll()
    equipmentStore.fetchEquipment()
  }, 30000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>
```

- [ ] **Step 2: Add highlight effect when device selected in panel**

In `WorkshopScene.vue`, add a watch that pulses the selected device marker:
```javascript
watch(() => equipmentStore.selectedDeviceId, (newId) => {
  // Reset all marker opacities
  equipmentMarkers.forEach(m => {
    m.mesh.material.emissiveIntensity = m.status === 'running' ? 0.15 : 0.05
  })

  // Highlight selected
  if (newId) {
    const marker = equipmentMarkers.find(m => m.deviceId === newId)
    if (marker) {
      marker.mesh.material.emissiveIntensity = 0.5
    }
  }
})
```

- [ ] **Step 3: Verify end-to-end**

```bash
cd "/d/claude code text/一家园工厂可视化项目/workshop-dashboard"
pnpm dev
```

Expected:
- Full dark-screen 1920×1080 layout renders
- Header shows "1号灌装车间", clock ticks, alert badge shows 4
- Left panel: workshop info (area, zones), energy cards + charts, personnel count + chart
- Center: Three.js scene with zones, device cubes, personnel dots, auto-rotating
- Right panel: production products + gauge, equipment list with filter tabs
- Bottom bar: 6 summary numbers
- Hover device in 3D → tooltip label appears
- Click device → camera animates to it
- Double-click → camera resets
- Data refreshes every 30s
