import React, { useCallback, useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../components/auth/AuthWrapper'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faClipboardList,
  faClock,
  faCalendarDays,
} from '@fortawesome/free-solid-svg-icons'

import {
  buildDueDateTime,
  formatDueDate,
  formatDueTime,
  formatCountdown,
  formatSubmissionDate,
  formatSubmissionTime,
} from '../../utils/assessmentDue'

import { isDraftEmpty, loadDraft, saveDraft, clearDraft } from '../../utils/takeAssessmentDraft'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL

function getAssessmentListPath(courseId, assessType) {
  if (assessType === 'ASSIGNMENT') {
    return `/course/${courseId}/assignments`
  }
  if (assessType === 'EXAM') {
    return `/course/${courseId}/exams`
  }
  return `/course/${courseId}/quizzes`
}

function getAssessmentTypeLabel(assessType) {
  if (assessType === 'ASSIGNMENT') return 'Assignments'
  if (assessType === 'EXAM') return 'Exams'
  return 'Quizzes'
}

function formatPistonOutput(data) {
  const parts = []

  if (data.compile?.stderr) parts.push(data.compile.stderr)
  if (data.compile?.stdout) parts.push(data.compile.stdout)
  if (data.run?.stdout) parts.push(data.run.stdout)
  if (data.run?.stderr) parts.push(data.run.stderr)

  return parts.join('\n').trim() || 'Program finished with no output.'
}

