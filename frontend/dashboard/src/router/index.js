import { createRouter, createWebHistory } from 'vue-router'
import { isLoggedIn } from '../utils/auth.js'

const routes = [
  {
    path: '/',
    redirect: '/overview',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/overview',
    name: 'FactoryOverview',
    component: () => import('../views/FactoryOverview.vue'),
  },
  {
    path: '/workshop/:name',
    name: 'WorkshopDetail',
    component: () => import('../views/WorkshopDetail.vue'),
  },
  {
    path: '/equipment/:name',
    name: 'EquipmentDetail',
    component: () => import('../views/EquipmentDetail.vue'),
    props: true,
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// 导航守卫：未登录访问非公开页面时重定向到 /login
router.beforeEach((to) => {
  if (!to.meta.public && !isLoggedIn()) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }
})

export default router
