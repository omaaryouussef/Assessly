import React, { useState } from 'react'
import { setResolvedApiBase } from '../../config/api'

function DesktopSetupScreen({ onComplete }) {
  const [apiUrl, setApiUrl] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleUseLocal = async () => {
    setSaving(true)
    setError('')

    try {
      const localUrl = await window.assesslyDesktop.getDefaultLocalApiUrl()
      setApiUrl(localUrl)
    } catch (setupError) {
      setError(setupError.message || 'Failed to load local server URL')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const savedUrl = await window.assesslyDesktop.setApiBaseUrl(apiUrl)
      setResolvedApiBase(savedUrl)
      onComplete(savedUrl)
    } catch (saveError) {
      setError(saveError.message || 'Failed to save API URL')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="desktop-setup">
      <div className="desktop-setup__card">
        <h1>Connect Assessly</h1>
        <p>
          Enter your institution&apos;s Assessly server URL, or use local mode for
          development.
        </p>

        <form onSubmit={handleSave}>
          <label htmlFor="api-url">Server URL</label>
          <input
            id="api-url"
            type="url"
            value={apiUrl}
            onChange={(event) => setApiUrl(event.target.value)}
            placeholder="https://assessly.university.edu"
            required
          />

          <div className="desktop-setup__actions">
            <button type="button" onClick={handleUseLocal} disabled={saving}>
              Use local server
            </button>
            <button type="submit" disabled={saving || !apiUrl.trim()}>
              {saving ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </form>

        {error ? <p className="desktop-setup__error">{error}</p> : null}
      </div>
    </div>
  )
}

export default DesktopSetupScreen
