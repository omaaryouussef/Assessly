import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCircleQuestion,
  faUser,
} from '@fortawesome/free-solid-svg-icons'

const DEVELOPER_NAME = 'Omar Mohamed'
const DEVELOPER_EMAIL = 'omaarmohaamed@aucegypt.edu'

function HelpPage() {
  return (
    <div className="help-page">
      <section className="help-page-card">
        <div className="help-page-card-header">
          <FontAwesomeIcon
            icon={faCircleQuestion}
            className="help-page-card-icon"
          />
          <div>
            <h2>Help &amp; Support</h2>
            <p>
              Need assistance with Assessly? Contact the developer directly for
              technical support, bug reports, or feature questions.
            </p>
          </div>
        </div>

        <div className="help-page-body">
          <p className="help-page-message">
            If you run into an issue or have a question about the platform,
            please reach out and include as much detail as possible about what
            you were doing when the problem occurred.
          </p>

          <div className="help-page-contact-item">
            <span className="help-page-contact-label">
              <FontAwesomeIcon icon={faUser} />
              Developer
            </span>
            <p className="help-page-contact-value">{DEVELOPER_NAME}</p>
            <a
              href={`mailto:${DEVELOPER_EMAIL}`}
              className="help-page-contact-link"
            >
              {DEVELOPER_EMAIL}
            </a>
          </div>

          <a href={`mailto:${DEVELOPER_EMAIL}`} className="help-page-email-btn">
            Contact developer
          </a>
        </div>
      </section>
    </div>
  )
}

export default HelpPage
