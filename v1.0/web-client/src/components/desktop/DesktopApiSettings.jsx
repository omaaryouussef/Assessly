import React, { useEffect, useState } from 'react'
import { getApiBase, isDesktopApp, setResolvedApiBase } from '../../config/api'

function DesktopApiSettings() {
  const [apiUrl, setApiUrl] = useState(getApiBase())
  const [platform, setPlatform] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isDesktopApp()) {
      return
    }

    async function loadDesktopSettings() {
      const [savedUrl, desktopPlatform] = await Promise.all([
        window.assesslyDesktop.getApiBaseUrl(),
        window.assesslyDesktop.getPlatform(),
      ])

      if (savedUrl) {
        setApiUrl(savedUrl)
      }

      setPlatform(desktopPlatform)
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
            Use local server
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
