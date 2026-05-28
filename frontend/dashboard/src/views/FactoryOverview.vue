<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { fetchOverview } from '../api/monitor.js'
import MetricCard from '../components/widgets/MetricCard.vue'
import WorkshopCard from '../components/widgets/WorkshopCard.vue'
import BarChart from '../components/charts/BarChart.vue'
import TrendLine from '../components/charts/TrendLine.vue'

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
const overviewData = ref(null)

const loadRateTrendData = computed(() => {
  return overviewData.value?.loadRateTrend || []
})

const workshopOutputData = computed(() => {
  if (!overviewData.value?.workshops) return []
  const labelMap = {
    'Y固体一1号车间': '1号',
    'Y固体一2号车间': '2号',
    'Y固体一3号车间': '3号',
    'Y固体一5号车间': '5号',
    'Y固体一6号车间': '6号',
    'Y固体一8号车间': '8号',
    'Y固体一分包间': '分包间',
    'Y固体二车间': '固体二',
    'Y液体二车间': '液体二',
  }
  return overviewData.value.workshops.map(w => ({
    label: labelMap[w.name] || w.name,
    value: w.totalOutput || 0,
  }))
})

async function loadData() {
  loading.value = true
  try {
    overviewData.value = await fetchOverview(currentDimension.value, currentYear.value)
  } catch (e) {
    console.error('[overview] 加载失败:', e)
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

function onWorkshopClick(name) {
  router.push({
    name: 'WorkshopDetail',
    params: { name },
    query: { dimension: currentDimension.value, year: currentYear.value },
  })
}

onMounted(loadData)

watch(currentDimension, loadData)
watch(currentYear, loadData)
</script>

<template>
  <div class="overview-page">
    <!-- 顶部标题和维度切换 -->
    <div class="overview-header">
      <h2 class="page-title">工厂总览</h2>
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
        title="总产量"
        :value="overviewData?.totalOutput?.toLocaleString() || '--'"
        unit="条"
        color="#1890ff"
      />
      <MetricCard
        title="平均负荷率"
        :value="overviewData?.avgLoadRate ?? '--'"
        unit="%"
        :color="(overviewData?.avgLoadRate ?? 0) >= 85 ? '#52c41a' : (overviewData?.avgLoadRate ?? 0) >= 70 ? '#faad14' : '#ff4d4f'"
      />
      <MetricCard
        title="平均产出率"
        :value="overviewData?.avgOutputRate ?? '--'"
        unit="%"
        :color="(overviewData?.avgOutputRate ?? 0) >= 85 ? '#52c41a' : (overviewData?.avgOutputRate ?? 0) >= 70 ? '#faad14' : '#ff4d4f'"
      />
      <MetricCard
        title="平均OEE"
        :value="overviewData?.avgOEE ?? '--'"
        unit="%"
        color="#722ed1"
      />
    </div>

    <!-- 车间卡片网格 -->
    <section class="section">
      <h3 class="section-title">车间概览</h3>
      <div v-if="loading" class="skeleton-section">
        <div class="skeleton-metric-grid">
          <div v-for="i in 4" :key="'m'+i" class="skeleton-card skeleton-metric"></div>
        </div>
        <div class="skeleton-workshop-grid">
          <div v-for="i in 9" :key="'w'+i" class="skeleton-card skeleton-workshop"></div>
        </div>
        <div class="skeleton-chart-row">
          <div class="skeleton-card skeleton-chart"></div>
          <div class="skeleton-card skeleton-chart"></div>
        </div>
        <div class="skeleton-chart-row">
          <div class="skeleton-card skeleton-chart"></div>
        </div>
      </div>
      <div v-else class="workshop-grid">
        <WorkshopCard
          v-for="ws in overviewData?.workshops || []"
          :key="ws.name"
          :name="ws.name"
          :area="ws.area"
          :output-rate="ws.outputRate"
          :total-output="ws.totalOutput"
          :load-rate="ws.loadRate"
          :status="ws.status"
          @click="onWorkshopClick(ws.name)"
        />
      </div>
    </section>

    <!-- 底部图表 -->
    <div class="chart-row">
      <div class="chart-col">
        <BarChart
          :data="overviewData?.outputTrend || []"
          title="全厂产量趋势"
          :height="320"
          bar-color="#1890ff"
        />
      </div>
      <div class="chart-col">
        <BarChart
          :data="workshopOutputData"
          title="各车间产出数量"
          :height="320"
          :colors="['#5470c6','#91cc75','#fac858','#ee6666','#73c0de','#3ba272','#fc8452','#9a60b4','#ea7ccc']"
        />
      </div>
    </div>

    <div class="chart-row">
      <div class="chart-col chart-full">
        <TrendLine
          :data="loadRateTrendData"
          title="平均负荷率趋势"
          :height="300"
          :target-line="85"
          line-color="#1890ff"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.overview-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.overview-header {
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

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.workshop-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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

.chart-col.chart-full {
  grid-column: 1 / -1;
}

/* ===== 骨架屏 ===== */

.skeleton-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.skeleton-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.skeleton-workshop-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.skeleton-chart-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.skeleton-card {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

.skeleton-metric {
  height: 100px;
}

.skeleton-workshop {
  height: 130px;
}

.skeleton-chart {
  height: 340px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (max-width: 1200px) {
  .skeleton-metric-grid { grid-template-columns: repeat(2, 1fr); }
  .skeleton-workshop-grid { grid-template-columns: repeat(2, 1fr); }
  .skeleton-chart-row { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .skeleton-metric-grid { grid-template-columns: 1fr; }
  .skeleton-workshop-grid { grid-template-columns: 1fr; }
}

@media (max-width: 1200px) {
  .metric-grid { grid-template-columns: repeat(2, 1fr); }
  .workshop-grid { grid-template-columns: repeat(2, 1fr); }
  .chart-row { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .metric-grid { grid-template-columns: 1fr; }
  .workshop-grid { grid-template-columns: 1fr; }
}
</style>
