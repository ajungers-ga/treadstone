-- Clear existing data (for development)
DELETE FROM scores;
DELETE FROM events;
DELETE FROM courses;
DELETE FROM players;

-- Seed 3 Players
INSERT INTO players (first_name, last_name, nickname, hometown, debut_year, accolades)
VALUES
  ('Alex', 'Jungers', 'Sporty', 'Eagan, MN', 2019, 'Most Improved 2022'),
  ('Matt', 'Daulton', '', 'Northfield, MN', 2020, 'Matty D Invitational Founder'),
  ('Ryan', 'Torben', 'The Technician', 'St. Paul, MN', 2021, '');

-- Seed 1 Course
INSERT INTO courses (name, city, state, par)
VALUES ('Loggers Trail Golf Club', 'Stillwater', 'MN', 72);

-- Seed 1 Event
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

-- Seed 2 Scores (2-player teams)
INSERT INTO scores (event_id, player_id, teammate_id, score, to_par, placement)
VALUES
  (1, 1, 2, 70.00, -2.00, '1'),  -- Alex & Matt shoot 70
  (1, 3, NULL, 75.00, 3.00, '2'); -- Ryan goes solo, shoots 75
