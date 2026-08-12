import React from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBuildingColumns } from '@fortawesome/free-solid-svg-icons'
import { faApple, faWindows } from '@fortawesome/free-brands-svg-icons'
import {
  detectDesktopPlatform,
  getDesktopDownloads,
} from '../config/downloads.js'

function DownloadStudentAppPage() {
  const { win, mac, releasesPage } = getDesktopDownloads()
  const platform = detectDesktopPlatform()

  return (
    <div className="landing-page download-page">
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link to="/landing" className="landing-brand">
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

      <main className="landing-main">
        <section className="download-hero">
          <h1>Download the Assessly desktop app</h1>
          <p className="download-hero-lead">
            Proctored exams and lockdown assessments must be taken in the
            desktop app. Install it on the computer you will use for the exam.
          </p>

          <div className="download-actions">
            <a
              href={win}
              className={`landing-btn landing-btn--primary landing-btn--large download-btn${
                platform === 'win' ? ' download-btn--recommended' : ''
              }`}
              download
            >
              <FontAwesomeIcon icon={faWindows} />
              Download for Windows
            </a>

            <a
              href={mac}
              className={`landing-btn landing-btn--secondary landing-btn--large download-btn${
                platform === 'mac' ? ' download-btn--recommended' : ''
              }`}
              download
            >
              <FontAwesomeIcon icon={faApple} />
              Download for macOS
            </a>
          </div>

          {platform === 'unknown' ? (
            <p className="download-note">
              Choose the installer that matches your operating system.
            </p>
          ) : (
            <p className="download-note">
              We highlighted the installer for your current device. You can still
              use the other link if you need a different platform.
            </p>
          )}

          <p className="download-note">
            After installing, open Assessly and sign in with your student
            account.
          </p>

          <p className="download-note">
            <a href={releasesPage} target="_blank" rel="noreferrer">
              View all releases on GitHub
            </a>
          </p>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <p>Academic assessment platform with optional desktop proctoring</p>
        </div>
      </footer>
    </div>
  )
}

export default DownloadStudentAppPage
