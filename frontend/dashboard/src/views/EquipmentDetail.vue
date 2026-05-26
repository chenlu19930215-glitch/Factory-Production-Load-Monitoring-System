<script setup>
import { ref, onMounted, watch, onBeforeUnmount, computed, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { fetchEquipmentDetail } from '../api/monitor.js'
import MetricCard from '../components/widgets/MetricCard.vue'
import TrendLine from '../components/charts/TrendLine.vue'
import BarChart from '../components/charts/BarChart.vue'

const router = useRouter()
const route = useRoute()

const dimensions = [
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
]

const currentDimension = ref(route.query.dimension || 'day')
const loading = ref(true)
const detailData = ref(null)

const equipmentName = computed(() => route.params.name)

async function loadData() {
  loading.value = true
  detailData.value = await fetchEquipmentDetail(equipmentName.value, currentDimension.value)
  loading.value = false
}

function onDimensionChange(dim) {
  currentDimension.value = dim
  router.replace({ query: { ...route.query, dimension: dim } })
}

onMounted(loadData)

watch(currentDimension, loadData)
watch(
  () => route.params.name,
  () => {
    loadData()
  }
)
</script>

<template>
  <div class="equipment-detail-page">
    <!-- 顶部标题和维度切换 -->
    <div class="detail-header">
      <h2 class="page-title">{{ equipmentName }}</h2>
      <div class="dimension-switcher">
        <button
          v-for="dim in dimensions"
          :key="dim.value"
          :class="['dim-btn', { active: currentDimension === dim.value }]"
          @click="onDimensionChange(dim.value)"
        >
          {{ dim.label }}
        </button>
      </div>
    </div>

    <!-- 指标卡片 -->
    <div class="metric-grid">
      <MetricCard
        title="实际产量"
        :value="detailData?.actualOutput?.toLocaleString() || '--'"
        unit="条"
        color="#1890ff"
      />
      <MetricCard
        title="设备负载率"
        :value="detailData?.loadRate ?? '--'"
        unit="%"
        :color="(detailData?.loadRate ?? 0) >= 85 ? '#52c41a' : (detailData?.loadRate ?? 0) >= 70 ? '#faad14' : '#ff4d4f'"
      />
      <MetricCard
        title="产出率"
        :value="detailData?.outputRate ?? '--'"
        unit="%"
        :color="(detailData?.outputRate ?? 0) >= 85 ? '#52c41a' : (detailData?.outputRate ?? 0) >= 70 ? '#faad14' : '#ff4d4f'"
      />
      <MetricCard
        title="OEE"
        :value="detailData?.oee ?? '--'"
        unit="%"
        color="#722ed1"
      />
    </div>

    <!-- 图表区域 -->
    <div class="chart-row">
      <div class="chart-col">
        <TrendLine
          :data="detailData?.loadRateTrend || []"
          title="设备负载率趋势"
          :height="300"
          line-color="#faad14"
        />
      </div>
      <div class="chart-col">
        <TrendLine
          :data="detailData?.outputRateTrend || []"
          title="设备产出率趋势"
          :height="300"
          line-color="#52c41a"
        />
      </div>
    </div>

    <div class="full-chart">
      <BarChart
        :data="detailData?.outputTrend || []"
        title="产量趋势"
        :height="250"
        bar-color="#1890ff"
      />
    </div>

    <div class="full-chart">
      <TrendLine
        :data="detailData?.oeeTrend || []"
        title="OEE趋势"
        :height="300"
        line-color="#722ed1"
        :target-line="85"
      />
    </div>
  </div>
</template>

<style scoped>
.equipment-detail-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.dimension-switcher {
  display: flex;
  gap: 4px;
  background: #fff;
  border-radius: 6px;
  padding: 3px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.dim-btn {
  padding: 6px 16px;
  border: none;
  background: transparent;
  border-radius: 4px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.dim-btn:hover {
  color: #1890ff;
}

.dim-btn.active {
  background: #1890ff;
  color: #fff;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.chart-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.chart-col {
  min-width: 0;
}

.full-chart {
  width: 100%;
}

@media (max-width: 1024px) {
  .metric-grid { grid-template-columns: repeat(2, 1fr); }
  .chart-row { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .metric-grid { grid-template-columns: 1fr; }
}
</style>
