<script setup>
import { computed } from 'vue'

const props = defineProps({
  equipmentList: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['select'])

const statusIcon = computed(() => (status) => {
  const map = {
    health: { icon: '\u{1F7E2}', text: '健康' },
    warning: { icon: '\u{1F7E1}', text: '注意' },
    danger: { icon: '\u{1F534}', text: '预警' },
  }
  return map[status] || map.health
})
</script>

<template>
  <div class="equipment-table-wrapper">
    <div v-if="loading" class="table-loading">加载中...</div>
    <table v-else-if="equipmentList.length > 0" class="equipment-table">
      <thead>
        <tr>
          <th>设备名称</th>
          <th>产量(条)</th>
          <th>产出率</th>
          <th>负载率</th>
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
        >
          <td class="cell-name">{{ item.name }}</td>
          <td>{{ item.output && item.output.toLocaleString() }}</td>
          <td :style="{ color: item.outputRate >= 85 ? '#52c41a' : item.outputRate >= 70 ? '#faad14' : '#ff4d4f' }">
            {{ item.outputRate }}%
          </td>
          <td>{{ item.loadRate }}%</td>
          <td>
            <span class="status-badge" :class="item.status">
              {{ item.status === 'health' ? '健康' : item.status === 'warning' ? '注意' : '预警' }}
            </span>
          </td>
          <td class="cell-arrow">&gt;</td>
        </tr>
      </tbody>
    </table>
    <div v-else class="table-empty">暂无设备数据</div>
  </div>
</template>

<style scoped>
.equipment-table-wrapper {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.equipment-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.equipment-table th {
  background: #fafafa;
  padding: 12px 16px;
  text-align: left;
  font-weight: 500;
  color: #666;
  border-bottom: 1px solid #f0f0f0;
}

.equipment-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  color: #333;
}

.table-row {
  cursor: pointer;
  transition: background 0.15s;
}

.table-row:hover {
  background: #e6f7ff;
}

.cell-name {
  font-weight: 500;
}

.cell-arrow {
  color: #ccc;
  font-weight: 600;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.status-badge.health {
  background: #f6ffed;
  color: #52c41a;
}

.status-badge.warning {
  background: #fffbe6;
  color: #faad14;
}

.status-badge.danger {
  background: #fff2f0;
  color: #ff4d4f;
}

.table-loading,
.table-empty {
  text-align: center;
  padding: 40px 16px;
  color: #999;
  font-size: 14px;
}
</style>
