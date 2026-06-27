import React, { useCallback, useEffect, useRef, useState } from 'react'
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
} from '../../utils/assessmentDue'

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

function QuestionRow({
  question,
  currentQuestionIndex,
  answers,
  setAnswers,
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
        {question.qType === 'CODING' && (
          <div className="question-answer-block">
            <span className="question-answer-label">Programming language</span>
            <p className="question-answer-meta">{question.progLang}</p>
            <input
              type="text"
              className="question-answer-input"
              placeholder="Type your answer here..."
              value={answers[question.id]?.answer ?? ''}
              onChange={(e) => setAnswers((prev) => ({
                ...prev,
                [question.id]: { answer: e.target.value },
              }))}
            />
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
                    onChange={(e) => setAnswers((prev) => ({
                      ...prev,
                      [question.id]: { answer: e.target.value },
                    }))}
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
  const { assessmentToTake } = useLocation().state ?? {}
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()

  // Assessment specifications
  const [title, setTitle] = useState('')
  const [type, setType] = useState('')
  const [duration, setDuration] = useState(0)
  const [timeLeft, setTimeLeft] = useState(null)
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
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submittedRef = useRef(false)
  const isTimedAssessment = (type === 'QUIZ' || type === 'EXAM') && duration > 0

  const handleSubmit = useCallback(async () => {
    if (!assessmentToTake?.assessment_id || submittedRef.current) return
    submittedRef.current = true

    setAssessmentErr('')
    setIsSubmitting(true)

    const submissionAnswers = Object.fromEntries(
      questionsList.map((question) => [
        question.id,
        { answer: answers[question.id]?.answer ?? '' },
      ])
    )

    try {
      const response = await fetch(
        `${API_BASE}/api/assessments/${assessmentToTake.assessment_id}/submit`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ answers: submissionAnswers }),
        }
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit assessment')
      }
      setShowSuccessModal(true)
    } catch (error) {
      submittedRef.current = false
      console.error('Failed to submit assessment', error)
      setAssessmentErr(error.message || 'Failed to submit assessment')
    } finally {
      setIsSubmitting(false)
    }
  }, [answers, questionsList, assessmentToTake?.assessment_id, token])

  useEffect(() => {
    if (!assessmentToTake?.assessment_id || !token) return

    let cancelled = false

    const fetchAssessment = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/assessments/${assessmentToTake.assessment_id}`,
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
        setTimeLeft(isTimed ? assessDuration * 60 : null)
        setIsTimeUp(false)
        setQuestionsList(
          data.questions.map((question) => ({
            id: question.question_id,
            qType: question.question_type,
            qPrompt: question.prompt,
            qMaxGrade: question.max_grade,
            progLang: question.prog_lang,
            options: question.options || [],
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
      } catch (error) {
        console.error('Failed to load assessment', error)
        if (!cancelled) {
          setAssessmentErr(error.message || 'Failed to load assessment')
          setAssessmentLoaded(false)
        }
      }
    }

    submittedRef.current = false
    setAssessmentLoaded(false)
    void fetchAssessment()

    return () => {
      cancelled = true
    }
  }, [assessmentToTake, token])

  useEffect(() => {
    if (!assessmentLoaded || timeLeft === null || timeLeft <= 0) {
      return undefined
    }

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)

    return () => clearInterval(intervalId)
  }, [assessmentLoaded, assessmentToTake?.assessment_id])

  useEffect(() => {
    if (!assessmentLoaded || !isTimedAssessment || timeLeft !== 0) {
      return undefined
    }

    setIsTimeUp(true)
    void handleSubmit()
  }, [assessmentLoaded, isTimedAssessment, timeLeft, handleSubmit])

  if (!assessmentToTake) {
    return (
      <div className="take-assessment-page">
        <p className="take-assessment-error">
          No assessment selected. Return to the course page and try again.
        </p>
      </div>
    )
  }

  const timerIsLow = timeLeft !== null && timeLeft > 0 && timeLeft <= 300
  const dueAt = buildDueDateTime(
    assessmentToTake.due_date,
    assessmentToTake.due_time
  )
  const isPastDue = dueAt ? new Date() > dueAt : false
  const dueDateLabel = formatDueDate(assessmentToTake.due_date)
  const dueTimeLabel = formatDueTime(assessmentToTake.due_time)

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

        {isTimedAssessment && timeLeft !== null && (
          <div
            className={`assessment-timer${
              isTimeUp ? ' assessment-timer--expired' : ''
            }${timerIsLow && !isTimeUp ? ' assessment-timer--warning' : ''}`}
            aria-live="polite"
            aria-atomic="true"
          >
            <FontAwesomeIcon icon={faClock} className="assessment-timer-icon" />
            <span className="assessment-timer-value">
              {isTimeUp ? '00:00' : formatCountdown(timeLeft)}
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
              <strong className="success-modal-assessment-title">{title}</strong>{' '}
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
