export function localDateKey(dateStr) {
  const m = dateStr.match(/(\d{4}-\d{2}-\d{2})/)
  const datePart = m ? m[1] : dateStr.slice(0, 10)
  const parts = datePart.split('-').map(x => parseInt(x, 10))
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2])
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0')
  }
  return dateStr.slice(0, 10)
}

export function groupEntriesByDate(entries) {
  const grouped = {}
  for (const e of entries) {
    const d = localDateKey(e.date)
    if (!grouped[d]) grouped[d] = []
    grouped[d].push(e)
  }
  return grouped
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10)
}
