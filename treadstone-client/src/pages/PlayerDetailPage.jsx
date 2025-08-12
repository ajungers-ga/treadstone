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

export default function PlayerDetailPage() {
  const { id } = useParams()
  const [player, setPlayer] = useState(null)
  const [stats, setStats] = useState(null)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [{ data: p }, { data: st }, { data: rs }] = await Promise.all([
          apiFetch(`/players/${id}`, { signal: controller.signal }),
          apiFetch(`/players/${id}/stats`, { signal: controller.signal }),
          apiFetch(`/players/${id}/results`, { signal: controller.signal }),
        ])
        setPlayer(p)
        setStats(st)
        setResults(Array.isArray(rs) ? rs : [])
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error(err)
          setError(err.message || 'Failed to load player.')
          setPlayer(null)
          setStats(null)
          setResults([])
        }
      } finally {
        setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [id])

  if (loading) return <div role="status">Loading player…</div>
  if (error) return <div role="alert" style={{ color: 'crimson' }}>{error}</div>
  if (!player) return <div>Player not found.</div>

  return (
    <div>
      <Link to="/players" style={{ display: 'inline-block', marginBottom: 12 }}>← Back to Players</Link>
      <h2 style={{ marginTop: 0 }}>{player.full_name}{player.nickname ? ` (“${player.nickname}”)` : ''}</h2>
      <div style={{ opacity: 0.8, marginBottom: 16 }}>
        {player.hometown ? `${player.hometown} · ` : ''} 
        {player.debut_year ? `Debut ${player.debut_year}` : ''}
        {player.hof_inducted ? ` · Hall of Fame${player.hof_year ? ` (${player.hof_year})` : ''}` : ''}
      </div>

      <section style={{ marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Stats</h3>
        {!stats ? (
          <div>—</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <Stat label="Events Played" value={stats.events_played} />
            <Stat label="Events Won" value={stats.events_won} />
            <Stat label="Podiums" value={stats.podiums} />
            <Stat label="Best Finish" value={stats.best_finish ?? '—'} />
            <Stat label="Avg Strokes" value={stats.avg_strokes ?? '—'} />
            <Stat label="Avg To Par" value={stats.avg_to_par ?? '—'} />
            <Stat label="Seasons" value={stats.seasons_played ?? '—'} />
            <Stat label="First Event" value={stats.first_event_date ? formatDate(stats.first_event_date) : '—'} />
            <Stat label="Last Event" value={stats.last_event_date ? formatDate(stats.last_event_date) : '—'} />
          </div>
        )}
      </section>

      <section>
        <h3 style={{ marginTop: 0 }}>Event Results</h3>
        {(!results || results.length === 0) ? (
          <div>No results.</div>
        ) : (
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 8 }}>Date</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 8 }}>Event</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 8 }}>Course</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 8 }}>Placement</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 8 }}>Strokes</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 8 }}>To Par</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 8 }}>Team</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => {
                const team = [r.player1_name, r.player2_name, r.player3_name, r.player4_name].filter(Boolean).join(' / ')
                return (
                  <tr key={r.score_id}>
                    <td style={{ padding: 8 }}>{formatDate(r.date)}</td>
                    <td style={{ padding: 8 }}>
                      <Link to={`/events/${r.event_id}`}>{r.event_name}</Link>
                    </td>
                    <td style={{ padding: 8 }}>{r.course_name ? `${r.course_name}${r.course_par ? ` (Par ${r.course_par})` : ''}` : '—'}</td>
                    <td style={{ padding: 8 }}>{r.placement ?? '—'}</td>
                    <td style={{ padding: 8 }}>{r.strokes ?? '—'}</td>
                    <td style={{ padding: 8 }}>{formatToPar(r.to_par)}</td>
                    <td style={{ padding: 8 }}>{team || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600 }}>{value ?? '—'}</div>
    </div>
  )
}
