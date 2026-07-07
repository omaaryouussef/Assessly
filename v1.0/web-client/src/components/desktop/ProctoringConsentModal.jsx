import React from 'react'

function ProctoringConsentModal({ onAccept, onCancel, securitySettings }) {
  return (
    <div className="success-modal-backdrop">
      <div className="success-modal proctoring-consent-modal">
        <h3>Proctoring disclosure</h3>
        <p>
          This assessment uses desktop proctoring. By continuing, you agree that
          Assessly may restrict app switching, clipboard access, screenshots, and
          network usage according to your instructor&apos;s settings.
        </p>
        <ul className="proctoring-consent-list">
          <li>
            Window switching:{' '}
            {securitySettings.windowSwitching ? 'allowed' : 'blocked'}
          </li>
          <li>
            Clipboard:{' '}
            {securitySettings.clipboardAccess ? 'allowed' : 'blocked'}
          </li>
          <li>
            Screenshots:{' '}
            {securitySettings.screenSnapshot ? 'allowed' : 'blocked'}
          </li>
          <li>
            Network restriction:{' '}
            {securitySettings.networkRestriction ? 'enabled' : 'disabled'}
          </li>
          <li>
            Process monitoring:{' '}
            {securitySettings.processMonitoring ? 'enabled' : 'disabled'}
          </li>
        </ul>
        <div className="proctoring-consent-actions">
          <button
            type="button"
            className="assessment-questions-button assessment-questions-button--secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="assessment-questions-button assessment-questions-button--primary"
            onClick={onAccept}
          >
            I understand — start assessment
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProctoringConsentModal
