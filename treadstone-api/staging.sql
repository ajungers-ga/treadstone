-- =========================================================
-- Staging schema for safe imports from CSV
-- =========================================================

CREATE SCHEMA IF NOT EXISTS staging;

-- One row per TEAM/SCORE (solo events = just player1_full filled)
CREATE TABLE IF NOT EXISTS staging.results (
  season INT,
  event_date DATE,
  event_name TEXT,
  course_name TEXT,
  course_city TEXT,
  course_state TEXT,
  course_par INT,            -- NEW: used to fill courses.par
  is_team_event BOOLEAN,
  is_major BOOLEAN,
  major_label TEXT,
  finalized BOOLEAN,

  player1_full TEXT,
  player2_full TEXT,
  player3_full TEXT,
  player4_full TEXT,

  strokes INT,               -- actual strokes (not relative)
  placement INT,             -- numeric place (1,2,3...)
  notes TEXT
);

-- Map raw spreadsheet names to canonical first/last
CREATE TABLE IF NOT EXISTS staging.player_name_map (
  raw_full TEXT PRIMARY KEY,
  first_name TEXT,
  last_name  TEXT
);

-- Clean helper view listing distinct raw names from the results
DROP VIEW IF EXISTS staging.distinct_raw_names;

CREATE VIEW staging.distinct_raw_names AS
SELECT DISTINCT player AS raw_full
FROM (
  SELECT player1_full AS player FROM staging.results
  UNION
  SELECT player2_full FROM staging.results
  UNION
  SELECT player3_full FROM staging.results
  UNION
  SELECT player4_full FROM staging.results
) p
WHERE player IS NOT NULL;
