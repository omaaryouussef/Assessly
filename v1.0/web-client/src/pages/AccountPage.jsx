import React from 'react'
import DesktopApiSettings from '../components/desktop/DesktopApiSettings'
import { useAuth } from '../components/auth/AuthWrapper.jsx'
import { isDesktopApp } from '../config/api'
import LoadingPage from '../components/LoadingPage'

function AccountPage() {
  const { user } = useAuth()
  const department = user?.department || 'CSCE'
  const isDesktop = isDesktopApp()
  if (!user) {
    return <LoadingPage message="Loading account…" />
  }
  return (
    <div className="account-page">
      <section className="account-profile-card">
        <div className="account-profile-card-header">
          <h2>Your profile</h2>
          <p>Manage your personal and institution details.</p>
        </div>
        <dl className="account-info-grid">
          <div className="account-info-item">
            <dt>Name</dt>
            <dd>{user?.name || '-'}</dd>
          </div>
          <div className="account-info-item">
            <dt>Email</dt>
            <dd>{user?.email || '-'}</dd>
          </div>
          <div className="account-info-item">
            <dt>Role</dt>
            <dd>{user?.role || '-'}</dd>
          </div>
          <div className="account-info-item">
            <dt>Department</dt>
            <dd>{department}</dd>
          </div>
          <div className="account-info-item">
            <dt>AUC ID</dt>
            <dd>{user?.auc_id || '-'}</dd>
          </div>
        </dl>
      </section>

      {isDesktop && (
        <div className="account-desktop-settings">
          <div className="account-desktop-settings-header">
            <h3>Desktop configuration</h3>
            <p>Change server connection for the Assessly desktop app.</p>
          </div>
          <div className="account-desktop-settings-body">
            <DesktopApiSettings />
          </div>
        </div>
      )}
    </div>
  )
}

export default AccountPage
