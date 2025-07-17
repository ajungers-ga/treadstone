-- Drop tables for clean reset (DEV ONLY)
DROP TABLE IF EXISTS scores;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS players;

-- Players table
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(20) NOT NULL,
  last_name VARCHAR(20) NOT NULL,
  nickname VARCHAR(50),
  hometown VARCHAR(50),
  debut_year INTEGER,
  image_url TEXT,
  hof_inducted BOOLEAN DEFAULT FALSE,
  hof_year INTEGER,
  accolades TEXT,
  wins NUMERIC(4,1) DEFAULT 0.0
);

-- Courses table
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  city VARCHAR(100),
  state VARCHAR(100),
  par INTEGER NOT NULL  -- Used to calculate to_par (e.g. 70 - 72 = -2)
);

-- Events table
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL, -- e.g. "2-Man Scramble"
  date DATE NOT NULL,
  course_id INTEGER REFERENCES courses(id),
  is_team_event BOOLEAN DEFAULT TRUE,
  notes TEXT,
  season INTEGER NOT NULL,
  is_major BOOLEAN DEFAULT FALSE,
  major_label VARCHAR(50),
  finalized BOOLEAN DEFAULT FALSE
);

-- Scores table
CREATE TABLE scores (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id),
  player_id INTEGER NOT NULL REFERENCES players(id),
  teammate_id INTEGER REFERENCES players(id),
  third_player_id INTEGER REFERENCES players(id),
  fourth_player_id INTEGER REFERENCES players(id),
  score NUMERIC(5,2) NOT NULL,       -- raw score, e.g. 69.00
  to_par NUMERIC(5,2),               -- calculated manually from course.par
  placement VARCHAR(20)
);
