import React, { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../../components/auth/AuthWrapper'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClipboardList, faClock } from '@fortawesome/free-solid-svg-icons'

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

  const [title, setTitle] = useState('')
  const [type, setType] = useState('')
  const [duration, setDuration] = useState(0)
  const [timeLeft, setTimeLeft] = useState(null)
  const [isTimeUp, setIsTimeUp] = useState(false)
  const [assessmentLoaded, setAssessmentLoaded] = useState(false)
  const [assessmentErr, setAssessmentErr] = useState('')
  const [questionsList, setQuestionsList] = useState([])

  const isTimedAssessment =
    (type === 'QUIZ' || type === 'EXAM') && duration > 0

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
    if (!assessmentLoaded || timeLeft === null || timeLeft <= 0) return undefined

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
      </div>

      {assessmentErr && (
        <p className="take-assessment-error">{assessmentErr}</p>
      )}

      {isTimeUp && (
        <div className="assessment-time-up-banner" role="alert">
          Time is up. Please submit your assessment now.
        </div>
      )}

      <div className="take-assessment-body">
        {questionsList.length > 0 && (
          <p className="take-assessment-meta">
            {questionsList.length} question
            {questionsList.length === 1 ? '' : 's'}
            {courseId ? ` · Course ${courseId}` : ''}
          </p>
        )}
      </div>
    </div>
  )
}

export default TakeAssessmentPage
