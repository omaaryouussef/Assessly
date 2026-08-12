import React from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBuildingColumns,
  faDownload,
} from '@fortawesome/free-solid-svg-icons'
import { faApple, faWindows } from '@fortawesome/free-brands-svg-icons'
import {
  detectDesktopPlatform,
  getDesktopDownloads,
} from '../config/downloads.js'

function DownloadStudentAppPage() {
  const { win, mac, macAvailable, releasesPage } = getDesktopDownloads()
  const platform = detectDesktopPlatform()

  return (
    <div className="landing-page download-page">
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link to="/landing" className="landing-brand download-brand">
            <div className="landing-brand-logo">
              <FontAwesomeIcon icon={faBuildingColumns} />
            </div>
            <div>
              <span className="landing-brand-name">Assessly</span>
              <span className="landing-brand-tagline">
                Academic Assessment Platform
              </span>
            </div>
          </Link>
        </div>
      </header>

      <main className="landing-main download-main">
        <section className="download-card">
          <div className="download-card-icon" aria-hidden="true">
            <FontAwesomeIcon icon={faDownload} />
          </div>

          <h1>Download the Assessly desktop app</h1>
          <p className="download-card-lead">
            Proctored exams and lockdown assessments must be taken in the
            desktop app. Install it on the computer you will use for the exam.
          </p>

          <div className="download-actions">
            <a
              href={win}
              className={`download-btn download-btn--win${
                platform === 'win' ? ' download-btn--recommended' : ''
              }`}
              download
            >
              <FontAwesomeIcon icon={faWindows} />
                <span>
                  <strong>Download for Windows</strong>
                  <small>Installer for Windows 10/11</small>
                </span>
            </a>

            {macAvailable ? (
              <a
                href={mac}
                className={`download-btn download-btn--mac${
                  platform === 'mac' ? ' download-btn--recommended' : ''
                }`}
                download
              >
                <FontAwesomeIcon icon={faApple} />
                <span>
                  <strong>Download for macOS</strong>
                  <small>Disk image for macOS</small>
                </span>
              </a>
            ) : (
              <div
                className="download-btn download-btn--mac download-btn--unavailable"
                aria-disabled="true"
              >
                <FontAwesomeIcon icon={faApple} />
                <span>
                  <strong>macOS — coming soon</strong>
                  <small>Not available for download yet</small>
                </span>
              </div>
            )}
          </div>

          <div className="download-notes">
            {platform === 'unknown' ? (
              <p>Choose the installer that matches your operating system.</p>
            ) : (
              <p>
                We highlighted the installer for your current device. You can still
                use the other option if you need a different platform.
              </p>
            )}
            <p>
              After installing, open Assessly and sign in with your student
              account. On first launch, enter your institution&apos;s Assessly server
              URL if prompted.
            </p>
            {!macAvailable ? (
              <p className="download-note-muted">
                The macOS installer is not published yet. Windows is available
                now; check GitHub releases for macOS when it is added.
              </p>
            ) : null}
            <p>
              <a
                className="download-github-link"
                href={releasesPage}
                target="_blank"
                rel="noreferrer"
              >
                View all releases on GitHub
              </a>
            </p>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <p className="landing-footer-copy">
            Academic assessment platform with optional desktop proctoring
          </p>
        </div>
      </footer>
    </div>
  )
}

export default DownloadStudentAppPage
