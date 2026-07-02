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
  const timePart = dueTime ? `${parseDueTimeForInput(dueTime)}:59` : '23:59:59'

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

export function formatCountdown(totalSeconds) {
  const total = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (value) => String(value).padStart(2, '0')

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }

  return `${pad(minutes)}:${pad(seconds)}`
}

export function formatSubmissionDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatSubmissionTime(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

export function getAssessmentStatus(assessment, currentDateTime = new Date()) {
  const dueAt = buildDueDateTime(assessment.due_date, assessment.due_time)

  const submittedAt = assessment.has_submitted
    ? buildDueDateTime(assessment.date_submitted, assessment.time_submitted)
    : null

  if (assessment.has_submitted) {
    return submittedAt > dueAt ? 'late' : 'submitted'
  } else if (assessment.is_closed) {
    return 'missing'
  }

  return dueAt && currentDateTime > dueAt ? 'missing' : 'available'
}
