import React, { useEffect, useMemo, useState } from 'react'
import { getApiBase } from '../config/api'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../components/auth/AuthWrapper'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCommentDots,
  faPenToSquare,
  faPencil,
  faCheck,
} from '@fortawesome/free-solid-svg-icons'
import {
  formatDueDate,
  formatDueTime,
  formatSubmissionLateness,
  getAssessmentStatus,
} from '../utils/assessmentDue'

const EMPTY_QUESTION_FEEDBACK = {
  instructorFeedback: [],
  studentFeedback: [],
}

function isGrader(role) {
  return role === 'INSTRUCTOR' || role === 'TA'
}

function sameUserId(a, b) {
  if (a === null || a === undefined || b === null || b === undefined) return false
  return Number(a) === Number(b)
}

function getUserFeedbackKey(role) {
  return isGrader(role) ? 'instructorFeedback' : 'studentFeedback'
}

function canViewerResolveComment(comment, viewerUserId, viewerRole) {
  if (comment.resolved || sameUserId(comment.userId, viewerUserId)) return false
  if (isGrader(viewerRole)) return comment.authorRole === 'STUDENT'
  return comment.authorRole === 'INSTRUCTOR' || comment.authorRole === 'TA'
}

function normalizeGradeValue(value) {
  if (value === '' || value === null || value === undefined) return null
  const numeric = Number(value)
  return Number.isNaN(numeric) ? null : numeric
}

function formatDateTimeLabel(date, time) {
  const dateLabel = formatDueDate(date)
  if (!dateLabel) return ''
  const timeLabel = formatDueTime(time)
  return timeLabel ? `${dateLabel} ${timeLabel}` : dateLabel
}

function getStatusLabel(status) {
  if (status === 'submitted') return 'Submitted'
  if (status === 'missing') return 'Missing'
  if (status === 'available') return 'Available'
  if (status === 'graded') return 'Graded'
  return 'Late'
}

function normalizeFeedbackEntry(raw) {
  const mapComment = (comment) => ({
    ...comment,
    id: Number(comment.id),
    userId: Number(comment.userId),
    resolved: Boolean(comment.resolved),
  })

  return {
    instructorFeedback: (raw?.instructorFeedback ?? []).map(mapComment),
    studentFeedback: (raw?.studentFeedback ?? []).map(mapComment),
  }
}

function getFeedbackForQuestion(feedbackMap, questionId) {
  const id = Number(questionId)
  return feedbackMap[id] ?? EMPTY_QUESTION_FEEDBACK
}

function getMyUnresolvedComment(questionFeedback, userId, role) {
  if (!questionFeedback) return null

  const lists = [
    questionFeedback[getUserFeedbackKey(role)] ?? [],
    questionFeedback.instructorFeedback ?? [],
    questionFeedback.studentFeedback ?? [],
  ]

  for (const list of lists) {
    const found = list.find(
      (comment) => sameUserId(comment.userId, userId) && !comment.resolved
    )
    if (found) return found
  }

  return null
}

function getThreadComments(questionFeedback, viewerUserId) {
  if (!questionFeedback) return []

  const instructorFeedback = questionFeedback.instructorFeedback ?? []
  const studentFeedback = questionFeedback.studentFeedback ?? []

  const allComments = [
    ...instructorFeedback.map((comment) => ({
      ...comment,
      authorRole: 'INSTRUCTOR',
    })),
    ...studentFeedback.map((comment) => ({
      ...comment,
      authorRole: 'STUDENT',
    })),
  ].sort((a, b) => Number(a.id) - Number(b.id))

  return allComments.filter(
    (comment) => comment.resolved || !sameUserId(comment.userId, viewerUserId)
  )
}

function hasQuestionThreadActivity(questionFeedback, viewerUserId) {
  if (!questionFeedback) return false

  const hasOwnOpen = [
    ...(questionFeedback.instructorFeedback ?? []),
    ...(questionFeedback.studentFeedback ?? []),
  ].some((comment) => sameUserId(comment.userId, viewerUserId) && !comment.resolved)

  return hasOwnOpen || getThreadComments(questionFeedback, viewerUserId).length > 0
}

