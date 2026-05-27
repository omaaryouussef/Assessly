import Header from './components/Header'
import Footer from './components/Footer'
import { Outlet, useLocation } from 'react-router-dom'
import './App.css'

function App() {
  const location = useLocation()
  const withSidebar = location.pathname.includes('course/')

  return (
    <>
      <Header />
      <main className={`app-content${withSidebar ? ' app-content--with-sidebar' : ''}`}>
        <section className="app-main-body">
          <Outlet />
        </section>
        <footer className="app-footer">
          <Footer />
        </footer>
      </main>
    </>
  )
}

export default App
