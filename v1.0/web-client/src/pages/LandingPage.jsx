import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBuildingColumns,
  faChalkboardUser,
  faClipboardCheck,
  faCode,
  faCommentDots,
  faDesktop,
  faDownload,
  faGraduationCap,
  faListCheck,
  faRightToBracket,
  faShieldHalved,
  faUserPlus,
} from '@fortawesome/free-solid-svg-icons'

const FEATURES = [
  {
    icon: faChalkboardUser,
    title: 'Course management',
    description:
      'Create courses, share enrollment keys, and manage your class roster.',
  },
  {
    icon: faClipboardCheck,
    title: 'Assessments & grading',
    description:
      'Build exams, quizzes, and assignments, then review and grade submissions.',
  },
  {
    icon: faShieldHalved,
    title: 'AI tool control',
    description:
      'Define what students can access during an assessment, including online tools.',
  },
  {
    icon: faDesktop,
    title: 'Lockdown proctoring',
    description:
      'Run secure exams in the Assessly desktop app with configurable restrictions.',
  },
  {
    icon: faCode,
    title: 'Coding assessments',
    description:
      'Use the embedded editor and compiler for programming questions in the platform.',
  },
  {
    icon: faCommentDots,
    title: 'Instructor feedback',
    description:
      'Leave feedback on student work and review proctoring events from one place.',
  },
]