function QuestionRow({
  question,
  currentQuestionIndex,
  answers,
  setAnswers,
  handleRunCode,
  codeOutput,
  isRunningCode,
}) {
  return (
    <div
      className={`question-row question-row--${question.qType.toLowerCase()}`}
    >
      <div className="question-row-header">
        <span className="question-row-label">Q{currentQuestionIndex + 1}</span>
        <span className="question-row-type">{question.qType}</span>
        <span className="question-row-points">{question.qMaxGrade} pts</span>
      </div>
      <div className="question-row-body">
        <p className="question-row-prompt">{question.qPrompt}</p>
        {question.codeSnippet && (
          <div className="take-assessment-code-snippet">
            <div className="take-assessment-code-snippet-header">
              <span className="take-assessment-code-snippet-label">
                Provided code
              </span>
              {question.progLang && (
                <span className="take-assessment-code-snippet-lang">
                  {question.progLang}
                </span>
              )}
            </div>
            <div className="take-assessment-code-snippet-panel">
              <pre className="take-assessment-code-snippet-preview">
                <code>{question.codeSnippet}</code>
              </pre>
            </div>
          </div>
        )}
        {question.qType === 'CODING' && (
          <div className="question-answer-block question-answer-block--coding">
            <div className="coding-workspace-toolbar">
              <div className="coding-workspace-meta">
                <span className="question-answer-label">
                  Programming language
                </span>
                <p className="question-answer-meta">{question.progLang}</p>
              </div>
              <button
                type="button"
                className="run-code-button"
                onClick={() =>
                  handleRunCode(
                    question.id,
                    answers[question.id]?.answer ?? '',
                    question.progLang,
                    question.langVersion
                  )
                }
                disabled={isRunningCode}
              >
                {isRunningCode ? 'Running...' : 'Run'}
              </button>
            </div>
            <div className="coding-workspace">
              <div className="coding-workspace-panel coding-workspace-panel--editor">
                <span className="coding-workspace-panel-label">Editor</span>
                <div className="coding-workspace-panel-body">
                  <Editor
                    height="100%"
                    theme="vs-dark"
                    defaultLanguage={question.progLang}
                    value={answers[question.id]?.answer ?? ''}
                    onChange={(value) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [question.id]: { answer: value },
                      }))
                    }
                  />
                </div>
              </div>
              <div className="coding-workspace-panel coding-workspace-panel--output">
                <span className="coding-workspace-panel-label">Output</span>
                <pre className="coding-output-box">
                  {codeOutput || 'Run your code to see output here.'}
                </pre>
              </div>
            </div>
          </div>
        )}
        {question.qType === 'ESSAY' && (
          <div className="question-answer-block">
            <span className="question-answer-label">Your answer</span>
            <textarea
              className="question-answer-input question-answer-input--essay"
              placeholder="Type your answer here..."
              rows={6}
              value={answers[question.id]?.answer ?? ''}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  [question.id]: { answer: e.target.value },
                }))
              }
            />
          </div>
        )}
        {question.qType === 'MCQ' && (
          <div className="question-answer-block">
            <span className="question-answer-label">Select one option</span>
            <ul className="question-row-options">
              {question.options.map((option, optionIndex) => (
                <li
                  key={`${question.id}-${option}`}
                  className="question-row-option"
                >
                  <span
                    className="question-row-option-marker"
                    aria-hidden="true"
                  >
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <input
                    type="radio"
                    id={`${question.id}-${option}`}
                    name={String(question.id)}
                    value={option}
                    checked={
                      answers[question.id]?.answer === option ? true : false
                    }
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [question.id]: { answer: e.target.value },
                      }))
                    }
                  />
                  <label htmlFor={`${question.id}-${option}`}>{option}</label>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function TakeAssessmentPage() {
  const { assessmentToTake: assessmentFromState } = useLocation().state ?? {}
  const { courseId, assessmentId } = useParams()
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const studentId = user?.user_id ?? null
  const resolvedAssessmentId =
    assessmentId ?? assessmentFromState?.assessment_id ?? null

  const startedAtRef = useRef(null)
  const durationSecondsRef = useRef(0)
  const [timerTick, setTimerTick] = useState(0)
  const [draftResolved, setDraftResolved] = useState(false)

  // Assessment specifications
  const [title, setTitle] = useState('')
  const [type, setType] = useState('')
  const [duration, setDuration] = useState(0)
  const [dueDate, setDueDate] = useState(assessmentFromState?.due_date ?? null)
  const [dueTime, setDueTime] = useState(assessmentFromState?.due_time ?? null)
  const [isTimeUp, setIsTimeUp] = useState(false)
  const [assessmentLoaded, setAssessmentLoaded] = useState(false)
  const [assessmentErr, setAssessmentErr] = useState('')

  // Questions specifications
  const [questionsList, setQuestionsList] = useState([])
  const [codingQuestions, setCodingQuestions] = useState(0)
  const [essayQuestions, setEssayQuestions] = useState(0)
  const [mcqQuestions, setMcqQuestions] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  // Security specifications
  const [windowSwitching, setWindowSwitching] = useState(false)
  const [clipboardAccess, setClipboardAccess] = useState(false)
  const [screenSnapshot, setScreenSnapshot] = useState(false)
  const [questionStats, setQuestionStats] = useState(false)

  const [answers, setAnswers] = useState({})
  const [codeOutputs, setCodeOutputs] = useState({})
  const [runningQuestionId, setRunningQuestionId] = useState(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submittedRef = useRef(false)
  const isTimedAssessment = (type === 'QUIZ' || type === 'EXAM') && duration > 0

  const getRemainingSeconds = useCallback(() => {
    if (!isTimedAssessment || startedAtRef.current == null) return null
    const elapsed = (Date.now() - startedAtRef.current) / 1000
    return Math.max(0, Math.floor(durationSecondsRef.current - elapsed))
  }, [isTimedAssessment, timerTick])

  const remainingSeconds = getRemainingSeconds()

  const buildDraftSnapshot = useCallback(
    () => ({
      answers,
      codeOutputs,
      currentQuestionIndex,
      startedAt: startedAtRef.current,
      durationSeconds: durationSecondsRef.current,
    }),
    [answers, codeOutputs, currentQuestionIndex]
  )

  useEffect(() => {
    if (!draftResolved || !resolvedAssessmentId || !studentId) return
    const snapshot = buildDraftSnapshot()
    if (!isDraftEmpty(snapshot)) {
      saveDraft(resolvedAssessmentId, studentId, snapshot)
    }
  }, [
    buildDraftSnapshot,
    draftResolved,
    resolvedAssessmentId,
    studentId,
  ])

  const handleRunCode = useCallback(
    async (questionId, code, progLang, progVersion) => {
      if (!code) return
      if (!progLang) return

      setRunningQuestionId(questionId)
      setCodeOutputs((prev) => ({
        ...prev,
        [questionId]: 'Running...',
      }))

      try {
        const response = await fetch(
          `${API_BASE}/api/assessments/${resolvedAssessmentId}/run-code`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code, progLang, progVersion }),
          }
        )
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || data.message || 'Failed to run code')
        }

        setCodeOutputs((prev) => ({
          ...prev,
          [questionId]: formatPistonOutput(data),
        }))
      } catch (error) {
        console.error('Failed to run code', error)
        setCodeOutputs((prev) => ({
          ...prev,
          [questionId]: error.message || 'Failed to run code',
        }))
      } finally {
        setRunningQuestionId(null)
      }
    },
    [token, resolvedAssessmentId]
  )

  const handleSubmit = useCallback(async () => {
    if (!resolvedAssessmentId || submittedRef.current) return
    submittedRef.current = true

    setAssessmentErr('')
    setIsSubmitting(true)
    const now = new Date()
    const submissionDate = formatSubmissionDate(now)
    const submissionTime = formatSubmissionTime(now)
    const submissionAnswers = Object.fromEntries(
      questionsList.map((question) => [
        question.id,
        { answer: answers[question.id]?.answer ?? '' },
      ])
    )
    console.log(submissionAnswers)

    try {
      const response = await fetch(
        `${API_BASE}/api/assessments/${resolvedAssessmentId}/submit`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            answers: submissionAnswers,
            todayDate: submissionDate,
            todayTime: submissionTime,
          }),
        }
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit assessment')
      }
      if (studentId) {
        clearDraft(resolvedAssessmentId, studentId)
      }
      setShowSuccessModal(true)
    } catch (error) {
      submittedRef.current = false
      console.error('Failed to submit assessment', error)
      setAssessmentErr(error.message || 'Failed to submit assessment')
    } finally {
      setIsSubmitting(false)
    }
  }, [answers, questionsList, resolvedAssessmentId, studentId, token])

  useEffect(() => {
    if (!resolvedAssessmentId || !token) return

    let cancelled = false

    const fetchAssessment = async () => {
      const draft =
        studentId ? loadDraft(resolvedAssessmentId, studentId) : null

      try {
        const response = await fetch(
          `${API_BASE}/api/assessments/${resolvedAssessmentId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load assessment')
        }

        if (cancelled) return

        const assessType = data.assessment.assess_type
        const assessDuration = Number(data.assessment.duration) || 0
        const isTimed =
          (assessType === 'QUIZ' || assessType === 'EXAM') && assessDuration > 0

        setTitle(data.assessment.title)
        setType(assessType)
        setDuration(assessDuration)
        setDueDate(data.assessment.due_date ?? null)
        setDueTime(data.assessment.due_time ?? null)
        setIsTimeUp(false)
        startedAtRef.current = null
        durationSecondsRef.current = 0

        if (isTimed) {
          const totalSeconds = assessDuration * 60
          durationSecondsRef.current = totalSeconds

          if (draft?.startedAt != null) {
            startedAtRef.current = draft.startedAt
            if (Number(draft.durationSeconds) > 0) {
              durationSecondsRef.current = draft.durationSeconds
            }
            const elapsed = (Date.now() - draft.startedAt) / 1000
            if (durationSecondsRef.current - elapsed <= 0) {
              setIsTimeUp(true)
            }
          } else {
            startedAtRef.current = Date.now()
          }
        }

        if (draft) {
          setAnswers(draft.answers ?? {})
          setCurrentQuestionIndex(draft.currentQuestionIndex ?? 0)
          setCodeOutputs(draft.codeOutputs ?? {})
        } else {
          setAnswers({})
          setCurrentQuestionIndex(0)
          setCodeOutputs({})
        }

        setQuestionsList(
          data.questions.map((question) => ({
            id: question.question_id,
            qType: question.question_type,
            qPrompt: question.prompt,
            qMaxGrade: question.max_grade,
            progLang: question.prog_lang,
            langVersion: question.lang_version,
            options: question.options || [],
            codeSnippet: question.code_snippet || null,
          }))
        )
        setCodingQuestions(
          data.questions.filter(
            (question) => question.question_type === 'CODING'
          ).length
        )
        setEssayQuestions(
          data.questions.filter(
            (question) => question.question_type === 'ESSAY'
          ).length
        )
        setMcqQuestions(
          data.questions.filter((question) => question.question_type === 'MCQ')
            .length
        )
        setWindowSwitching(data.securitySettings.windowswitching)
        setClipboardAccess(data.securitySettings.clipboardaccess)
        setScreenSnapshot(data.securitySettings.screensnapshot)
        setQuestionStats(data.securitySettings.questionstats)
        setAssessmentErr('')
        setAssessmentLoaded(true)
        setDraftResolved(true)
        setTimerTick((tick) => tick + 1)
      } catch (error) {
        console.error('Failed to load assessment', error)
        if (!cancelled) {
          setAssessmentErr(error.message || 'Failed to load assessment')
          setAssessmentLoaded(false)
          setDraftResolved(true)
        }
      }
    }

    submittedRef.current = false
    setAssessmentLoaded(false)
    setDraftResolved(false)
    setTimerTick(0)
    void fetchAssessment()

    return () => {
      cancelled = true
    }
  }, [resolvedAssessmentId, studentId, token])

  useEffect(() => {
    if (
      !assessmentLoaded ||
      !isTimedAssessment ||
      startedAtRef.current == null ||
      isTimeUp
    ) {
      return undefined
    }

    const intervalId = setInterval(() => {
      const elapsed = (Date.now() - startedAtRef.current) / 1000
      const remaining = durationSecondsRef.current - elapsed

      setTimerTick((tick) => tick + 1)

      if (remaining <= 0) {
        setIsTimeUp(true)
      }
    }, 1000)

    return () => clearInterval(intervalId)
  }, [assessmentLoaded, isTimedAssessment, isTimeUp, resolvedAssessmentId])

  useEffect(() => {
    if (!assessmentLoaded || !isTimedAssessment || !isTimeUp) {
      return undefined
    }

    void handleSubmit()
  }, [assessmentLoaded, isTimedAssessment, isTimeUp, handleSubmit])

  if (!resolvedAssessmentId) {
    return (
      <div className="take-assessment-page">
        <p className="take-assessment-error">
          No assessment selected. Return to the course page and try again.
        </p>
      </div>
    )
  }

  const timerIsLow =
    remainingSeconds !== null && remainingSeconds > 0 && remainingSeconds <= 300
  const dueAt = buildDueDateTime(dueDate, dueTime)
  const isPastDue = dueAt ? new Date() > dueAt : false
  const dueDateLabel = formatDueDate(dueDate)
  const dueTimeLabel = formatDueTime(dueTime)

  const handleGoToListPage = () => {
    navigate(getAssessmentListPath(courseId, type))
    setShowSuccessModal(false)
  }

  const assessmentTypeLabel = getAssessmentTypeLabel(type)

  return (
    <div className="take-assessment-page">
      <div className="course-special-header take-assessment-header">
        <FontAwesomeIcon icon={faClipboardList} />
        <span> / </span>
        <p className="take-assessment-title">{title || 'Loading...'}</p>

        {isTimedAssessment && remainingSeconds !== null && (
          <div
            className={`assessment-timer${
              isTimeUp ? ' assessment-timer--expired' : ''
            }${timerIsLow && !isTimeUp ? ' assessment-timer--warning' : ''}`}
            aria-live="polite"
            aria-atomic="true"
          >
            <FontAwesomeIcon icon={faClock} className="assessment-timer-icon" />
            <span className="assessment-timer-value">
              {isTimeUp ? '00:00' : formatCountdown(remainingSeconds)}
            </span>
          </div>
        )}

        {!isTimedAssessment && dueDateLabel && (
          <div
            className={`assessment-due${
              isPastDue ? ' assessment-due--past' : ''
            }`}
          >
            <FontAwesomeIcon
              icon={faCalendarDays}
              className="assessment-due-icon"
            />
            <div className="assessment-due-content">
              <span className="assessment-due-label">Due</span>
              <span className="assessment-due-date">{dueDateLabel}</span>
              {dueTimeLabel && (
                <span className="assessment-due-time">{dueTimeLabel}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {assessmentErr && (
        <p className="take-assessment-error">{assessmentErr}</p>
      )}

      <div className="take-assessment-body">
        <div className="assessment-details">
          <div className="assessment-details-header">
            <h3>Assessment overview</h3>
          </div>

          <div className="assessment-details-columns">
            <section className="assessment-details-section assessment-details-section--security">
              <h4 className="assessment-details-section-title">
                Proctoring rules
              </h4>
              <ul className="assessment-detail-list">
                <li
                  className={`assessment-detail-item${
                    windowSwitching ? '' : ' assessment-detail-item--off'
                  }`}
                >
                  Window switching {windowSwitching ? 'enabled' : 'disabled'}
                </li>
                <li
                  className={`assessment-detail-item${
                    clipboardAccess ? '' : ' assessment-detail-item--off'
                  }`}
                >
                  Clipboard access {clipboardAccess ? 'enabled' : 'disabled'}
                </li>
                <li
                  className={`assessment-detail-item${
                    screenSnapshot ? '' : ' assessment-detail-item--off'
                  }`}
                >
                  Screen snapshots {screenSnapshot ? 'enabled' : 'disabled'}
                </li>
                <li
                  className={`assessment-detail-item${
                    questionStats ? '' : ' assessment-detail-item--off'
                  }`}
                >
                  Question stats {questionStats ? 'tracked' : 'not tracked'}
                </li>
              </ul>
            </section>

            <section className="assessment-details-section assessment-details-section--questions">
              <h4 className="assessment-details-section-title">
                Question breakdown
              </h4>
              <div className="assessment-detail-stats">
                <div className="assessment-stat-card assessment-stat-card--coding">
                  <span className="assessment-stat-value">
                    {codingQuestions}
                  </span>
                  <span className="assessment-stat-label">Coding</span>
                </div>
                <div className="assessment-stat-card assessment-stat-card--essay">
                  <span className="assessment-stat-value">
                    {essayQuestions}
                  </span>
                  <span className="assessment-stat-label">Essay</span>
                </div>
                <div className="assessment-stat-card assessment-stat-card--mcq">
                  <span className="assessment-stat-value">{mcqQuestions}</span>
                  <span className="assessment-stat-label">MCQ</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="assessment-questions">
          <div className="assessment-questions-header">
            <h3>Questions</h3>
          </div>
          <div className="assessment-questions-body">
            {questionsList.length > 0 ? (
              <QuestionRow
                question={questionsList[currentQuestionIndex]}
                currentQuestionIndex={currentQuestionIndex}
                answers={answers}
                setAnswers={setAnswers}
                handleRunCode={handleRunCode}
                codeOutput={
                  codeOutputs[questionsList[currentQuestionIndex]?.id]
                }
                isRunningCode={
                  runningQuestionId === questionsList[currentQuestionIndex]?.id
                }
              />
            ) : (
              <p className="assessment-questions-empty">No questions found</p>
            )}
            <div className="assessment-questions-nav">
              <span className="assessment-questions-progress">
                Question{' '}
                {questionsList.length > 0 ? currentQuestionIndex + 1 : 0} of{' '}
                {questionsList.length}
              </span>
              <div className="assessment-questions-actions">
                <button
                  type="button"
                  className="assessment-questions-button assessment-questions-button--secondary"
                  onClick={() =>
                    setCurrentQuestionIndex(currentQuestionIndex - 1)
                  }
                  disabled={currentQuestionIndex === 0}
                >
                  Previous
                </button>
                {currentQuestionIndex === questionsList.length - 1 ? (
                  <button
                    type="button"
                    className="assessment-questions-button assessment-questions-button--primary"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="assessment-questions-button assessment-questions-button--primary"
                    onClick={() =>
                      setCurrentQuestionIndex(currentQuestionIndex + 1)
                    }
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSuccessModal && (
        <div className="success-modal-backdrop">
          <div className="success-modal success-modal--submitted">
            <h3>Assessment submitted</h3>
            <p>
              <strong className="success-modal-assessment-title">
                {title}
              </strong>{' '}
              has been submitted successfully. Your instructor will review your
              answers when grading is complete.
            </p>
            <button
              type="button"
              className="success-modal-btn"
              onClick={handleGoToListPage}
            >
              Go to {assessmentTypeLabel} page
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TakeAssessmentPage
