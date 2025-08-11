-- =========================================================
-- Treadstone Core Schema (DEV reset-safe)
-- =========================================================

-- 0) Drop tables in FK-safe order (DEV ONLY)
DROP TABLE IF EXISTS scores;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS players;

-- =========================================================
-- 1) Players
-- =========================================================
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name  VARCHAR(50) NOT NULL,
  nickname   VARCHAR(50),
  hometown   VARCHAR(100),
  debut_year INTEGER,
  image_url  TEXT,
  hof_inducted BOOLEAN DEFAULT FALSE,
  hof_year INTEGER,
  accolades TEXT
);

-- Uniqueness on player name (exact match)
CREATE UNIQUE INDEX uq_player_name ON players(first_name, last_name);
-- Helpful index for lookups
CREATE INDEX idx_players_last_first ON players(last_name, first_name);

-- =========================================================
-- 2) Courses
-- =========================================================
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  city VARCHAR(100),
  state VARCHAR(100),
  -- Used to calculate to_par (e.g., strokes - par = to_par)
  par INTEGER NOT NULL
);

-- Expression-based uniqueness must be a UNIQUE INDEX (not constraint)
CREATE UNIQUE INDEX uq_course
  ON courses (name, COALESCE(city, ''), COALESCE(state, ''));

CREATE INDEX idx_courses_city_state ON courses(city, state);

-- =========================================================
-- 3) Events
-- =========================================================
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL, -- e.g. "2-Man Scramble", "BGA Masters"
  date DATE NOT NULL,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  is_team_event BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  season INTEGER NOT NULL,
  is_major BOOLEAN NOT NULL DEFAULT FALSE,
  major_label VARCHAR(50),
  finalized BOOLEAN NOT NULL DEFAULT FALSE
);

-- Simple column-based uniqueness can be a UNIQUE INDEX or constraint.
-- Using UNIQUE INDEX for consistency:
CREATE UNIQUE INDEX uq_event ON events(name, date, course_id);

CREATE INDEX idx_events_season ON events(season);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_finalized ON events(finalized);
CREATE INDEX idx_events_major ON events(is_major);

-- =========================================================
-- 4) Scores (team OR solo)
--    One row per team/score (solo = only player1_id filled)
-- =========================================================
CREATE TABLE scores (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Up to 4 players on a team (Option B)
  player1_id INTEGER NOT NULL REFERENCES players(id),
  player2_id INTEGER REFERENCES players(id),
  player3_id INTEGER REFERENCES players(id),
  player4_id INTEGER REFERENCES players(id),

  -- Raw score and convenience fields
  strokes INTEGER,              -- now nullable to allow DQ entries
  to_par  INTEGER,              -- optional convenience; can compute post-load
  placement INTEGER,            -- 1,2,3,... ties handled at data level
  notes TEXT,
  disqualified BOOLEAN NOT NULL DEFAULT FALSE -- NEW flag for DQ handling
);

-- Prevent duplicate team entries for the same event (expression-based UNIQUE INDEX)
CREATE UNIQUE INDEX uq_scores_team ON scores (
  event_id,
  COALESCE(player1_id, 0),
  COALESCE(player2_id, 0),
  COALESCE(player3_id, 0),
  COALESCE(player4_id, 0)
);

-- Helpful indexes for common queries
CREATE INDEX idx_scores_event ON scores(event_id);
CREATE INDEX idx_scores_placement ON scores(placement);
-- Quickly find appearances by a given player
CREATE INDEX idx_scores_player1 ON scores(player1_id);
CREATE INDEX idx_scores_player2 ON scores(player2_id);
CREATE INDEX idx_scores_player3 ON scores(player3_id);
CREATE INDEX idx_scores_player4 ON scores(player4_id);
