import React from 'react'

function LockdownViolationModal({ violation, onDismiss }) {
  if (!violation) {
    return null
  }

  return (
    <div className="success-modal-backdrop">
      <div className="success-modal lockdown-violation-modal">
        <h3>Proctoring violation recorded</h3>
        <p>
          You attempted to leave the assessment. This has been recorded. Return
          to your exam.
        </p>
        {violation.metadata?.shortcut && (
          <p className="lockdown-violation-detail">
            Blocked shortcut: {violation.metadata.shortcut}
          </p>
        )}
        {violation.metadata?.processes?.length > 0 && (
          <p className="lockdown-violation-detail">
            Forbidden apps detected: {violation.metadata.processes.join(', ')}
          </p>
        )}
        <button
          type="button"
          className="success-modal-btn"
          onClick={onDismiss}
        >
          Return to assessment
        </button>
      </div>
    </div>
  )
}

export default LockdownViolationModal
