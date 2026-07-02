export const isDraftEmpty = (draft) => {
  if (!draft) return true

  const hasAnswers = Object.values(draft.answers ?? {}).some(
    (entry) => String(entry?.answer ?? '').trim().length > 0
  )
  const hasCodeOutputs = Object.keys(draft.codeOutputs ?? {}).length > 0
  const hasProgress = (draft.currentQuestionIndex ?? 0) > 0
  const hasTimer =
    draft.startedAt != null && Number(draft.durationSeconds) > 0

  return !hasAnswers && !hasCodeOutputs && !hasProgress && !hasTimer
}

export const loadDraft = (assessmentId, studentId) => {
  if (!assessmentId || !studentId) return null

  try {
    const raw = localStorage.getItem(
      `student_assessment_draft_${assessmentId}-${studentId}`
    )
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const saveDraft = (assessmentId, studentId, draft) => {
  if (!assessmentId || !studentId || !draft) return
  localStorage.setItem(
    `student_assessment_draft_${assessmentId}-${studentId}`,
    JSON.stringify(draft)
  )
}

export const clearDraft = (assessmentId, studentId) => {
  if (!assessmentId || !studentId) return
  localStorage.removeItem(
    `student_assessment_draft_${assessmentId}-${studentId}`
  )
}
