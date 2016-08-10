DROP SCHEMA IF EXISTS public CASCADE;

CREATE SCHEMA public;

CREATE TABLE cities (
  id serial PRIMARY KEY,
  name text,
  population int
);

CREATE TABLE capitals (
  of_state char(2)
) INHERITS (cities);
