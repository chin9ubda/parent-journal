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

export async function fetchTimeline(token) {
  const r = await api.get('/api/timeline', { params: { token } })
  return r.data
}

export async function fetchGallery(token) {
  const r = await api.get('/api/gallery', { params: { token } })
  return r.data
}

export function getExportJsonUrl(token) {
  return `${api.defaults.baseURL}/api/export/json?token=${token}`
}

export function getExportZipUrl(token) {
  return `${api.defaults.baseURL}/api/export/zip?token=${token}`
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

export async function uploadTest(token, file, date, preCropped = false) {
  const form = new FormData()
  form.append('file', file)
  form.append('token', token)
  if (date) form.append('date', date)
  if (preCropped) form.append('pre_cropped', 'true')
  const r = await api.post('/api/tests', form)
  return r.data
}

export async function fetchTests(token) {
  const r = await api.get('/api/tests', { params: { token } })
  return r.data
}

export async function updateTestDate(token, id, date) {
  const r = await api.put(`/api/tests/${id}/date`, { date }, { params: { token } })
  return r.data
}

export async function adjustTestLines(token, id, c_line_x, t_line_x) {
  const r = await api.put(`/api/tests/${id}/lines`, { c_line_x, t_line_x }, { params: { token } })
  return r.data
}

export async function deleteTest(id, token) {
  const r = await api.delete('/api/tests/' + id, { params: { token } })
  return r.data
}

export default api
