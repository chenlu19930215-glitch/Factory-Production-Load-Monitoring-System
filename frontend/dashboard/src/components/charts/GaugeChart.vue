<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  value: { type: Number, default: 0 },
  title: { type: String, default: '' },
  max: { type: Number, default: 100 },
  height: { type: Number, default: 200 },
})

const chartRef = ref(null)
let chartInstance = null

const gaugeColor = computed(() => {
  if (props.value >= 85) return '#22C55E'
  if (props.value >= 70) return '#F59E0B'
  return '#EF4444'
})

function initChart() {
  if (!chartRef.value) return
  if (chartInstance) chartInstance.dispose()
  chartInstance = echarts.init(chartRef.value)
  renderChart()
}

function renderChart() {
  if (!chartInstance) return
  chartInstance.setOption({
    series: [
      {
        type: 'gauge',
        min: 0,
        max: props.max,
        center: ['50%', '55%'],
        radius: '80%',
        startAngle: 220,
        endAngle: -40,
        axisLine: {
          lineStyle: {
            width: 12,
            color: [
              [0.7, '#F59E0B'],
              [0.85, '#22C55E'],
              [1, '#EF4444'],
            ],
          },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: {
          show: true,
          length: '60%',
          width: 4,
          itemStyle: { color: gaugeColor.value },
        },
        detail: {
          valueAnimation: true,
          formatter: `{value}%`,
          fontSize: 20,
          fontWeight: 600,
          color: gaugeColor.value,
          offsetCenter: [0, '40%'],
        },
        title: {
          offsetCenter: [0, '70%'],
          fontSize: 13,
          color: '#666',
        },
        data: [{ value: props.value, name: props.title }],
      },
    ],
  })
}

function handleResize() {
  chartInstance?.resize()
}

onMounted(() => {
  nextTick(initChart)
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  chartInstance = null
})

watch(
  () => [props.value, props.title],
  () => {
    nextTick(renderChart)
  }
)
</script>

<template>
  <div class="gauge-chart-wrapper">
    <div ref="chartRef" class="gauge-chart-echart" :style="{ height: height + 'px' }"></div>
  </div>
</template>

<style scoped>
.gauge-chart-wrapper {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 8px;
  box-shadow: var(--shadow-sm);
}

.gauge-chart-echart {
  width: 100%;
}
</style>