function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="landing-brand">
            <div className="landing-brand-logo">
              <FontAwesomeIcon icon={faBuildingColumns} />
            </div>
            <div>
              <span className="landing-brand-name">Assessly</span>
              <span className="landing-brand-tagline">
                Academic Assessment Platform
              </span>
            </div>
          </div>
          <nav className="landing-nav" aria-label="Account actions">
            <button
              type="button"
              className="landing-btn landing-btn--ghost"
              onClick={() => navigate('/login')}
            >
              <FontAwesomeIcon icon={faRightToBracket} />
              Login
            </button>
            <button
              type="button"
              className="landing-btn landing-btn--primary"
              onClick={() => navigate('/register')}
            >
              <FontAwesomeIcon icon={faUserPlus} />
              Register
            </button>
          </nav>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-hero-badge">
            <FontAwesomeIcon icon={faGraduationCap} />
            Built for instructors and institutions
          </div>
          <h1>Welcome to Assessly</h1>
          <p className="landing-hero-lead">
            Create and grade assessments for your students while controlling
            their access to AI tools and enforcing exam security when you need
            it.
          </p>
          <div className="landing-hero-actions">
            <button
              type="button"
              className="landing-btn landing-btn--primary landing-btn--large"
              onClick={() => navigate('/register')}
            >
              Get started
            </button>
            <button
              type="button"
              className="landing-btn landing-btn--secondary landing-btn--large"
              onClick={() => navigate('/login')}
            >
              Sign in
            </button>
          </div>
        </section>

        <section className="landing-card landing-motivation">
          <div className="landing-card-header">
            <FontAwesomeIcon
              icon={faShieldHalved}
              className="landing-card-header-icon"
            />
            <div>
              <h2>Why Assessly exists</h2>
              <p>
                A response to AI-assisted academic dishonesty in assessments
              </p>
            </div>
          </div>
          <div className="landing-card-body">
            <p>
              With the rapid rise of AI tools, students are increasingly relying
              on them to complete educational assessments. As a result,
              identifying AI-generated content—particularly programming code—has
              become a time-consuming and inefficient task for instructors,
              often leading to students receiving credit for work that is not
              their own. Furthermore, evaluating students primarily on the final
              artifacts they produce has become an unreliable measure of their
              true understanding and abilities. Assessly lets instructors create
              assessments and control the tools students may use while in
              assessment mode.
            </p>
          </div>
        </section>

        <section className="landing-features">
          <div className="landing-section-heading">
            <h2>Platform features</h2>
            <p>
              Everything you need to run courses, deliver assessments, and
              protect exam integrity.
            </p>
          </div>
          <ul className="landing-features-grid">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="landing-feature-card">
                <span className="landing-feature-icon" aria-hidden="true">
                  <FontAwesomeIcon icon={feature.icon} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="landing-card landing-usage">
          <div className="landing-card-header">
            <FontAwesomeIcon
              icon={faListCheck}
              className="landing-card-header-icon"
            />
            <div>
              <h2>For instructors</h2>
              <p>How to use Assessly and what security controls you have</p>
            </div>
          </div>

          <div className="landing-card-body">
            <p className="landing-usage-intro">
              Assessly is designed around a simple course workflow. You create a
              course, enroll students, publish assessments with the security
              rules you choose, then review submissions and any proctoring
              events from the same platform.
            </p>

            <div className="usage-block">
              <h3>How to use the platform</h3>
              <ol className="usage-steps">
                <li>
                  <strong>Create an instructor account</strong> and sign in to
                  access your dashboard.
                </li>
                <li>
                  <strong>Create a course</strong> from your courses page. Set
                  the title, student limit, and whether enrollment is open.
                  Share the generated enrollment key with students so they can
                  join.
                </li>
                <li>
                  <strong>Manage your class</strong> from the course People
                  page. View enrolled students and remove members when needed.
                </li>
                <li>
                  <strong>Build an assessment</strong> in Assessment Studio.
                  Choose a due date, add questions (including coding items with
                  the built-in editor), and configure security settings for that
                  assessment.
                </li>
                <li>
                  <strong>Publish the assessment</strong> so students can open
                  it from the course assignments, exams, or quizzes view.
                </li>
                <li>
                  <strong>Review student work</strong> after submission. Grade
                  responses, leave feedback, and inspect any desktop proctoring
                  violations recorded during the attempt.
                </li>
              </ol>
            </div>

            <div className="usage-block">
              <h3>Security constraints you control</h3>
              <p>
                For each assessment, security options are configured in
                Assessment Studio under <strong>Security settings</strong>. When
                an option is left unchecked, Assessly enforces that restriction
                in the <strong>desktop app</strong> while the student is taking
                the exam. If any lockdown rule is active, students cannot
                complete the assessment in a regular browser.
              </p>

              <div className="usage-table-wrap">
                <table className="usage-security-table">
                  <thead>
                    <tr>
                      <th scope="col">Setting</th>
                      <th scope="col">When disabled (unchecked)</th>
                      <th scope="col">What students experience</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Allow window switching</td>
                      <td>Window switching is blocked</td>
                      <td>
                        Fullscreen kiosk mode, blocked Alt+Tab / Cmd+Tab
                        shortcuts, and automatic focus return if they leave the
                        exam window.
                      </td>
                    </tr>
                    <tr>
                      <td>Allow clipboard access</td>
                      <td>Clipboard is blocked</td>
                      <td>
                        Copy and paste are disabled in the assessment interface,
                        including inside the code editor.
                      </td>
                    </tr>
                    <tr>
                      <td>Allow screen snapshots</td>
                      <td>Screenshots are blocked</td>
                      <td>
                        Screen capture protection is enabled to reduce
                        screenshots and screen recording of exam content.
                      </td>
                    </tr>
                    <tr>
                      <td>Restrict network to Assessly API</td>
                      <td>Network restriction is enabled</td>
                      <td>
                        The desktop app only allows traffic to the Assessly
                        server. Other websites and online tools are blocked
                        during the exam.
                      </td>
                    </tr>
                    <tr>
                      <td>Monitor forbidden applications</td>
                      <td>Process monitoring is enabled</td>
                      <td>
                        Running apps such as browsers, chat tools, and AI
                        assistants are detected. Students must close them before
                        starting, and violations are logged if they appear
                        during the attempt.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p>
                Before an exam begins, students see a proctoring disclosure that
                lists the exact rules you enabled. During the attempt,
                violations such as focus escape attempts or forbidden processes
                are sent to the server and appear on the instructor feedback
                page for review.
              </p>
            </div>
          </div>
        </section>

        <section className="landing-cta-grid">
          <article className="landing-cta-card landing-cta-card--primary">
            <div className="landing-cta-card-icon" aria-hidden="true">
              <FontAwesomeIcon icon={faDownload} />
            </div>
            <h2>Download the desktop app</h2>
            <p>
              Students must install the Assessly desktop app to take proctored
              assessments on their computers.
            </p>
            <button
              type="button"
              className="landing-btn landing-btn--light"
              onClick={() => navigate('/download-student-app')}
            >
              Download for students
            </button>
          </article>

          <article className="landing-cta-card">
            <div className="landing-cta-card-icon" aria-hidden="true">
              <FontAwesomeIcon icon={faUserPlus} />
            </div>
            <h2>Join Assessly</h2>
            <p>
              Create an account to start building courses and delivering secure
              assessments for your students.
            </p>
            <div className="landing-cta-actions">
              <button
                type="button"
                className="landing-btn landing-btn--primary"
                onClick={() => navigate('/register')}
              >
                Register
              </button>
              <button
                type="button"
                className="landing-btn landing-btn--secondary"
                onClick={() => navigate('/login')}
              >
                Login
              </button>
            </div>
          </article>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <span className="landing-footer-brand">Assessly</span>
          <span className="landing-footer-copy">
            Academic assessment platform with optional desktop proctoring
          </span>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
