<script setup>
import { computed } from 'vue'

const props = defineProps({
  equipmentList: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['select'])

const statusInfo = computed(() => (status) => {
  const map = {
    health: { color: '#22C55E', bg: '#F0FDF4', text: '健康' },
    warning: { color: '#F59E0B', bg: '#FFFBEB', text: '注意' },
    danger: { color: '#EF4444', bg: '#FEF2F2', text: '预警' },
  }
  return map[status] || map.health
})
</script>

<template>
  <div class="equipment-table-wrapper">
    <div v-if="loading" class="table-loading">
      <svg class="loading-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
        <circle cx="12" cy="12" r="10" stroke-dasharray="31.4 31.4" stroke-linecap="round"/>
      </svg>
      加载中...
    </div>
    <div v-else-if="equipmentList.length > 0" class="table-scroll">
      <table class="equipment-table">
        <thead>
          <tr>
            <th>设备名称</th>
            <th>产量(条)</th>
            <th>产出率</th>
            <th>负荷率</th>
            <th>状态</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in equipmentList"
            :key="item.name"
            class="table-row"
            @click="emit('select', item)"
            tabindex="0"
            @keydown.enter="emit('select', item)"
          >
            <td class="cell-name">{{ item.name }}</td>
            <td class="cell-num">{{ item.output?.toLocaleString() }}</td>
            <td>
              <span class="rate-value" :style="{ color: item.outputRate >= 85 ? '#22C55E' : item.outputRate >= 70 ? '#F59E0B' : '#EF4444' }">
                {{ item.outputRate }}%
              </span>
            </td>
            <td class="cell-num">{{ item.loadRate }}%</td>
            <td>
              <span class="status-indicator">
                <svg width="8" height="8" viewBox="0 0 8 8" :fill="statusInfo(item.status).color">
                  <circle cx="4" cy="4" r="4"/>
                </svg>
                {{ statusInfo(item.status).text }}
              </span>
            </td>
            <td class="cell-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="table-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" style="color: #CBD5E1; margin-bottom: 8px;">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
        <polyline points="13 2 13 9 20 9"/>
      </svg>
      <span>暂无设备数据</span>
    </div>
  </div>
</template>

<style scoped>
.equipment-table-wrapper {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.table-scroll {
  overflow-x: auto;
}

.equipment-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.equipment-table thead {
  position: sticky;
  top: 0;
  z-index: 2;
}

.equipment-table th {
  background: #F8FAFC;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 2px solid var(--border-color);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.equipment-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
}

.table-row {
  cursor: pointer;
  transition: background 0.15s;
}

.table-row:hover {
  background: #EFF6FF;
}

.table-row:focus-visible {
  outline: 2px solid var(--primary-light);
  outline-offset: -2px;
}

.cell-name {
  font-weight: 600;
  color: var(--text-primary);
}

.cell-num {
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
}

.rate-value {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.cell-arrow {
  color: #CBD5E1;
  text-align: right;
}

.table-row:hover .cell-arrow {
  color: var(--primary-light);
}

.table-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 16px;
  color: var(--text-muted);
  font-size: 14px;
}

.loading-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.table-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  color: var(--text-muted);
  font-size: 14px;
}
</style>
