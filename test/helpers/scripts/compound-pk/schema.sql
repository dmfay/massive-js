CREATE SCHEMA public;

CREATE TABLE compoundpk(
  key_one int NOT NULL,
  key_two int NOT NULL,
  value text
);

ALTER TABLE compoundpk ADD PRIMARY KEY (key_one, key_two);

INSERT INTO compoundpk (key_one, key_two, value) VALUES (1, 1, 'one:one'), (1, 2, 'one:two'), (3, 4, 'three: four');

CREATE TABLE compoundserials(
  key_one serial NOT NULL,
  key_two serial NOT NULL,
  value text
);

ALTER TABLE compoundserials ADD PRIMARY KEY (key_one, key_two);

INSERT INTO compoundserials (value) VALUES ('one'), ('two');

CREATE TABLE junction(
  id serial PRIMARY KEY,
  c_key_one int NOT NULL,
  c_key_two int NOT NULL,
  value text
);
