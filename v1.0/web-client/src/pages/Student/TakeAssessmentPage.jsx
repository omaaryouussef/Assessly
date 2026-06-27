import React, { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
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
} from '../../utils/assessmentDue'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL

function formatCountdown(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (value) => String(value).padStart(2, '0')

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }

  return `${pad(minutes)}:${pad(seconds)}`
}

function TakeAssessmentPage() {
  const { assessmentToTake } = useLocation().state ?? {}
  const { courseId } = useParams()
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

  // Security specifications
  const [windowSwitching, setWindowSwitching] = useState(false)
  const [clipboardAccess, setClipboardAccess] = useState(false)
  const [screenSnapshot, setScreenSnapshot] = useState(false)
  const [questionStats, setQuestionStats] = useState(false)

  const isTimedAssessment = (type === 'QUIZ' || type === 'EXAM') && duration > 0

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

    setAssessmentLoaded(false)
    void fetchAssessment()

    return () => {
      cancelled = true
    }
  }, [assessmentToTake, token])

  useEffect(() => {
    if (!assessmentLoaded || timeLeft === null || timeLeft <= 0)
      return undefined

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsTimeUp(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(intervalId)
  }, [assessmentLoaded, assessmentToTake?.assessment_id])

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
      </div>
    </div>
  )
}

export default TakeAssessmentPage
