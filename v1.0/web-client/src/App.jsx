import Header from './components/Header'
import Footer from './components/Footer'
import ExamNavigationBlocker from './components/exam/ExamNavigationBlocker'
import { useExamLockdown } from './contexts/ExamLockdownContext'
import { Outlet, useLocation } from 'react-router-dom'
import './App.css'

function App() {
  const location = useLocation()
  const { examModeActive } = useExamLockdown()
  const withSidebar =
    !examModeActive && location.pathname.includes('course/')

  return (
    <>
      <ExamNavigationBlocker />
      {!examModeActive && <Header />}
      <main
        className={`app-content${
          examModeActive
            ? ' app-content--exam'
            : withSidebar
              ? ' app-content--with-sidebar'
              : ''
        }`}
      >
        <section className="app-main-body">
          <Outlet />
        </section>
        {!examModeActive && (
          <footer className="app-footer">
            <Footer />
          </footer>
        )}
      </main>
    </>
  )
}

export default App
