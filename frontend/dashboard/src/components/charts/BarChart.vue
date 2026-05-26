<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  data: { type: Array, default: () => [] },
  title: { type: String, default: '' },
  height: { type: Number, default: 300 },
  barColor: { type: String, default: '#1890ff' },
  colors: { type: Array, default: null },
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

  chartInstance.setOption({
    title: props.title
      ? { text: props.title, textStyle: { fontSize: 14, fontWeight: 500 }, left: 'center' }
      : undefined,
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const p = params[0]
        const val = p.value !== undefined ? p.value.toLocaleString() : p.value
        return `${p.name}<br/>${p.marker} ${val}`
      },
    },
    grid: { left: 50, right: 20, top: props.title ? 40 : 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: props.data.map((d) => d.label),
      axisLine: { lineStyle: { color: '#e8e8e8' } },
      axisLabel: { color: '#999', fontSize: 11, rotate: props.data.length > 8 ? 30 : 0 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } },
      axisLabel: { color: '#999', fontSize: 11 },
    },
    series: [
      {
        type: 'bar',
        data: props.data.map((d, i) => {
          if (props.colors && props.colors[i]) {
            return {
              value: d.value,
              itemStyle: { color: props.colors[i], borderRadius: [4, 4, 0, 0] },
            };
          }
          return d.value;
        }),
        barWidth: '50%',
        itemStyle: props.colors ? undefined : {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: props.barColor },
            { offset: 1, color: props.barColor + '66' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
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
  () => [props.data, props.title],
  () => {
    nextTick(renderChart)
  },
  { deep: true }
)
</script>

<template>
  <div class="bar-chart-wrapper">
    <div ref="chartRef" class="bar-chart-echart" :style="{ height: height + 'px' }"></div>
  </div>
</template>

<style scoped>
.bar-chart-wrapper {
  background: #fff;
  border-radius: 8px;
  padding: 8px;
}

.bar-chart-echart {
  width: 100%;
}
</style>