function StudentAnswerDisplay({ question, answer }) {
  const answerText = answer?.answer ?? ''

  if (question.qType === 'CODING') {
    return (
      <div className="feedback-answer-block feedback-answer-block--coding">
        <span className="feedback-answer-label">Student code</span>
        {question.progLang && (
          <p className="feedback-answer-meta">{question.progLang}</p>
        )}
        <pre className="feedback-code-answer">
          {answerText || 'No answer submitted.'}
        </pre>
      </div>
    )
  }

  if (question.qType === 'ESSAY') {
    return (
      <div className="feedback-answer-block">
        <span className="feedback-answer-label">Student answer</span>
        <p className="feedback-essay-answer">
          {answerText || 'No answer submitted.'}
        </p>
      </div>
    )
  }

  return (
    <div className="feedback-answer-block">
      <span className="feedback-answer-label">Selected answer</span>
      <ul className="feedback-mcq-options">
        {question.options.map((option, optionIndex) => {
          const isSelected = answerText === option
          return (
            <li
              key={`${question.id}-${option}`}
              className={`feedback-mcq-option${isSelected ? ' feedback-mcq-option--selected' : ''}`}
            >
              <span className="feedback-mcq-option-marker" aria-hidden="true">
                {String.fromCharCode(65 + optionIndex)}
              </span>
              <span>{option}</span>
              {isSelected && (
                <span className="feedback-mcq-selected-tag">Selected</span>
              )}
            </li>
          )
        })}
      </ul>
      {!answerText && (
        <p className="feedback-empty-answer">No answer submitted.</p>
      )}
    </div>
  )
}

