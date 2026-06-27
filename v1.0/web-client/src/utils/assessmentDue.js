export function parseDueDateForInput(dueDate) {
  if (!dueDate) return ''
  return String(dueDate).split('T')[0]
}

export function parseDueTimeForInput(dueTime) {
  if (!dueTime) return ''
  return String(dueTime).slice(0, 5)
}

export function buildDueDateTime(dueDate, dueTime) {
  if (!dueDate) return null

  const datePart = parseDueDateForInput(dueDate)
  const timePart = dueTime
    ? `${parseDueTimeForInput(dueTime)}:00`
    : '23:59:59'

  return new Date(`${datePart}T${timePart}`)
}

export function formatDueDate(dueDate) {
  if (!dueDate) return ''

  const datePart = parseDueDateForInput(dueDate)
  return new Date(`${datePart}T00:00:00`).toLocaleDateString()
}

export function formatDueTime(dueTime) {
  if (!dueTime) return ''

  const [hours, minutes] = parseDueTimeForInput(dueTime).split(':')
  const date = new Date()
  date.setHours(Number(hours), Number(minutes), 0, 0)

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatDueDateTimeLabel(dueDate, dueTime) {
  const dateLabel = formatDueDate(dueDate)
  if (!dateLabel) return ''

  const timeLabel = formatDueTime(dueTime)
  return timeLabel ? `Due ${dateLabel} ${timeLabel}` : `Due ${dateLabel}`
}

export function isDueDateTimeInPast(dueDate, dueTime) {
  const dueAt = buildDueDateTime(dueDate, dueTime)
  if (!dueAt || Number.isNaN(dueAt.getTime())) return false
  return dueAt <= new Date()
}
