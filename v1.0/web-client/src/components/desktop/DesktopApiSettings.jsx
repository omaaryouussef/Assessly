import React, { useEffect, useState } from 'react'
import { getApiBase, isDesktopApp, setResolvedApiBase } from '../../config/api'

function DesktopApiSettings() {
  const [apiUrl, setApiUrl] = useState(getApiBase())
  const [platform, setPlatform] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [localStatus, setLocalStatus] = useState(null)
  const [localBusy, setLocalBusy] = useState(false)

  useEffect(() => {
    if (!isDesktopApp()) {
      return
    }

    async function loadDesktopSettings() {
      const [savedUrl, desktopPlatform, status] = await Promise.all([
        window.assesslyDesktop.getApiBaseUrl(),
        window.assesslyDesktop.getPlatform(),
        window.assesslyDesktop.getLocalServerStatus(),
      ])

      if (savedUrl) {
        setApiUrl(savedUrl)
      }

      setPlatform(desktopPlatform)
      setLocalStatus(status)
    }

    loadDesktopSettings()
  }, [])

  if (!isDesktopApp()) {
    return null
  }

  const handleUseLocal = async () => {
    const localUrl = await window.assesslyDesktop.getDefaultLocalApiUrl()
    setApiUrl(localUrl)
  }

  const handleStartLocalServer = async () => {
    setLocalBusy(true)
    setError('')
    setMessage('')

    try {
      const status = await window.assesslyDesktop.startLocalServer()
      setLocalStatus(status)
      const localUrl = status.url
      setApiUrl(localUrl)
      const savedUrl = await window.assesslyDesktop.setApiBaseUrl(localUrl)
      setResolvedApiBase(savedUrl)
      setMessage(
        'Local server started. Students on the same network can use your machine IP with port 3011.'
      )
    } catch (startError) {
      setError(startError.message || 'Failed to start local server')
    } finally {
      setLocalBusy(false)
    }
  }

  const handleStopLocalServer = async () => {
    setLocalBusy(true)
    setError('')
    setMessage('')

    try {
      const status = await window.assesslyDesktop.stopLocalServer()
      setLocalStatus(status)
      setMessage('Local server stopped.')
    } catch (stopError) {
      setError(stopError.message || 'Failed to stop local server')
    } finally {
      setLocalBusy(false)
    }
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const savedUrl = await window.assesslyDesktop.setApiBaseUrl(apiUrl)
      setResolvedApiBase(savedUrl)
      setMessage('Server URL saved. New requests will use this address.')
    } catch (saveError) {
      setError(saveError.message || 'Failed to save server URL')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="desktop-settings">
      <h3>Desktop connection</h3>
      <p>Platform: {platform || 'unknown'}</p>

      <div className="desktop-settings__local">
        <h4>Local mode (small schools)</h4>
        <p>
          Start a bundled PostgreSQL database and Assessly API on this machine.
          Coding assessments still require a remote Piston service.
        </p>
        <p>
          Status:{' '}
          {localStatus?.running
            ? `running at ${localStatus.url}`
            : 'stopped'}
        </p>
        <div className="desktop-settings__actions">
          <button
            type="button"
            onClick={handleStartLocalServer}
            disabled={localBusy || localStatus?.running}
          >
            {localBusy ? 'Working...' : 'Start local server'}
          </button>
          <button
            type="button"
            onClick={handleStopLocalServer}
            disabled={localBusy || !localStatus?.running}
          >
            Stop local server
          </button>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <label htmlFor="desktop-api-url">Server URL</label>
        <input
          id="desktop-api-url"
          type="url"
          value={apiUrl}
          onChange={(event) => setApiUrl(event.target.value)}
          required
        />

        <div className="desktop-settings__actions">
          <button type="button" onClick={handleUseLocal} disabled={saving}>
            Use local server URL
          </button>
          <button type="submit" disabled={saving || !apiUrl.trim()}>
            {saving ? 'Saving...' : 'Save server URL'}
          </button>
        </div>
      </form>

      {message ? <p className="desktop-settings__message">{message}</p> : null}
      {error ? <p className="desktop-settings__error">{error}</p> : null}
    </section>
  )
}

export default DesktopApiSettings
