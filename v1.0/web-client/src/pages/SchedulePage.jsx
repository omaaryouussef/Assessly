import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getApiBase } from '../config/api'
import { useAuth } from '../components/auth/AuthWrapper.jsx'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'

function formatDateKey(date) {
  return date.toISOString().split('T')[0]
}

function ScheduleDayModalSection({ label, items, type }) {
  if (!items?.length) {
    return null
  }

  return (
    <section className="schedule-day-modal-section">
      <h4 className="schedule-day-modal-section-title">{label}</h4>
      <ul className="schedule-day-modal-list">
        {items.map((item, index) => (
          <Link
            to={`/course/${item.courseId}/${label.toLowerCase()}`}
            key={`${type}-${item.title}-${item.courseTitle}-${index}`}
            className="schedule-day-modal-link"
          >
            <li className={`schedule-day-modal-item schedule-day-modal-item--${type}`}>
              <span className="schedule-day-modal-item-title">{item.title}</span>
              <span className="schedule-day-modal-item-course">{item.courseTitle}</span>
            </li>
          </Link>
        ))}
      </ul>
    </section>
  )
}

function SchedulePage() {
  const [exams, setExams] = useState({})
  const [quizzes, setQuizzes] = useState({})
  const [assignments, setAssignments] = useState({})
  const [dateRange, setDateRange] = useState(null)
  const currentYear = new Date().getFullYear()
  const { token } = useAuth()
  const maxAllowedDate = new Date(currentYear, 11, 31)
  const minAllowedDate = new Date(currentYear - 1, 0, 1)
  const [showDayModal, setShowDayModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)

  useEffect(() => {
    const fetchAssessments = async () => {
      const headers = { Authorization: `Bearer ${token}` }

      try {
        const [examsRes, quizzesRes, assignmentsRes] = await Promise.all([
          fetch(`${getApiBase()}/api/assessments/user/exams/`, { headers }),
          fetch(`${getApiBase()}/api/assessments/user/quizzes/`, { headers }),
          fetch(`${getApiBase()}/api/assessments/user/assignments/`, { headers }),
        ])

        if (!examsRes.ok) throw new Error('Failed to fetch exams')
        if (!quizzesRes.ok) throw new Error('Failed to fetch quizzes')
        if (!assignmentsRes.ok) throw new Error('Failed to fetch assignments')

        const [examsData, quizzesData, assignmentsData] = await Promise.all([
          examsRes.json(),
          quizzesRes.json(),
          assignmentsRes.json(),
        ])

        setExams(examsData)
        setQuizzes(quizzesData)
        setAssignments(assignmentsData)
      } catch (error) {
        console.error('Error fetching assessment schedule data:', error)
      }
    }

    fetchAssessments()
  }, [token])

  const handleDayClick = (date) => {
    setSelectedDate(date)
    setShowDayModal(true)
  }

  const selectedDateKey = selectedDate ? formatDateKey(selectedDate) : null
  const dayExams = selectedDateKey ? (exams[selectedDateKey] ?? []) : []
  const dayQuizzes = selectedDateKey ? (quizzes[selectedDateKey] ?? []) : []
  const dayAssignments = selectedDateKey
    ? (assignments[selectedDateKey] ?? [])
    : []
  const hasAssessments =
    dayExams.length > 0 ||
    dayQuizzes.length > 0 ||
    dayAssignments.length > 0

  return (
    <div className="schedule-page">
      <section className="schedule-calendar-card">
        <div className="schedule-calendar-card-header">
          <h2>Schedule</h2>
          <p>View and select dates for your assessments and deadlines.</p>
        </div>
        <div className="schedule-calendar-body">
          <Calendar
            className="schedule-calendar"
            calendarType="gregory"
            defaultValue={dateRange}
            onChange={setDateRange}
            allowPartialRange={true}
            maxDate={maxAllowedDate}
            minDate={minAllowedDate}
            prev2Label={null}
            next2Label={null}
            minDetail="month"
            maxDetail="month"
            tileContent={({ date }) => {
              const key = formatDateKey(date)

              return (
                <>
                  {exams[key] && (
                    <div className="exam-dot">
                      {exams[key].length === 1
                        ? '1 exam'
                        : `${exams[key].length} exams`}
                    </div>
                  )}
                  {quizzes[key] && (
                    <div className="quiz-dot">
                      {quizzes[key].length === 1
                        ? '1 quiz'
                        : `${quizzes[key].length} quizzes`}
                    </div>
                  )}
                  {assignments[key] && (
                    <div className="assignment-dot">
                      {assignments[key].length === 1
                        ? '1 assignment'
                        : `${assignments[key].length} assignments`}
                    </div>
                  )}
                </>
              )
            }}
            onClickDay={handleDayClick}
          />
        </div>
      </section>

      {showDayModal && selectedDate && (
        <div
          className="schedule-day-modal-backdrop"
          onClick={() => setShowDayModal(false)}
        >
          <div
            className="schedule-day-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Assessments for {selectedDate.toLocaleDateString()}</h3>

            <div className="schedule-day-modal-content">
              {!hasAssessments ? (
                <p className="schedule-day-modal-empty">
                  No assessments scheduled for this day.
                </p>
              ) : (
                <>
                  <ScheduleDayModalSection
                    label="Exams"
                    items={dayExams}
                    type="exam"
                  />
                  <ScheduleDayModalSection
                    label="Quizzes"
                    items={dayQuizzes}
                    type="quiz"
                  />
                  <ScheduleDayModalSection
                    label="Assignments"
                    items={dayAssignments}
                    type="assignment"
                  />
                </>
              )}
            </div>

            <button
              type="button"
              className="schedule-day-modal-btn"
              onClick={() => setShowDayModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default SchedulePage
