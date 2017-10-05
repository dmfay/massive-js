CREATE SCHEMA public;

CREATE TABLE vals (
  id serial PRIMARY KEY,
  string varchar NOT NULL
);

INSERT INTO vals (string) VALUES ('one');
INSERT INTO vals (string) VALUES ('two');
INSERT INTO vals (string) VALUES ('three');
INSERT INTO vals (string) VALUES ('four');

CREATE VIEW vals_starting_with_t AS
SELECT * FROM vals WHERE string LIKE 't%';

CREATE MATERIALIZED VIEW vals_ending_with_e AS
SELECT * FROM vals WHERE string LIKE '%e';
