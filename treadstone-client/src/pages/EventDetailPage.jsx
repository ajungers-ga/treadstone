import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'

function formatDate(d) {
  try {
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return String(d)
    return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return String(d) }
}

function formatToPar(val) {
  if (val === null || val === undefined) return '—'
  const n = Number(val)
  if (!Number.isFinite(n)) return '—'
  if (n === 0) return 'E'
  return n > 0 ? `+${n}` : `${n}`
}

function playerLinks(s) {
  const players = [
    { id: s.player1_id, name: s.player1_name },
    { id: s.player2_id, name: s.player2_name },
    { id: s.player3_id, name: s.player3_name },
    { id: s.player4_id, name: s.player4_name },
  ].filter(p => p.id)
  if (players.length === 0) return '—'
  return players.map((p, idx) => (
    <span key={p.id}>
      <Link to={`/players/${p.id}`}>{p.name || `#${p.id}`}</Link>
      {idx < players.length - 1 ? ' / ' : ''}
    </span>
  ))
}

export default function EventDetailPage() {
  const { id } = useParams()
  const [eventData, setEventData] = useState(null)
  const [scores, setScores] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [{ data: ev }, { data: sc }] = await Promise.all([
          apiFetch(`/events/${id}`, { signal: controller.signal }),
          apiFetch(`/events/${id}/scores`, { signal: controller.signal }),
        ])
        setEventData(ev)
        setScores(Array.isArray(sc) ? sc : [])
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error(err)
          setError(err.message || 'Failed to load event.')
          setEventData(null)
          setScores([])
        }
      } finally {
        setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [id])

  if (loading) return <div role="status">Loading event…</div>
  if (error) return <div role="alert" style={{ color: 'crimson' }}>{error}</div>
  if (!eventData) return <div>Event not found.</div>

  const date = eventData.date ?? eventData.event_date ?? eventData.start_date
  const courseLabel = eventData.course_name
    ? `${eventData.course_name}${eventData.course_par ? ` (Par ${eventData.course_par})` : ''}`
    : `Course #${eventData.course_id ?? '—'}`

  return (
    <div>
      <Link to="/" style={{ display: 'inline-block', marginBottom: 12 }}>← Back to Events</Link>
      <h2 style={{ marginTop: 0 }}>{eventData.name}</h2>
      <div style={{ opacity: 0.8, marginBottom: 16 }}>
        {date ? formatDate(date) : 'No date'} · {courseLabel}
        {eventData.is_major ? ` · Major${eventData.major_label ? `: ${eventData.major_label}` : ''}` : ''}
      </div>

      <h3>Scores</h3>
      {(!scores || scores.length === 0) ? (
        <div>No scores posted yet.</div>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 8 }}>Placement</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 8 }}>Players</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 8 }}>Strokes</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 8 }}>To Par</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s) => (
              <tr key={s.id ?? `${s.event_id}-${s.placement}-${s.strokes}`}>
                <td style={{ padding: 8 }}>{s.placement ?? '—'}</td>
                <td style={{ padding: 8 }}>{playerLinks(s)}</td>
                <td style={{ padding: 8 }}>{s.strokes ?? '—'}</td>
                <td style={{ padding: 8 }}>{formatToPar(s.to_par)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
