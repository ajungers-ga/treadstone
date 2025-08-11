-- =========================================================
-- Transform & Upsert from staging into production tables
-- Uses staging.results.course_par to set courses.par
-- Safe to re-run
-- =========================================================

-- 1) Upsert courses (insert new; update par when provided)
INSERT INTO courses (name, city, state, par)
SELECT DISTINCT
  r.course_name, r.course_city, r.course_state,
  COALESCE(r.course_par, 72)   -- fallback if missing in CSV
FROM staging.results r
WHERE r.course_name IS NOT NULL
ON CONFLICT DO NOTHING;

-- Update existing courses' par if staging has a value different from current
UPDATE courses c
SET par = r.course_par
FROM (
  SELECT DISTINCT course_name, course_city, course_state, course_par
  FROM staging.results
  WHERE course_par IS NOT NULL
) r
WHERE c.name = r.course_name
  AND COALESCE(c.city,'')  = COALESCE(r.course_city,'')
  AND COALESCE(c.state,'') = COALESCE(r.course_state,'')
  AND c.par IS DISTINCT FROM r.course_par;

-- 2) Upsert players via mapping table (first/last must be set)
INSERT INTO players (first_name, last_name)
SELECT DISTINCT m.first_name, m.last_name
FROM staging.player_name_map m
WHERE m.first_name IS NOT NULL AND m.last_name IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3) Upsert events (dedup by name+date+course)
WITH course_key AS (
  SELECT id, name, city, state FROM courses
),
src_events AS (
  SELECT DISTINCT
    r.event_name, r.event_date, r.season, r.is_team_event, r.is_major, r.major_label, r.finalized,
    r.course_name, r.course_city, r.course_state
  FROM staging.results r
)
INSERT INTO events (name, date, course_id, season, is_team_event, is_major, major_label, finalized, notes)
SELECT
  s.event_name,
  s.event_date,
  ck.id AS course_id,
  s.season,
  COALESCE(s.is_team_event, TRUE),
  COALESCE(s.is_major, FALSE),
  s.major_label,
  COALESCE(s.finalized, FALSE),
  NULL
FROM src_events s
JOIN course_key ck
  ON ck.name = s.course_name
 AND COALESCE(ck.city,'')  = COALESCE(s.course_city,'')
 AND COALESCE(ck.state,'') = COALESCE(s.course_state,'')
ON CONFLICT (name, date, course_id) DO UPDATE
SET season       = EXCLUDED.season,
    is_team_event = EXCLUDED.is_team_event,
    is_major     = EXCLUDED.is_major,
    major_label  = EXCLUDED.major_label,
    finalized    = EXCLUDED.finalized;

-- 4) Upsert scores (resolve player IDs via mapping)
WITH pm AS (
  SELECT
    raw_full,
    (SELECT id FROM players p WHERE p.first_name = m.first_name AND p.last_name = m.last_name) AS player_id
  FROM staging.player_name_map m
),
course_key AS (
  SELECT id, name, city, state FROM courses
),
event_key AS (
  SELECT e.id, e.name, e.date, e.course_id FROM events e
),
src AS (
  SELECT
    r.*,
    ek.id AS event_id,
    pm1.player_id AS p1,
    pm2.player_id AS p2,
    pm3.player_id AS p3,
    pm4.player_id AS p4
  FROM staging.results r
  JOIN course_key ck
    ON ck.name = r.course_name
   AND COALESCE(ck.city,'')  = COALESCE(r.course_city,'')
   AND COALESCE(ck.state,'') = COALESCE(r.course_state,'')
  JOIN event_key ek
    ON ek.name = r.event_name
   AND ek.date = r.event_date
   AND ek.course_id = ck.id
  LEFT JOIN pm pm1 ON pm1.raw_full = r.player1_full
  LEFT JOIN pm pm2 ON pm2.raw_full = r.player2_full
  LEFT JOIN pm pm3 ON pm3.raw_full = r.player3_full
  LEFT JOIN pm pm4 ON pm4.raw_full = r.player4_full
)
INSERT INTO scores (
  event_id, player1_id, player2_id, player3_id, player4_id,
  strokes, to_par, placement, notes, disqualified
)
SELECT
  s.event_id, s.p1, s.p2, s.p3, s.p4,
  CASE WHEN s.strokes IS NULL THEN NULL ELSE CAST(s.strokes AS INT) END,
  NULL,
  s.placement,
  s.notes,
  -- DQ if strokes are null OR notes mention DQ (coalesce to FALSE)
  ((s.strokes IS NULL) OR (COALESCE(s.notes, '') ILIKE '%dq%'))
FROM src s
WHERE s.p1 IS NOT NULL               -- at least one player required
ON CONFLICT DO NOTHING;

-- 5) Compute to_par only when strokes exist
UPDATE scores sc
SET to_par = sc.strokes - c.par
FROM events e
JOIN courses c ON c.id = e.course_id
WHERE sc.event_id = e.id
  AND sc.strokes IS NOT NULL
  AND sc.to_par IS DISTINCT FROM (sc.strokes - c.par);
