-- Clear existing data
DELETE FROM scores;
DELETE FROM events;
DELETE FROM courses;
DELETE FROM players;

-- Reset ID sequences to start from 1
ALTER SEQUENCE players_id_seq RESTART WITH 1;
ALTER SEQUENCE courses_id_seq RESTART WITH 1;
ALTER SEQUENCE events_id_seq RESTART WITH 1;
ALTER SEQUENCE scores_id_seq RESTART WITH 1;

-- Seed players
INSERT INTO players (first_name, last_name, nickname, hometown, debut_year, accolades)
VALUES
  ('Alex', 'Jungers', 'Sporty', 'Eagan, MN', 2019, 'Most Improved 2022'),
  ('Matt', 'Daulton', '', 'Northfield, MN', 2020, 'Matty D Invitational Founder'),
  ('Ryan', 'Torben', 'The Technician', 'St. Paul, MN', 2021, '');

-- Seed course
INSERT INTO courses (name, city, state, par)
VALUES ('Loggers Trail Golf Club', 'Stillwater', 'MN', 72);

-- Seed event (course_id must now exist)
INSERT INTO events (name, date, course_id, is_team_event, season, is_major, major_label, finalized)
VALUES (
  '2-Man Scramble',
  '2025-07-12',
  1,         -- Loggers Trail
  TRUE,
  2025,
  TRUE,
  'BGA Masters',
  TRUE
);

-- Drop and recreate scores table
DROP TABLE IF EXISTS scores;

CREATE TABLE scores (
  id SERIAL PRIMARY KEY,
  event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  player1_id INT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player2_id INT REFERENCES players(id) ON DELETE SET NULL,
  player3_id INT REFERENCES players(id) ON DELETE SET NULL,
  player4_id INT REFERENCES players(id) ON DELETE SET NULL,
  strokes NUMERIC(5,2),
  placement INT,
  notes TEXT
);

-- Seed scores
INSERT INTO scores (event_id, player1_id, player2_id, strokes, placement, notes)
VALUES (1, 1, 2, 70.00, 1, 'Alex & Matt team up');

INSERT INTO scores (event_id, player1_id, strokes, placement, notes)
VALUES (1, 3, 75.00, 2, 'Ryan flew solo');
