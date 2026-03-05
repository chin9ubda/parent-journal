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

export function getExportPdfUrl(token) {
  return `${api.defaults.baseURL}/api/export/pdf?token=${token}`
}

export async function changePassword(token, current, newPw) {
  const form = new FormData()
  form.append('token', token)
  form.append('current', current)
  form.append('new', newPw)
  const r = await api.post('/api/change-password', form)
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

export async function fetchGrowthRecords(token) {
  const r = await api.get('/api/growth', { params: { token } })
  return r.data
}

export async function createGrowthRecord(token, data) {
  const r = await api.post('/api/growth', data, { params: { token } })
  return r.data
}

export async function updateGrowthRecord(token, id, data) {
  const r = await api.put(`/api/growth/${id}`, data, { params: { token } })
  return r.data
}

export async function deleteGrowthRecord(id, token) {
  const r = await api.delete(`/api/growth/${id}`, { params: { token } })
  return r.data
}

// Care records (feeding / sleep / diaper)
export async function fetchCareRecords(token, category) {
  const params = { token }
  if (category) params.category = category
  const r = await api.get('/api/care', { params })
  return r.data
}

export async function fetchCareSummary(token, date) {
  const r = await api.get('/api/care/summary', { params: { token, date } })
  return r.data
}

export async function createCareRecord(token, data) {
  const r = await api.post('/api/care', data, { params: { token } })
  return r.data
}

export async function updateCareRecord(token, id, data) {
  const r = await api.put(`/api/care/${id}`, data, { params: { token } })
  return r.data
}

export async function deleteCareRecord(id, token) {
  const r = await api.delete(`/api/care/${id}`, { params: { token } })
  return r.data
}

// Baby food records
export async function fetchBabyfoodRecords(token) {
  const r = await api.get('/api/babyfood', { params: { token } })
  return r.data
}

export async function createBabyfoodRecord(token, data) {
  const r = await api.post('/api/babyfood', data, { params: { token } })
  return r.data
}

export async function updateBabyfoodRecord(token, id, data) {
  const r = await api.put(`/api/babyfood/${id}`, data, { params: { token } })
  return r.data
}

export async function deleteBabyfoodRecord(id, token) {
  const r = await api.delete(`/api/babyfood/${id}`, { params: { token } })
  return r.data
}

// Hospital records
export async function fetchHospitalRecords(token) {
  const r = await api.get('/api/hospital', { params: { token } })
  return r.data
}

export async function createHospitalRecord(token, data) {
  const r = await api.post('/api/hospital', data, { params: { token } })
  return r.data
}

export async function updateHospitalRecord(token, id, data) {
  const r = await api.put(`/api/hospital/${id}`, data, { params: { token } })
  return r.data
}

export async function deleteHospitalRecord(id, token) {
  const r = await api.delete(`/api/hospital/${id}`, { params: { token } })
  return r.data
}

// Vaccination records
export async function fetchVaccinations(token) {
  const r = await api.get('/api/vaccinations', { params: { token } })
  return r.data
}

export async function createVaccination(token, data) {
  const r = await api.post('/api/vaccinations', data, { params: { token } })
  return r.data
}

export async function deleteVaccination(id, token) {
  const r = await api.delete(`/api/vaccinations/${id}`, { params: { token } })
  return r.data
}

export default api
