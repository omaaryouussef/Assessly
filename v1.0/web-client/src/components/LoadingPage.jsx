import React from 'react'
import { ClimbingBoxLoader } from 'react-spinners'

function LoadingPage({
  message = 'Loading Assessly…',
  variant = 'page',
}) {
  const isInline = variant === 'inline'

  return (
    <div
      className={isInline ? 'loading-page loading-page--inline' : 'loading-page'}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="loading-page__panel">
        <ClimbingBoxLoader
          color="#002137"
          loading
          size={isInline ? 10 : 14}
          speedMultiplier={0.9}
        />
        {message ? <p className="loading-page__message">{message}</p> : null}
      </div>
    </div>
  )
}

export default LoadingPage
