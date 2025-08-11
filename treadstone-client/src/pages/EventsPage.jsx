import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'

function formatDate(d) {
  try {
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return String(d)
    return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return String(d) }
}

export default function EventsPage() {
  const [events, setEvents] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const { url, data } = await apiFetch('/events', { signal: controller.signal })
        console.info('[Treadstone] GET /events URL:', url)
        if (!Array.isArray(data)) throw new Error('Expected an array from /events')
        setEvents(data)
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error(err)
          setError(err.message || 'Failed to load events.')
          setEvents([])
        }
      } finally {
        setLoading(false)
      }
    })()

    return () => controller.abort()
  }, [])

  if (loading) return <div role="status">Loading events…</div>
  if (error) return <div role="alert" style={{ color: 'crimson' }}>{error}</div>
  if (!events || events.length === 0) return <div>No events found.</div>

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
      {events.map(ev => {
        const date = ev.date ?? ev.event_date ?? ev.start_date
        const courseLabel = ev.course_name
          ? `${ev.course_name}${ev.course_par ? ` (Par ${ev.course_par})` : ''}`
          : `Course #${ev.course_id ?? '—'}`
        return (
          <li key={ev.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>
                  <Link to={`/events/${ev.id}`} style={{ textDecoration: 'none' }}>
                    {ev.name || '(Unnamed Event)'}
                  </Link>
                </div>
                <div style={{ opacity: 0.8, marginTop: 6 }}>
                  {date ? formatDate(date) : 'No date'} · {courseLabel}
                </div>
              </div>
              <Link to={`/leaderboard/${ev.id}`} style={{ fontSize: 14 }}>View Leaderboard →</Link>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
