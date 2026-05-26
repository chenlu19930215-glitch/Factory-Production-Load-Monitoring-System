<script setup>
defineProps({
  title: { type: String, default: '' },
  value: { type: [String, Number], default: '' },
  unit: { type: String, default: '' },
  color: { type: String, default: '#1890ff' },
})
</script>

<template>
  <div class="metric-card">
    <div class="metric-title">{{ title }}</div>
    <div class="metric-value" :style="{ color }">
      {{ value }}
      <span v-if="unit" class="metric-unit">{{ unit }}</span>
    </div>
  </div>
</template>

<style scoped>
.metric-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  text-align: center;
  transition: box-shadow 0.2s;
}

.metric-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.metric-title {
  font-size: 14px;
  color: #999;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

.metric-unit {
  font-size: 14px;
  font-weight: 400;
  margin-left: 4px;
  color: inherit;
}
</style>
