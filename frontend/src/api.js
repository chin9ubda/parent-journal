import axios from 'axios'
import { getApiBase } from './utils/url'

const api = axios.create({ baseURL: getApiBase() })

export async function login(username, password) {
  const r = await api.post('/api/login', { username, password })
  return r.data
}

export async function fetchEntries(token, limit = 1000, { q, tag, offset } = {}) {
  const params = { token, limit }
  if (q) params.q = q
  if (tag) params.tag = tag
  if (offset) params.offset = offset
  const r = await api.get('/api/entries', { params })
  return r.data
}

export async function fetchTags(token) {
  const r = await api.get('/api/tags', { params: { token } })
  return r.data
}

export async function fetchEntry(id, token) {
  const r = await api.get('/api/entries/' + id, { params: { token } })
  return r.data
}

export async function createEntry(formData) {
  const r = await api.post('/api/entries', formData)
  return r.data
}

export async function updateEntry(id, formData) {
  const r = await api.put('/api/entries/' + id, formData)
  return r.data
}

export async function deleteEntry(id, token) {
  const r = await api.delete('/api/entries/' + id, { params: { token } })
  return r.data
}

export async function getSettings(token) {
  const r = await api.get('/api/settings', { params: { token } })
  return r.data
}

export async function updateSettings(token, data) {
  const r = await api.put('/api/settings', data, { params: { token } })
  return r.data
}

export default api
