import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

export default function PlayersPage() {
  const [players, setPlayers] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const { url, data } = await apiFetch('/players', { signal: controller.signal })
        console.info('[Treadstone] GET /players URL:', url)
        if (!Array.isArray(data)) throw new Error('Expected an array from /players')
        setPlayers(data)
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error(err)
          setError(err.message || 'Failed to load players.')
          setPlayers([])
        }
      } finally {
        setLoading(false)
      }
    })()

    return () => controller.abort()
  }, [])

  if (loading) return <div role="status">Loading players…</div>
  if (error) return <div role="alert" style={{ color: 'crimson' }}>{error}</div>
  if (!players || players.length === 0) return <div>No players found.</div>

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Players</h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
        {players.map(p => (
          <li key={p.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
            <div style={{ fontWeight: 600 }}>{p.name || p.full_name || '(Unnamed Player)'}</div>
            <div style={{ opacity: 0.8, marginTop: 6 }}>
              {p.nickname ? `“${p.nickname}”` : ''}
              {p.hometown ? ` · ${p.hometown}` : ''}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
