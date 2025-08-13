import { NavLink, Outlet } from 'react-router-dom'
import './App.css'
import { getApiBase } from './lib/api'

export default function App() {
  const apiBase = getApiBase()

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Treadstone</h1>
        <nav style={{ display: 'flex', gap: 12 }}>
          <NavLink to="/" end style={({ isActive }) => ({ textDecoration: isActive ? 'underline' : 'none' })}>Home</NavLink>
          <NavLink to="/events" style={({ isActive }) => ({ textDecoration: isActive ? 'underline' : 'none' })}>Events</NavLink>
          <NavLink to="/players" style={({ isActive }) => ({ textDecoration: isActive ? 'underline' : 'none' })}>Players</NavLink>
        </nav>
        <div style={{ marginLeft: 'auto', opacity: 0.7, fontSize: 13 }}>
          API: <code>{apiBase}</code>
        </div>
      </header>

      <main style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
