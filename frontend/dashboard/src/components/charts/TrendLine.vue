<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  data: { type: Array, default: () => [] },
  title: { type: String, default: '' },
  height: { type: Number, default: 300 },
  targetLine: { type: Number, default: null },
  lineColor: { type: String, default: '#1890ff' },
})

const chartRef = ref(null)
let chartInstance = null

function initChart() {
  if (!chartRef.value) return
  if (chartInstance) chartInstance.dispose()
  chartInstance = echarts.init(chartRef.value)
  renderChart()
}

function renderChart() {
  if (!chartInstance) return
  const series = [
    {
      type: 'line',
      data: props.data.map((d) => d.value),
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: props.lineColor, width: 2 },
      itemStyle: { color: props.lineColor },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: props.lineColor + '33' },
          { offset: 1, color: props.lineColor + '05' },
        ]),
      },
    },
  ]

  if (props.targetLine !== null) {
    series.push({
      type: 'line',
      data: props.data.map(() => props.targetLine),
      lineStyle: { color: '#ff4d4f', width: 2, type: 'dashed' },
      symbol: 'none',
      name: '目标线',
    })
  }

  chartInstance.setOption({
    title: props.title
      ? { text: props.title, textStyle: { fontSize: 14, fontWeight: 500 }, left: 'center' }
      : undefined,
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const idx = params[0].dataIndex
        const item = props.data[idx]
        let html = `${item.label}<br/>`
        params.forEach((p) => {
          html += `${p.marker} ${p.seriesName || ''} ${p.value}`
        })
        return html
      },
    },
    grid: { left: 50, right: 20, top: props.title ? 40 : 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: props.data.map((d) => d.label),
      axisLine: { lineStyle: { color: '#e8e8e8' } },
      axisLabel: { color: '#999', fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } },
      axisLabel: { color: '#999', fontSize: 11 },
    },
    series,
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
  () => [props.data, props.title, props.targetLine],
  () => {
    nextTick(renderChart)
  },
  { deep: true }
)
</script>

<template>
  <div class="trend-line-wrapper">
    <div ref="chartRef" class="trend-line-chart" :style="{ height: height + 'px' }"></div>
  </div>
</template>

<style scoped>
.trend-line-wrapper {
  background: #fff;
  border-radius: 8px;
  padding: 8px;
}

.trend-line-chart {
  width: 100%;
}
</style>