function CommentThread({
  questionId,
  comments,
  showEmptyState,
  currentUserId,
  currentUserRole,
  onResolveComment,
}) {
  if (comments.length === 0) {
    return showEmptyState ? (
      <p className="feedback-thread-empty">No comments yet.</p>
    ) : null
  }

  return (
    <ul className="feedback-thread">
      {comments.map((comment) => {
        const isOwn = sameUserId(comment.userId, currentUserId)
        const canResolve = canViewerResolveComment(
          comment,
          currentUserId,
          currentUserRole
        )

        return (
          <li
            key={comment.id}
            className={`feedback-thread-item feedback-thread-item--${comment.authorRole.toLowerCase()}${comment.resolved ? ' feedback-thread-item--resolved' : ''}${isOwn ? ' feedback-thread-item--own' : ''}`}
          >
            <div className="feedback-thread-item-header">
              <span className="feedback-thread-author">{comment.userName}</span>
              <span className="feedback-thread-role">{comment.authorRole}</span>
              {comment.resolved && (
                <span className="feedback-thread-resolved-tag">Resolved</span>
              )}
            </div>
            <p className="feedback-thread-body">{comment.feedback}</p>
            {canResolve && (
              <button
                type="button"
                className="feedback-thread-resolve-btn"
                onClick={() =>
                  onResolveComment(questionId, comment.id, comment.authorRole)
                }
              >
                <FontAwesomeIcon icon={faCheck} />
                Mark resolved
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function UserCommentComposer({
  questionId,
  myUnresolvedComment,
  canAdd,
  viewerRole,
  onSaveComment,
}) {
  const [isComposing, setIsComposing] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveCommentError, setSaveCommentError] = useState('')
  const [localComment, setLocalComment] = useState(null)
  const effectiveComment = myUnresolvedComment ?? localComment
  const [draft, setDraft] = useState(effectiveComment?.feedback ?? '')

  useEffect(() => {
    if (myUnresolvedComment) {
      setLocalComment(null)
    }
  }, [myUnresolvedComment])

  useEffect(() => {
    if (!isEditing && !isComposing) {
      setDraft(effectiveComment?.feedback ?? '')
    }
  }, [effectiveComment, isEditing, isComposing])

  const startComposing = () => {
    setSaveCommentError('')
    setDraft('')
    setIsComposing(true)
  }

  const startEditing = () => {
    setSaveCommentError('')
    setDraft(effectiveComment?.feedback ?? '')
    setIsEditing(true)
  }

  const cancelComposing = () => {
    setSaveCommentError('')
    setDraft(effectiveComment?.feedback ?? '')
    setIsComposing(false)
    setIsEditing(false)
  }

  const saveComment = async () => {
    const trimmed = draft.trim()
    if (!trimmed || isSaving) return
    setIsSaving(true)
    setSaveCommentError('')
    try {
      const saved = await onSaveComment(questionId, trimmed)
      if (!saved?.id) {
        setSaveCommentError('Comment could not be saved. Please try again.')
        return
      }
      setLocalComment(saved)
      setIsComposing(false)
      setIsEditing(false)
    } catch (error) {
      setSaveCommentError(error.message || 'Failed to save comment')
    } finally {
      setIsSaving(false)
    }
  }

  const addLabel = isGrader(viewerRole) ? 'Add a comment' : 'Add a reply'

  if (effectiveComment && !isEditing && !isComposing) {
    return (
      <div className="feedback-my-comment">
        <div className="feedback-my-comment-card">
          <span className="feedback-my-comment-label">Your comment</span>
          <p className="feedback-my-comment-body">{effectiveComment.feedback}</p>
          <button
            type="button"
            className="feedback-comment-edit-btn"
            onClick={startEditing}
          >
            <FontAwesomeIcon icon={faPencil} />
            Edit comment
          </button>
        </div>
        <p className="feedback-comment-pending">
          Waiting for the other party to mark this comment as resolved.
        </p>
      </div>
    )
  }

  if (isComposing || isEditing) {
    return (
      <div className="feedback-comment-compose">
        <textarea
          className="feedback-textarea"
          rows={3}
          placeholder={
            isGrader(viewerRole)
              ? 'Write your comment...'
              : 'Write your reply...'
          }
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
        />
        {saveCommentError && (
          <p className="feedback-comment-save-error">{saveCommentError}</p>
        )}
        <div className="feedback-comment-actions">
          <button
            type="button"
            className="feedback-comment-btn feedback-comment-btn--primary"
            onClick={saveComment}
            disabled={!draft.trim() || isSaving}
          >
            {isSaving
              ? 'Saving…'
              : isEditing
                ? 'Save changes'
                : 'Add comment'}
          </button>
          <button
            type="button"
            className="feedback-comment-btn feedback-comment-btn--ghost"
            onClick={cancelComposing}
            disabled={isSaving}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (!canAdd) {
    return null
  }

  return (
    <button
      type="button"
      className="feedback-comment-add-btn"
      onClick={startComposing}
    >
      <FontAwesomeIcon icon={faCommentDots} />
      {addLabel}
    </button>
  )
}

function QuestionCommentsSection({
  questionId,
  questionFeedback,
  currentUser,
  onSaveComment,
  onResolveComment,
}) {
  const threadComments = getThreadComments(questionFeedback, currentUser.user_id)
  const myUnresolvedComment = getMyUnresolvedComment(
    questionFeedback,
    currentUser.user_id,
    currentUser.role
  )
  const canAdd = !myUnresolvedComment
  const showEmptyThread = !hasQuestionThreadActivity(
    questionFeedback,
    currentUser.user_id
  )

  return (
    <section className="feedback-comment-section">
      <div className="feedback-comment-section-header">
        <label>
          <FontAwesomeIcon icon={faCommentDots} />
          Comments
        </label>
      </div>

      <CommentThread
        questionId={questionId}
        comments={threadComments}
        showEmptyState={showEmptyThread}
        currentUserId={currentUser.user_id}
        currentUserRole={currentUser.role}
        onResolveComment={onResolveComment}
      />

      <div className="feedback-comment-composer-wrap">
        <UserCommentComposer
          questionId={questionId}
          myUnresolvedComment={myUnresolvedComment}
          canAdd={canAdd}
          viewerRole={currentUser.role}
          onSaveComment={onSaveComment}
        />
      </div>
    </section>
  )
}

function FeedbackQuestionCard({
  question,
  questionIndex,
  answer,
  gradeValue,
  canEditGrade,
  questionFeedback,
  currentUser,
  onGradeChange,
  onSaveComment,
  onResolveComment,
}) {
  return (
    <article
      className={`feedback-question-card feedback-question-card--${question.qType.toLowerCase()}`}
    >
      <header className="feedback-question-card-header">
        <div className="feedback-question-card-title">
          <span className="feedback-question-label">Q{questionIndex + 1}</span>
          <span className="feedback-question-type">{question.qType}</span>
        </div>
        <span className="feedback-question-max">
          {question.qMaxGrade} pts max
        </span>
      </header>

      <p className="feedback-question-prompt">{question.qPrompt}</p>

      {question.codeSnippet && (
        <div className="feedback-question-code-snippet">
          <div className="feedback-question-code-snippet-header">
            <span className="feedback-question-code-snippet-label">
              Provided code
            </span>
            {question.progLang && (
              <span className="feedback-question-code-snippet-lang">
                {question.progLang}
              </span>
            )}
          </div>
          <div className="feedback-question-code-snippet-panel">
            <pre className="feedback-question-code-snippet-preview">
              <code>{question.codeSnippet}</code>
            </pre>
          </div>
        </div>
      )}

      <StudentAnswerDisplay question={question} answer={answer} />

      <div className="feedback-grading-panel">
        <div className="feedback-grade-field">
          <label htmlFor={`grade-${question.id}`}>Question grade</label>
          {canEditGrade ? (
            <div className="feedback-grade-input-wrap">
              <input
                id={`grade-${question.id}`}
                type="number"
                className="feedback-grade-input"
                min={0}
                max={question.qMaxGrade}
                step="0.1"
                placeholder="0"
                value={gradeValue}
                onChange={(e) => onGradeChange(question.id, e.target.value)}
              />
              <span className="feedback-grade-suffix">
                / {question.qMaxGrade}
              </span>
            </div>
          ) : (
            <p className="feedback-grade-readonly">
              {gradeValue !== '' && gradeValue != null
                ? `${gradeValue} / ${question.qMaxGrade}`
                : '—'}
            </p>
          )}
        </div>
      </div>

      <QuestionCommentsSection
        questionId={question.id}
        questionFeedback={questionFeedback}
        currentUser={currentUser}
        onSaveComment={onSaveComment}
        onResolveComment={onResolveComment}
      />
    </article>
  )
}

function AssessmentFeedbackPage() {
  const { courseId, assessmentId, studentId } = useParams()
  const { assessmentToGrade, studentName: studentNameFromState } =
    useLocation().state ?? {}
  const { assessmentToView } = useLocation().state ?? {}
  const { user, token } = useAuth()

  const [title, setTitle] = useState(assessmentToGrade?.title ?? '')
  const [assessmentMaxGrade, setAssessmentMaxGrade] = useState(
    Number(assessmentToGrade?.max_grade) || 0
  )
  const [dueDate, setDueDate] = useState(
    assessmentToGrade?.due_date ?? assessmentToView?.due_date ?? ''
  )
  const [dueTime, setDueTime] = useState(
    assessmentToGrade?.due_time ?? assessmentToView?.due_time ?? ''
  )
  const [isClosed, setIsClosed] = useState(
    assessmentToGrade?.is_closed ?? assessmentToView?.is_closed ?? false
  )
  const [submissionMeta, setSubmissionMeta] = useState({
    has_submitted:
      assessmentToGrade?.has_submitted ?? assessmentToView?.has_submitted ?? false,
    graded: assessmentToGrade?.graded ?? assessmentToView?.graded ?? false,
    date_submitted:
      assessmentToGrade?.date_submitted ?? assessmentToView?.date_submitted ?? null,
    time_submitted:
      assessmentToGrade?.time_submitted ?? assessmentToView?.time_submitted ?? null,
  })
  const [questionsList, setQuestionsList] = useState([])
  const [answers, setAnswers] = useState({})
  const [questionGrades, setQuestionGrades] = useState({})
  const [savedGrades, setSavedGrades] = useState({})
  const [questionsFeedbackData, setQuestionsFeedbackData] = useState({})
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingGrades, setIsSavingGrades] = useState(false)

  const canEditGrade = isGrader(user?.role)
  const isStudentViewer = user?.role === 'STUDENT'

  useEffect(() => {
    if (!assessmentId || !studentId || !token || !user) return

    if (isStudentViewer && String(user.user_id) !== String(studentId)) {
      setLoadError('You can only view your own submission feedback.')
      setIsLoading(false)
      return
    }

    let cancelled = false

    const loadPageData = async () => {
      setIsLoading(true)
      setLoadError('')

      try {
        const [assessmentRes, answersRes, feedbackRes] = await Promise.all([
          fetch(`${getApiBase()}/api/assessments/${assessmentId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(
            `${getApiBase()}/api/assessments/${assessmentId}/student-answers/${studentId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          fetch(
            `${getApiBase()}/api/assessments/${assessmentId}/questions-feedback/${studentId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
        ])

        const assessmentData = await assessmentRes.json()
        if (!assessmentRes.ok) {
          throw new Error(assessmentData.error || 'Failed to load assessment')
        }

        const answersPayload = answersRes.ok ? await answersRes.json() : {}
        const answersData = answersPayload.answers ?? answersPayload
        const submission = answersPayload.submission ?? {
          has_submitted: false,
          graded: false,
          date_submitted: null,
          time_submitted: null,
        }
        const feedbackData = feedbackRes.ok ? await feedbackRes.json() : {}

        if (!feedbackRes.ok) {
          const feedbackError = feedbackData?.error || 'Failed to load comments'
          console.error('Failed to load question feedback', feedbackError)
        }

        if (cancelled) return

        setTitle(assessmentData.assessment.title)
        setAssessmentMaxGrade(Number(assessmentData.assessment.max_grade) || 0)
        setDueDate(assessmentData.assessment.due_date)
        setDueTime(assessmentData.assessment.due_time)
        setIsClosed(Boolean(assessmentData.assessment.is_closed))
        setSubmissionMeta({
          has_submitted: Boolean(submission.has_submitted),
          graded: Boolean(submission.graded),
          date_submitted: submission.date_submitted ?? null,
          time_submitted: submission.time_submitted ?? null,
        })
        const mappedQuestions = assessmentData.questions.map((question) => ({
          id: question.question_id,
          qType: question.question_type,
          qPrompt: question.prompt,
          qMaxGrade: question.max_grade,
          progLang: question.prog_lang,
          codeSnippet: question.code_snippet || null,
          options: question.options || [],
        }))

        const initialGrades = {}
        const normalizedFeedback = {}

        for (const question of mappedQuestions) {
          const savedAnswer = answersData[question.id]
          initialGrades[question.id] =
            savedAnswer?.grade !== null &&
            savedAnswer?.grade !== undefined &&
            savedAnswer?.grade !== ''
              ? String(savedAnswer.grade)
              : ''

          const rawFeedback =
            feedbackData[question.id] ?? feedbackData[String(question.id)]
          normalizedFeedback[question.id] = rawFeedback
            ? normalizeFeedbackEntry(rawFeedback)
            : { ...EMPTY_QUESTION_FEEDBACK }
        }

        setQuestionsList(mappedQuestions)
        setAnswers(answersData)
        setQuestionGrades(initialGrades)
        setSavedGrades(initialGrades)
        setQuestionsFeedbackData(normalizedFeedback)
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load assessment feedback page', error)
          setLoadError(error.message || 'Failed to load assessment feedback')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadPageData()
    return () => {
      cancelled = true
    }
  }, [assessmentId, studentId, token, user, isStudentViewer])

  const assessmentStatus = useMemo(
    () =>
      getAssessmentStatus({
        due_date: dueDate,
        due_time: dueTime,
        has_submitted: submissionMeta.has_submitted,
        date_submitted: submissionMeta.date_submitted,
        time_submitted: submissionMeta.time_submitted,
        graded: submissionMeta.graded,
        is_closed: isClosed,
      }),
    [dueDate, dueTime, submissionMeta, isClosed]
  )

  const dueDateLabel = formatDateTimeLabel(dueDate, dueTime) || '—'
  const submittedDateLabel = submissionMeta.has_submitted
    ? formatDateTimeLabel(
        submissionMeta.date_submitted,
        submissionMeta.time_submitted
      ) || '—'
    : 'Not submitted'

  const latenessLabel = useMemo(() => {
    if (!submissionMeta.has_submitted) return null
    return formatSubmissionLateness(
      dueDate,
      dueTime,
      submissionMeta.date_submitted,
      submissionMeta.time_submitted
    )
  }, [dueDate, dueTime, submissionMeta])

  const totalGrade = useMemo(() => {
    return questionsList.reduce((sum, question) => {
      const grade = normalizeGradeValue(questionGrades[question.id])
      return sum + (grade ?? 0)
    }, 0)
  }, [questionsList, questionGrades])

  const gradedQuestionCount = useMemo(() => {
    return questionsList.filter(
      (question) => normalizeGradeValue(questionGrades[question.id]) !== null
    ).length
  }, [questionsList, questionGrades])

  const hasUnsavedGrades = useMemo(() => {
    return questionsList.some((question) => {
      const current = normalizeGradeValue(questionGrades[question.id])
      const saved = normalizeGradeValue(savedGrades[question.id])
      return current !== saved
    })
  }, [questionsList, questionGrades, savedGrades])

  const handleGradeChange = (questionId, value) => {
    if (!canEditGrade) return
    setQuestionGrades((prev) => ({ ...prev, [questionId]: value }))
    setSaveError('')
  }

  const handleSaveGrades = async () => {
    if (!canEditGrade || !token) return

    const entries = questionsList
      .map((question) => ({
        questionId: question.id,
        grade: questionGrades[question.id],
      }))
      .filter(
        (entry) =>
          entry.grade !== '' &&
          entry.grade !== null &&
          entry.grade !== undefined &&
          normalizeGradeValue(entry.grade) !== null
      )

    if (entries.length === 0) {
      setSaveError('Enter at least one question grade before saving.')
      return
    }

    setIsSavingGrades(true)
    setSaveError('')

    try {
      const response = await fetch(
        `${getApiBase()}/api/assessments/${assessmentId}/question-grades/${studentId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ grades: entries }),
        }
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save grades')
      }

      setSavedGrades({ ...questionGrades })
    } catch (error) {
      console.error('Failed to save grades', error)
      setSaveError(error.message || 'Failed to save grades')
    } finally {
      setIsSavingGrades(false)
    }
  }

  const handleSaveComment = async (questionId, text) => {
    if (!user || !token) {
      throw new Error('You must be signed in to save comments.')
    }

    const normalizedQuestionId = Number(questionId)
    const currentUserId = Number(user.user_id)

    setSaveError('')

    try {
      const response = await fetch(
        `${getApiBase()}/api/assessments/${assessmentId}/questions-feedback/${studentId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            questionId: normalizedQuestionId,
            feedback: text,
          }),
        }
      )
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save comment')
      }

      const saved = data.feedback
      if (!saved?.id) {
        throw new Error(
          'Server returned an invalid response. Restart the API server and try again.'
        )
      }

      const listKey = getUserFeedbackKey(user.role)
      const nextComment = {
        id: Number(saved.id),
        userId: Number(saved.userId),
        userName: saved.userName || user.name,
        feedback: saved.feedback,
        resolved: false,
      }

      setQuestionsFeedbackData((prev) => {
        const current = getFeedbackForQuestion(prev, normalizedQuestionId)
        const list = [...current[listKey]]
        const existingIndex = list.findIndex(
          (comment) =>
            sameUserId(comment.userId, currentUserId) && !comment.resolved
        )

        if (existingIndex >= 0) {
          list[existingIndex] = nextComment
        } else {
          list.push(nextComment)
        }

        return {
          ...prev,
          [normalizedQuestionId]: {
            ...current,
            [listKey]: list,
          },
        }
      })

      return nextComment
    } catch (error) {
      console.error('Failed to save comment', error)
      setSaveError(error.message || 'Failed to save comment')
      throw error
    }
  }

  const handleResolveComment = async (questionId, commentId, authorRole) => {
    if (!user || !token) return

    const listKey =
      authorRole === 'STUDENT' ? 'studentFeedback' : 'instructorFeedback'

    setSaveError('')

    try {
      const response = await fetch(
        `${getApiBase()}/api/assessments/questions-feedback/${commentId}/resolve`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resolve comment')
      }

      setQuestionsFeedbackData((prev) => {
        const normalizedQuestionId = Number(questionId)
        const current = getFeedbackForQuestion(prev, normalizedQuestionId)
        const targetComment = current[listKey].find(
          (comment) => Number(comment.id) === Number(commentId)
        )
        if (
          !targetComment ||
          !canViewerResolveComment(
            { ...targetComment, authorRole },
            user.user_id,
            user.role
          )
        ) {
          return prev
        }

        const list = current[listKey].map((comment) =>
          comment.id === commentId ? { ...comment, resolved: true } : comment
        )

        return {
          ...prev,
          [normalizedQuestionId]: {
            ...current,
            [listKey]: list,
          },
        }
      })
    } catch (error) {
      console.error('Failed to resolve comment', error)
      setSaveError(error.message || 'Failed to resolve comment')
    }
  }

  const displayStudentName = isStudentViewer
    ? 'Your submission'
    : studentNameFromState || `Student #${studentId}`

  const pageTitle = canEditGrade ? 'Grade submission' : 'Assessment feedback'
  const backLink = canEditGrade
    ? `/course/${courseId}/view-all-students-grade`
    : `/course/${courseId}/view-grades`
  const backLabel = canEditGrade ? '← Back to all grades' : '← Back to grades'

  return (
    <div className="assessment-feedback-page">
      <div className="course-special-header assessment-feedback-header">
        <FontAwesomeIcon
          icon={faPenToSquare}
          className="course-special-header-icon"
        />
        <span> / </span>
        <p className="assessment-feedback-header-title">{pageTitle}</p>
      </div>

      <div className="assessment-feedback-content">
        <div className="assessment-feedback-topbar">
          <Link to={backLink} className="assessment-feedback-back-link">
            {backLabel}
          </Link>
          {canEditGrade && (
            <button
              type="button"
              className={`instructor-grades-save-btn${
                hasUnsavedGrades ? ' instructor-grades-save-btn--dirty' : ''
              }`}
              onClick={handleSaveGrades}
              disabled={!hasUnsavedGrades || isSavingGrades}
            >
              {isSavingGrades
                ? 'Saving…'
                : hasUnsavedGrades
                  ? 'Save grades'
                  : 'Grades saved'}
            </button>
          )}
        </div>

        {loadError && <p className="assessment-feedback-error">{loadError}</p>}
        {saveError && <p className="assessment-feedback-error">{saveError}</p>}

        {!loadError && (
          <>
            <section className="assessment-feedback-summary">
              <div className="assessment-feedback-summary-main">
                <h1 className="assessment-feedback-assessment-title">{title}</h1>
                <p className="assessment-feedback-student-name">
                  {displayStudentName}
                </p>
                <dl className="assessment-feedback-meta">
                  <div className="assessment-feedback-meta-item">
                    <dt className="assessment-feedback-meta-label">Due</dt>
                    <dd className="assessment-feedback-meta-value">
                      {dueDateLabel}
                    </dd>
                  </div>
                  <div className="assessment-feedback-meta-item">
                    <dt className="assessment-feedback-meta-label">Submitted</dt>
                    <dd className="assessment-feedback-meta-value">
                      {submittedDateLabel}
                    </dd>
                  </div>
                  <div className="assessment-feedback-meta-item">
                    <dt className="assessment-feedback-meta-label">Status</dt>
                    <dd className="assessment-feedback-meta-value">
                      <span
                        className={`assignment-status-badge assignment-status-badge--${assessmentStatus}`}
                      >
                        {getStatusLabel(assessmentStatus)}
                      </span>
                    </dd>
                  </div>
                  {latenessLabel && (
                    <div className="assessment-feedback-meta-item">
                      <dt className="assessment-feedback-meta-label">
                        Submitted late by
                      </dt>
                      <dd className="assessment-feedback-meta-value assessment-feedback-meta-value--late">
                        {latenessLabel}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
              <div className="assessment-feedback-total-card">
                <span className="assessment-feedback-total-label">
                  Total grade
                </span>
                <p className="assessment-feedback-total-value">
                  {totalGrade.toFixed(1)}
                  <span className="assessment-feedback-total-max">
                    {' '}
                    / {assessmentMaxGrade}
                  </span>
                </p>
                {canEditGrade && (
                  <p className="assessment-feedback-total-meta">
                    {gradedQuestionCount} of {questionsList.length} questions
                    graded
                  </p>
                )}
              </div>
            </section>

            {isLoading ? (
              <p className="assessment-feedback-loading">Loading submission…</p>
            ) : questionsList.length === 0 ? (
              <p className="assessment-feedback-empty">
                This assessment has no questions yet.
              </p>
            ) : (
              <div className="assessment-feedback-questions">
                {questionsList.map((question, index) => (
                  <FeedbackQuestionCard
                    key={question.id}
                    question={question}
                    questionIndex={index}
                    answer={answers[question.id]}
                    gradeValue={questionGrades[question.id] ?? ''}
                    canEditGrade={canEditGrade}
                    questionFeedback={getFeedbackForQuestion(
                      questionsFeedbackData,
                      question.id
                    )}
                    currentUser={user}
                    onGradeChange={handleGradeChange}
                    onSaveComment={handleSaveComment}
                    onResolveComment={handleResolveComment}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default AssessmentFeedbackPage
