const API_BASE = import.meta.env.VITE_API_BASE ||
  (window.location.protocol + '//' + window.location.hostname + ':8000')

export function getApiBase() {
  return API_BASE
}

export function getUploadUrl(path) {
  return API_BASE + path
}
