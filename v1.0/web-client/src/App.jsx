import Header from './components/Header'
import Footer from './components/Footer'
import { Outlet } from 'react-router-dom'
import './App.css'

function App() {

  return (
    <>
      <Header />
      <main className="app-content">
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
