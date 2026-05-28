<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { fetchWorkshopDetail } from '../api/monitor.js'
import MetricCard from '../components/widgets/MetricCard.vue'
import EquipmentTable from '../components/widgets/EquipmentTable.vue'
import TrendLine from '../components/charts/TrendLine.vue'
import BarChart from '../components/charts/BarChart.vue'

const router = useRouter()
const route = useRoute()

const dimensions = [
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
  { label: '年', value: 'year' },
]

const currentDimension = ref(route.query.dimension || 'day')
const currentYear = ref(parseInt(route.query.year) || new Date().getFullYear())
const availableYears = [2025, 2026]
const loading = ref(true)
const detailData = ref(null)

const workshopName = computed(() => route.params.name)

async function loadData() {
  loading.value = true
  try {
    detailData.value = await fetchWorkshopDetail(workshopName.value, currentDimension.value, currentYear.value)
  } catch (e) {
    console.error('[workshop] 加载失败:', e)
  }
  loading.value = false
}

function onDimensionChange(dim) {
  currentDimension.value = dim
  router.replace({ query: { ...route.query, dimension: dim } })
}

function onYearChange(year) {
  currentYear.value = year
  router.replace({ query: { ...route.query, year } })
}

function onEquipmentSelect(equipment) {
  router.push({
    name: 'EquipmentDetail',
    params: { name: equipment.name },
    query: { workshop: workshopName.value, dimension: currentDimension.value, year: currentYear.value },
  })
}

onMounted(loadData)

watch(currentDimension, loadData)
watch(currentYear, loadData)
watch(
  () => route.params.name,
  () => {
    loadData()
  }
)
</script>

<template>
  <div class="workshop-detail-page">
    <!-- 顶部标题和维度切换 -->
    <div class="detail-header">
      <h2 class="page-title">{{ workshopName }}</h2>
      <div class="header-controls">
        <select class="year-select" :value="currentYear" @change="onYearChange(Number($event.target.value))">
          <option v-for="y in availableYears" :key="y" :value="y">{{ y }} 年</option>
        </select>
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
    </div>

    <!-- 指标卡片 -->
    <div class="metric-grid">
      <MetricCard
        title="总产出"
        :value="detailData?.totalOutput?.toLocaleString() || '--'"
        unit="条"
        color="#1890ff"
      />
      <MetricCard
        title="理论产出"
        :value="detailData?.theoreticalOutput?.toLocaleString() || '--'"
        unit="条"
        color="#722ed1"
      />
      <MetricCard
        title="产出率"
        :value="detailData?.outputRate ?? '--'"
        unit="%"
        :color="(detailData?.outputRate ?? 0) >= 85 ? '#52c41a' : (detailData?.outputRate ?? 0) >= 70 ? '#faad14' : '#ff4d4f'"
      />
      <MetricCard
        title="负荷率"
        :value="detailData?.loadRate ?? '--'"
        unit="%"
        color="#faad14"
      />
    </div>

    <!-- 趋势图表（两列） -->
    <div class="chart-row">
      <div class="chart-col">
        <BarChart
          :data="detailData?.outputTrend || []"
          title="产量趋势"
          :height="300"
          bar-color="#1890ff"
        />
      </div>
      <div class="chart-col">
        <TrendLine
          :data="detailData?.loadRateTrend || []"
          title="负荷率趋势"
          :height="300"
          line-color="#faad14"
        />
      </div>
    </div>

    <!-- 设备列表 -->
    <section class="equipment-section">
      <h3 class="section-title">设备列表</h3>
      <EquipmentTable
        :equipment-list="detailData?.equipmentList || []"
        :loading="loading"
        @select="onEquipmentSelect"
      />
    </section>
  </div>
</template>

<style scoped>
.workshop-detail-page {
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
  color: var(--text-primary);
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.year-select {
  padding: 4px 10px;
  border: 1px solid var(--border-color, #E2E8F0);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-card);
  cursor: pointer;
  outline: none;
}

.year-select:focus {
  border-color: var(--primary, #3B82F6);
}

.dimension-switcher {
  display: flex;
  gap: 4px;
  background: var(--bg-card);
  border-radius: var(--radius-sm);
  padding: 3px;
  box-shadow: var(--shadow-sm);
}

.dim-btn {
  padding: 6px 16px;
  border: none;
  background: transparent;
  border-radius: 4px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.dim-btn:hover {
  color: var(--primary-light);
}

.dim-btn.active {
  background: var(--primary);
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

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.equipment-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (max-width: 1024px) {
  .metric-grid { grid-template-columns: repeat(2, 1fr); }
  .chart-row { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .metric-grid { grid-template-columns: 1fr; }
}
</style>
