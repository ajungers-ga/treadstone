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
  // Existing summary data
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  // NEW: compact homepage feed data
  const [hp, setHp] = useState(null)
  const [hpError, setHpError] = useState(null)
  const [hpLoading, setHpLoading] = useState(true)

  // Fetch /home/summary (keep exactly as you had it)
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

  // NEW: Fetch /api/homepage (upcoming, leaderboard snippet, latest events, top players)
  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      setHpLoading(true)
      setHpError(null)
      try {
        const { url, data } = await apiFetch('/api/homepage', { signal: controller.signal })
        console.info('[Treadstone] GET /api/homepage URL:', url)
        setHp(data)
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error(err)
          setHpError(err.message || 'Failed to load homepage feed.')
        }
      } finally {
        setHpLoading(false)
      }
    })()
    return () => controller.abort()
  }, [])

  if (loading) return <div role="status">Loading…</div>
  if (error) return <div role="alert" style={{ color: 'crimson' }}>{error}</div>
  if (!data) return <div>—</div>

  const { totals, latest_event, next_event } = data
  const upcomingEvents = hp?.upcomingEvents ?? []
  const leaderboardSnippet = hp?.leaderboardSnippet ?? null
  const latestEvents = hp?.latestEvents ?? []
  const topPlayers = hp?.topPlayers ?? []

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
                    <th style={th}>Place</th>
                    <th style={th}>Players</th>
                    <th style={th}>Strokes</th>
                    <th style={th}>To Par</th>
                  </tr>
                </thead>
                <tbody>
                  {latest_event.top_results.map((r) => {
                    const team = [r.player1_name, r.player2_name, r.player3_name, r.player4_name]
                      .filter(Boolean)
                      .join(' / ')
                    return (
                      <tr key={r.id}>
                        <td style={td}>{r.placement ?? '—'}</td>
                        <td style={td}>{team || '—'}</td>
                        <td style={td}>{r.strokes ?? '—'}</td>
                        <td style={td}>{formatToPar(r.to_par)}</td>
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

      {/* Divider */}
      <hr style={{ border: 0, borderTop: '1px solid #eee' }} />

      {/* NEW: Upcoming Events (from /api/homepage) */}
      <section>
        <h2 style={{ margin: 0 }}>Upcoming Events</h2>
        {hpLoading && <div>Loading upcoming…</div>}
        {hpError && <div style={{ color: 'crimson' }}>{hpError}</div>}
        {!hpLoading && !hpError && (
          upcomingEvents.length > 0 ? (
            <ul style={{ paddingLeft: 18, marginTop: 12 }}>
              {upcomingEvents.map(e => (
                <li key={e.id}>
                  <Link to={`/events/${e.id}`}>{e.name}</Link> — {formatDate(e.date)} @ {e.course || 'TBD'}
                </li>
              ))}
            </ul>
          ) : <div style={{ marginTop: 8 }}>No upcoming events.</div>
        )}
      </section>

      {/* NEW: Most Recent Leaderboard Snippet */}
      <section>
        <h2 style={{ margin: 0 }}>Most Recent Leaderboard</h2>
        {hpLoading && <div>Loading leaderboard…</div>}
        {hpError && <div style={{ color: 'crimson' }}>{hpError}</div>}
        {!hpLoading && !hpError && leaderboardSnippet && (
          <>
            <h3 style={{ margin: '8px 0 0' }}>
              <Link to={`/events/${leaderboardSnippet.event.id}`}>
                {leaderboardSnippet.event.name}
              </Link>
            </h3>
            <div style={{ opacity: 0.8, marginTop: 4 }}>
              {formatDate(leaderboardSnippet.event.date)} — {leaderboardSnippet.event.course || 'TBD'}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
              <thead>
                <tr>
                  <th style={th}>Pos</th>
                  <th style={th}>Team</th>
                  <th style={th}>Strokes</th>
                  <th style={th}>To Par</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardSnippet.rows.map((r, idx) => (
                  <tr key={`${leaderboardSnippet.event.id}-${idx}`}>
                    <td style={td}>{r.placement ?? '—'}</td>
                    <td style={td}>{renderTeamNameLinks(r.teamName, r.playerIds)}</td>
                    <td style={td}>{r.strokes ?? '—'}</td>
                    <td style={td}>{formatToPar(r.toPar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 8 }}>
              <Link to={`/events/${leaderboardSnippet.event.id}`}>View full leaderboard →</Link>
            </div>
          </>
        )}
        {!hpLoading && !hpError && !leaderboardSnippet && <div style={{ marginTop: 8 }}>—</div>}
      </section>

      {/* NEW: Latest Events (podium) */}
      <section>
        <h2 style={{ margin: 0 }}>Latest Events</h2>
        {hpLoading && <div>Loading latest events…</div>}
        {hpError && <div style={{ color: 'crimson' }}>{hpError}</div>}
        {!hpLoading && !hpError && (
          latestEvents.length > 0 ? (
            <div style={cardGrid}>
              {latestEvents.map(evt => (
                <div key={evt.id} style={card}>
                  <h4 style={{ marginBottom: 6 }}>
                    <Link to={`/events/${evt.id}`}>{evt.name}</Link>
                  </h4>
                  <div style={{ opacity: 0.8 }}>
                    {formatDate(evt.date)} — {evt.course || 'TBD'}
                  </div>
                  <ol style={{ paddingLeft: 18, marginTop: 8 }}>
                    {evt.podium?.map(p => (
                      <li key={`${evt.id}-${p.placement}`}>
                        <strong>
                          {p.placement === 1 ? '🥇' : p.placement === 2 ? '🥈' : p.placement === 3 ? '🥉' : `#${p.placement}`}
                        </strong>{' '}
                        {renderTeamNameLinks(p.teamName, p.playerIds)} — {p.strokes} ({formatToPar(p.toPar)})
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          ) : <div style={{ marginTop: 8 }}>No finalized events yet.</div>
        )}
      </section>

      {/* NEW: Top Players */}
      <section>
        <h2 style={{ margin: 0 }}>Top Players (Career Wins)</h2>
        {hpLoading && <div>Loading players…</div>}
        {hpError && <div style={{ color: 'crimson' }}>{hpError}</div>}
        {!hpLoading && !hpError && (
          topPlayers.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
              <thead>
                <tr>
                  <th style={th}>#</th>
                  <th style={th}>Player</th>
                  <th style={th}>Wins</th>
                  <th style={th}>Majors</th>
                  <th style={th}>Events</th>
                </tr>
              </thead>
              <tbody>
                {topPlayers.map((p, i) => (
                  <tr key={p.player_id}>
                    <td style={td}>{i + 1}</td>
                    <td style={td}><Link to={`/players/${p.player_id}`}>{p.name}</Link></td>
                    <td style={td}>{Number(p.career_wins).toFixed(2)}</td>
                    <td style={td}>{Number(p.major_wins).toFixed(2)}</td>
                    <td style={td}>{p.events_played}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div style={{ marginTop: 8 }}>—</div>
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

/* helpers */
function renderTeamNameLinks(teamName, playerIds = []) {
  const parts = (teamName || '').split(' / ').filter(Boolean)
  return parts.map((name, i) =>
    playerIds[i] ? (
      <span key={`${playerIds[i]}-${i}`}>
        <Link to={`/players/${playerIds[i]}`}>{name}</Link>
        {i < parts.length - 1 ? ' / ' : ''}
      </span>
    ) : (
      <span key={`${name}-${i}`}>
        {name}
        {i < parts.length - 1 ? ' / ' : ''}
      </span>
    )
  )
}

/* inline table/card styles */
const th = { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 8 }
const td = { borderBottom: '1px solid #f1f5f9', padding: 8, verticalAlign: 'top' }
const cardGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }
const card = { border: '1px solid #eee', borderRadius: 12, padding: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
