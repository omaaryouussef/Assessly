import React, { useState } from 'react'
import { setResolvedApiBase } from '../../config/api'

function DesktopSetupScreen({ onComplete }) {
  const [apiUrl, setApiUrl] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    const trimmed = apiUrl.trim().replace(/\/$/, '')

    try {
      const probe = await fetch(`${trimmed}/`, { method: 'GET' })
      if (!probe.ok) {
        throw new Error(
          `Server responded with ${probe.status}. Check the API URL (Railway backend, not the Vercel website).`,
        )
      }

      const savedUrl = await window.assesslyDesktop.setApiBaseUrl(trimmed)
      setResolvedApiBase(savedUrl)
      onComplete(savedUrl)
    } catch (saveError) {
      setError(
        saveError.message ||
          'Could not reach the server. Use your Railway API URL (e.g. https://your-app.up.railway.app), not the Vercel site URL.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="desktop-setup">
      <div className="desktop-setup__card">
        <h1>Developer: connect to API</h1>
        <p>
          Local desktop dev only. Production installers use a baked-in server URL
          so students only install and sign in.
        </p>

        <form onSubmit={handleSave}>
          <label htmlFor="api-url">Server URL</label>
          <input
            id="api-url"
            type="url"
            value={apiUrl}
            onChange={(event) => setApiUrl(event.target.value)}
            placeholder="https://api.yourdomain.com"
            required
          />

          <div className="desktop-setup__actions">
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
