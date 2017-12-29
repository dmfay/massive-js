CREATE SCHEMA public;

CREATE TABLE compoundpk(
  key_one int not null,
  key_two int not null,
  value text
);

ALTER TABLE compoundpk ADD PRIMARY KEY (key_one, key_two);

INSERT INTO compoundpk (key_one, key_two, value) VALUES (1, 1, 'one:one'), (1, 2, 'one:two'), (3, 4, 'three: four');

CREATE TABLE compoundserials(
  key_one serial not null,
  key_two serial not null,
  value text
);

ALTER TABLE compoundserials ADD PRIMARY KEY (key_one, key_two);

INSERT INTO compoundserials (value) VALUES ('one'), ('two');
