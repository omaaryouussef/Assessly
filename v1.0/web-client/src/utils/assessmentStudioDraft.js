const draftKey = (courseId) => `assessment_studio_draft_${courseId}`

export function isDraftEmpty(draft) {
  if (!draft) return true

  const hasContent =
    Boolean(draft.title?.trim()) ||
    Boolean(draft.dueDate) ||
    Boolean(draft.dueTime) ||
    Number(draft.maxGrade) > 0 ||
    Number(draft.duration) > 0 ||
    (draft.questionsList?.length ?? 0) > 0 ||
    Boolean(draft.windowSwitching) ||
    Boolean(draft.clipboardAccess) ||
    Boolean(draft.screenSnapshot) ||
    Boolean(draft.questionStats) ||
    draft.editingAssessmentId != null

  return !hasContent
}

export function loadDraft(courseId) {
  if (!courseId) return null

  try {
    const raw = localStorage.getItem(draftKey(courseId))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveDraft(courseId, draft) {
  if (!courseId) return
  localStorage.setItem(
    draftKey(courseId),
    JSON.stringify({ ...draft, updatedAt: Date.now() }),
  )
}

export function clearDraft(courseId) {
  if (!courseId) return
  localStorage.removeItem(draftKey(courseId))
}
