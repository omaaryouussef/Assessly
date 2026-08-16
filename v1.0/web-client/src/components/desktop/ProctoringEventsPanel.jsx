import React, { useEffect, useState } from 'react'
import { getApiBase } from '../../config/api'
import { useAuth } from '../auth/AuthWrapper'
import LoadingPage from '../LoadingPage'

function formatEventLabel(eventType) {
  return String(eventType || '')
    .toLowerCase()
    .replaceAll('_', ' ')
}

function formatTimestamp(value) {
  if (!value) return ''
  return new Date(value).toLocaleString()
}

function ProctoringEventsPanel({ assessmentId, studentId }) {
  const { token } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!assessmentId || !studentId || !token) {
      return
    }

    let cancelled = false

    async function loadEvents() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(
          `${getApiBase()}/api/assessments/${assessmentId}/proctoring-events?studentId=${studentId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load proctoring events')
        }

        if (!cancelled) {
          setEvents(data.events || [])
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'Failed to load proctoring events')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadEvents()
    return () => {
      cancelled = true
    }
  }, [assessmentId, studentId, token])

  if (loading) {
    return (
      <LoadingPage variant="inline" message="Loading proctoring log…" />
    )
  }

  if (error) {
    return <p className="take-assessment-error">{error}</p>
  }

  if (events.length === 0) {
    return (
      <p className="proctoring-events-empty">
        No proctoring violations were recorded for this attempt.
      </p>
    )
  }

  return (
    <section className="proctoring-events-panel">
      <h4>Proctoring log</h4>
      <ul className="proctoring-events-list">
        {events.map((event) => (
          <li key={event.id} className="proctoring-event-item">
            <div className="proctoring-event-header">
              <strong>{formatEventLabel(event.event_type)}</strong>
              <span className={`proctoring-event-severity proctoring-event-severity--${event.severity}`}>
                {event.severity}
              </span>
            </div>
            <span className="proctoring-event-time">
              {formatTimestamp(event.created_at)}
            </span>
            {event.metadata && (
              <pre className="proctoring-event-metadata">
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default ProctoringEventsPanel
