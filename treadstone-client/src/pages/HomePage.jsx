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

function formatToPar(val) {
  if (val === null || val === undefined) return '—'
  const n = Number(val)
  if (!Number.isFinite(n)) return '—'
  if (n === 0) return 'E'
  return n > 0 ? `+${n}` : `${n}`
}

export default function HomePage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const { url, data } = await apiFetch('/home/summary', { signal: controller.signal })
        console.info('[Treadstone] GET /home/summary URL:', url)
        setData(data)
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error(err)
          setError(err.message || 'Failed to load homepage.')
        }
      } finally {
        setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [])

  if (loading) return <div role="status">Loading…</div>
  if (error) return <div role="alert" style={{ color: 'crimson' }}>{error}</div>
  if (!data) return <div>—</div>

  const { totals, latest_event, next_event } = data

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* KPIs */}
      <section>
        <h2 style={{ margin: '0 0 12px' }}>Overview</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <KPI label="Players" value={totals?.players ?? '—'} />
          <KPI label="Events" value={totals?.events ?? '—'} />
          <KPI label="Seasons" value={totals?.seasons ?? '—'} />
        </div>
      </section>

      {/* Latest Event */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ margin: 0 }}>Latest Event</h2>
          {latest_event ? <Link to={`/events/${latest_event.id}`}>View Event →</Link> : null}
        </div>
        {!latest_event ? (
          <div>No completed events yet.</div>
        ) : (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginTop: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 18 }}>{latest_event.name}</div>
            <div style={{ opacity: 0.8, marginTop: 6 }}>
              {formatDate(latest_event.date)} · {latest_event.course_name ? `${latest_event.course_name}${latest_event.course_par ? ` (Par ${latest_event.course_par})` : ''}` : `Course #${latest_event.course_id}`}
            </div>

            <h3 style={{ marginTop: 16, fontSize: 16 }}>Top Results</h3>
            {(!latest_event.top_results || latest_event.top_results.length === 0) ? (
              <div>—</div>
            ) : (
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
                  {latest_event.top_results.map((r) => {
                    const team = [r.player1_name, r.player2_name, r.player3_name, r.player4_name]
                      .filter(Boolean)
                      .join(' / ')
                    return (
                      <tr key={r.id}>
                        <td style={{ padding: 8 }}>{r.placement ?? '—'}</td>
                        <td style={{ padding: 8 }}>{team || '—'}</td>
                        <td style={{ padding: 8 }}>{r.strokes ?? '—'}</td>
                        <td style={{ padding: 8 }}>{formatToPar(r.to_par)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>

      {/* Next Event */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ margin: 0 }}>Next Event</h2>
          {next_event ? <Link to={`/events/${next_event.id}`}>Event Details →</Link> : null}
        </div>
        {!next_event ? (
          <div>No upcoming event scheduled.</div>
        ) : (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginTop: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 18 }}>{next_event.name}</div>
            <div style={{ opacity: 0.8, marginTop: 6 }}>
              {formatDate(next_event.date)} · {next_event.course_name ? `${next_event.course_name}${next_event.course_par ? ` (Par ${next_event.course_par})` : ''}` : `Course #${next_event.course_id}`}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function KPI({ label, value }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  )
}
