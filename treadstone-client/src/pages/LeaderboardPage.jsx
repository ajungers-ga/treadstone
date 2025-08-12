import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'

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

function formatToPar(val) {
  if (val === null || val === undefined) return '—'
  const n = Number(val)
  if (!Number.isFinite(n)) return '—'
  if (n === 0) return 'E'
  return n > 0 ? `+${n}` : `${n}`
}

export default function LeaderboardPage() {
  const { eventId } = useParams()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const { url, data } = await apiFetch(`/events/${eventId}/scores`, { signal: controller.signal })
        console.info('[Treadstone] GET leaderboard URL:', url)
        if (!Array.isArray(data)) throw new Error('Expected an array from /events/:id/scores')
        const sorted = [...data].sort((a, b) => {
          const pa = a.placement ?? 999999
          const pb = b.placement ?? 999999
          return pa - pb
        })
        setRows(sorted)
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error(err)
          setError(err.message || 'Failed to load leaderboard.')
          setRows([])
        }
      } finally {
        setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [eventId])

  if (loading) return <div role="status">Loading leaderboard…</div>
  if (error) return <div role="alert" style={{ color: 'crimson' }}>{error}</div>
  if (!rows || rows.length === 0) return <div>No scores yet.</div>

  return (
    <div>
      <Link to="/" style={{ display: 'inline-block', marginBottom: 12 }}>← Back to Events</Link>
      <h2 style={{ marginTop: 0 }}>Leaderboard</h2>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 8 }}>Place</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 8 }}>Players</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 8 }}>Strokes</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 8 }}>To Par</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id ?? `${s.event_id}-${s.placement}-${s.strokes}`}>
              <td style={{ padding: 8 }}>{s.placement ?? '—'}</td>
              <td style={{ padding: 8 }}>{playerLinks(s)}</td>
              <td style={{ padding: 8 }}>{s.strokes ?? '—'}</td>
              <td style={{ padding: 8 }}>{formatToPar(s.to_par)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
