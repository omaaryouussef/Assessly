import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../components/auth/AuthWrapper'
import { getApiBase } from '../../config/api'
import LoadingPage from '../../components/LoadingPage'

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

function inviteStatus(invite) {
  if (invite.accepted_at) return 'Accepted'
  if (new Date(invite.expires_at) < new Date()) return 'Expired'
  return 'Pending'
}

function AdminInvitesPage() {
  const { token } = useAuth()
  const [email, setEmail] = useState('')
  const [invites, setInvites] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const authHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
    [token]
  )

  const loadInvites = useCallback(async () => {
    try {
      const response = await fetch(`${getApiBase()}/api/admin/invites`, {
        headers: authHeaders(),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load invites')
      }
      setInvites(data.invites || [])
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load invites')
    } finally {
      setLoading(false)
    }
  }, [authHeaders])

  useEffect(() => {
    loadInvites()
  }, [loadInvites])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    if (!email.trim()) {
      setErrorMessage('Email is required.')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`${getApiBase()}/api/admin/invites`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invite')
      }
      setEmail('')
      setSuccessMessage(`Invite sent to ${data.invite.email}`)
      await loadInvites()
    } catch (error) {
      setErrorMessage(error.message || 'Failed to send invite')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevoke = async (inviteId) => {
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const response = await fetch(
        `${getApiBase()}/api/admin/invites/${inviteId}`,
        {
          method: 'DELETE',
          headers: authHeaders(),
        }
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel invite')
      }
      setSuccessMessage('Invite cancelled')
      await loadInvites()
    } catch (error) {
      setErrorMessage(error.message || 'Failed to cancel invite')
    }
  }

  if (loading) {
    return <LoadingPage message="Loading invites…" />
  }

  return (
    <div className="admin-invites-page">
      <section className="admin-invites-card">
        <div className="admin-invites-header">
          <h2>Instructor invites</h2>
          <p>Send a one-time email link so staff can join as instructors.</p>
        </div>

        <form className="admin-invites-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="invite-email">Instructor email</label>
            <input
              type="email"
              id="invite-email"
              placeholder="instructor@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send invite'}
          </button>
        </form>

        {errorMessage ? (
          <p className="error-message">{errorMessage}</p>
        ) : null}
        {successMessage ? (
          <p className="admin-invites-success">{successMessage}</p>
        ) : null}
      </section>

      <section className="admin-invites-card">
        <div className="admin-invites-header">
          <h2>Recent invites</h2>
        </div>
        {invites.length === 0 ? (
          <p className="admin-invites-empty">No invites yet.</p>
        ) : (
          <div className="admin-invites-table-wrap">
            <table className="admin-invites-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Expires</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => {
                  const status = inviteStatus(invite)
                  return (
                    <tr key={invite.invite_id}>
                      <td>{invite.email}</td>
                      <td>{status}</td>
                      <td>{formatDate(invite.expires_at)}</td>
                      <td>{formatDate(invite.created_at)}</td>
                      <td>
                        {status === 'Pending' ? (
                          <button
                            type="button"
                            className="admin-invites-revoke"
                            onClick={() => handleRevoke(invite.invite_id)}
                          >
                            Revoke
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default AdminInvitesPage
