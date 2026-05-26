import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '',
  timeout: 10000,
})

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
