<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const breadcrumbItems = computed(() => {
  const items = [{ label: '总览', path: '/overview' }]
  const params = route.params
  const query = route.query

  if (params.name) {
    if (route.name === 'WorkshopDetail') {
      items.push({ label: params.name, path: null })
    } else if (route.name === 'EquipmentDetail') {
      const workshopName = query.workshop || params.workshop || '车间'
      items.push({ label: workshopName, path: `/workshop/${encodeURIComponent(workshopName)}` })
      items.push({ label: params.name, path: null })
    }
  }

  return items
})
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <h1 class="app-title">工厂生产负载监控</h1>
      <nav class="breadcrumb">
        <template v-for="(item, index) in breadcrumbItems" :key="index">
          <router-link v-if="item.path" :to="item.path" class="breadcrumb-link">{{ item.label }}</router-link>
          <span v-else class="breadcrumb-current">{{ item.label }}</span>
          <span v-if="index < breadcrumbItems.length - 1" class="breadcrumb-separator">&gt;</span>
        </template>
      </nav>
    </header>
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<style>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: #fff;
  padding: 16px 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.app-title {
  font-size: 20px;
  font-weight: 600;
  color: #1890ff;
  white-space: nowrap;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.breadcrumb-link {
  color: #1890ff;
  text-decoration: none;
}

.breadcrumb-link:hover {
  text-decoration: underline;
}

.breadcrumb-current {
  color: #666;
}

.breadcrumb-separator {
  color: #ccc;
}

.app-main {
  flex: 1;
  padding: 20px 24px;
}
</style>
