DROP SCHEMA IF EXISTS public CASCADE;

CREATE SCHEMA public;

CREATE TABLE cities (
  id serial PRIMARY KEY,
  name text,
  population int
);

CREATE TABLE capitals (
  id serial PRIMARY KEY,
  of_state char(2)
) INHERITS (cities);

CREATE TABLE ancient (
  name text,
  country text
);

INSERT INTO cities (name, population)
VALUES ('Anchorage', 298615),
  ('Jacksonville', 868031),
  ('Houston', 2296224),
  ('Los Angeles', 3971883),
  ('San Antonio', 1469845),
  ('Chesapeake', 235429);

INSERT INTO capitals (name, population, of_state)
VALUES ('Oklahoma City', 631346, 'OK'),
  ('Phoenix', 1563025, 'AZ'),
  ('Nashville', 654610, 'TN'),
  ('Indianapolis', 853173, 'IN');

INSERT INTO ancient (name, country)
VALUES ('Petra', 'Jordan'),
  ('Cahokia', 'US'),
  ('Macchu Picchu', 'Peru');
