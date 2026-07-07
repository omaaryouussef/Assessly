import React from 'react'
import { useBlocker } from 'react-router-dom'
import { useExamLockdown } from '../../contexts/ExamLockdownContext'

function ExamNavigationBlocker() {
  const { examModeActive } = useExamLockdown()

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      examModeActive && currentLocation.pathname !== nextLocation.pathname
  )

  if (blocker.state !== 'blocked') {
    return null
  }

  return (
    <div className="success-modal-backdrop">
      <div className="success-modal exam-navigation-blocker-modal">
        <h3>Assessment in progress</h3>
        <p>
          You cannot leave this assessment until you submit your answers.
        </p>
        <button
          type="button"
          className="success-modal-btn"
          onClick={() => blocker.reset()}
        >
          Return to assessment
        </button>
      </div>
    </div>
  )
}

export default ExamNavigationBlocker
