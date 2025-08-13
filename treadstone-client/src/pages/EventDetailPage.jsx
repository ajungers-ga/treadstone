// src/pages/EventDetailPage.jsx

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';

export default function EventDetailPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchEventData() {
      try {
        // Fetch event details
        const eventData = await apiFetch(`/events/${id}`);
        setEvent(eventData);

        // Fetch event scores
        const scoresData = await apiFetch(`/events/${id}/scores`);
        setScores(scoresData);

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Failed to load event data');
        setLoading(false);
      }
    }

    fetchEventData();
  }, [id]);

  if (loading) return <p>Loading event...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      {/* Back link to Events list instead of homepage */}
      <Link to="/events" style={{ display: 'inline-block', marginBottom: 12 }}>
        ← Back to Events
      </Link>

      {event && (
        <>
          <h1>{event.name}</h1>
          <p>
            <strong>Date:</strong>{' '}
            {new Date(event.date).toLocaleDateString()}
          </p>
          <p>
            <strong>Course:</strong> {event.course_name || 'Unknown Course'}
          </p>
          <p>
            <strong>Season:</strong> {event.season}
          </p>
          {event.is_major && (
            <p>
              <strong>Major:</strong> {event.major_label || 'Major Tournament'}
            </p>
          )}
        </>
      )}

      <h2>Scores</h2>
      {scores.length === 0 ? (
        <p>No scores found for this event.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Placement</th>
              <th>Player(s)</th>
              <th>Strokes</th>
              <th>To Par</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((score) => (
              <tr key={score.id}>
                <td>{score.placement || '-'}</td>
                <td>
                  {[score.player1_name, score.player2_name, score.player3_name, score.player4_name]
                    .filter(Boolean)
                    .join(', ')}
                </td>
                <td>{score.strokes}</td>
                <td>{score.to_par}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
