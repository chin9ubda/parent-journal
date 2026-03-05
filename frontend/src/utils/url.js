const API_BASE = import.meta.env.VITE_API_BASE || ''

export function getApiBase() {
  return API_BASE
}

export function getUploadUrl(path) {
  return API_BASE + path
}
