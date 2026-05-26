<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, default: '' },
  outputRate: { type: Number, default: 0 },
  totalOutput: { type: Number, default: 0 },
  outputUnit: { type: String, default: '条' },
  loadRate: { type: Number, default: 0 },
  status: { type: String, default: 'health' },
})

const emit = defineEmits(['click'])

const statusConfig = computed(() => {
  const map = {
    health: { label: '健康', color: '#52c41a', bg: '#f6ffed' },
    warning: { label: '注意', color: '#faad14', bg: '#fffbe6' },
    danger: { label: '预警', color: '#ff4d4f', bg: '#fff2f0' },
  }
  return map[props.status] || map.health
})

const statusDotColor = computed(() => statusConfig.value.color)
</script>

<template>
  <div class="workshop-card" @click="emit('click')">
    <div class="workshop-header">
      <span class="workshop-name">{{ name }}</span>
      <span class="status-dot" :style="{ backgroundColor: statusDotColor }"></span>
    </div>
    <div class="workshop-metrics">
      <div class="metric-item">
        <span class="metric-label">产出率</span>
        <span class="metric-value" :style="{ color: statusConfig.color }">{{ outputRate }}%</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">产出量</span>
        <span class="metric-value metric-quantity">{{ totalOutput.toLocaleString() }}<span class="metric-unit">{{ outputUnit }}</span></span>
      </div>
      <div class="metric-item">
        <span class="metric-label">负载率</span>
        <span class="metric-value">{{ loadRate }}%</span>
      </div>
    </div>
    <div class="workshop-status" :style="{ color: statusConfig.color, backgroundColor: statusConfig.bg }">
      {{ statusConfig.label }}
    </div>
  </div>
</template>

<style scoped>
.workshop-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.15s;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.workshop-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.workshop-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.workshop-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.workshop-metrics {
  display: flex;
  justify-content: space-between;
}

.metric-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.metric-label {
  font-size: 12px;
  color: #999;
}

.metric-value {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.metric-quantity {
  font-size: 15px;
}

.metric-unit {
  font-size: 12px;
  font-weight: 400;
  color: #999;
  margin-left: 2px;
}

.workshop-status {
  align-self: flex-start;
  font-size: 12px;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 10px;
}
</style>
