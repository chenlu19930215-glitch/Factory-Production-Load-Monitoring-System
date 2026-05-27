import axios from 'axios'
import { getToken, removeToken } from '../utils/auth.js'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '',
  timeout: 10000,
})

// 请求拦截器：自动附带 JWT token
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：401 时自动跳转登录
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeToken()
      window.location.href = '/monitor/login'
    }
    return Promise.reject(error)
  }
)

export async function fetchOverview(dimension = 'day') {
  const { data: resp } = await api.get('/api/monitor/overview', { params: { dimension } })
  return resp.data || resp
}

export async function fetchWorkshops(dimension = 'day') {
  const { data: resp } = await api.get('/api/monitor/workshops', { params: { dimension } })
  return resp.data || resp
}

export async function fetchWorkshopDetail(name, dimension = 'day') {
  const { data: resp } = await api.get(`/api/monitor/workshop/${encodeURIComponent(name)}`, { params: { dimension } })
  return resp.data || resp
}

export async function fetchEquipmentDetail(name, dimension = 'day') {
  const { data: resp } = await api.get(`/api/monitor/equipment/${encodeURIComponent(name)}`, { params: { dimension } })
  return resp.data || resp
}

export async function fetchEquipmentTypes() {
  const { data: resp } = await api.get('/api/monitor/equipment-types')
  return resp.data || resp
}
