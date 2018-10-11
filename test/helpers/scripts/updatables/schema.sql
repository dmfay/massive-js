CREATE SCHEMA public;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE normal_pk (
  id SERIAL NOT NULL PRIMARY KEY,
  field1 TEXT NOT NULL,
  field2 TEXT,
  json_field JSONB,
  array_field TEXT[],
  array_of_json JSON[]
);

CREATE TABLE uuid_pk (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  field1 TEXT
);

CREATE TABLE compound_pk (
  id1 SERIAL NOT NULL,
  id2 SERIAL NOT NULL,
  field1 TEXT
);

ALTER TABLE compound_pk ADD PRIMARY KEY (id1, id2);

CREATE TABLE no_pk (
  field1 TEXT,
  field2 TEXT
);

CREATE TABLE "CasedName" (
  "Id" SERIAL NOT NULL PRIMARY KEY,
  "Field1" TEXT
);

CREATE VIEW normal_as AS
SELECT *
FROM normal_pk
WHERE field1 LIKE 'a%';

INSERT INTO normal_pk (field1) VALUES ('alpha'), ('beta'), ('gamma');
INSERT INTO compound_pk (field1) VALUES ('alpha'), ('beta'), ('gamma');
INSERT INTO no_pk (field1, field2) VALUES ('alpha', 'beta'), ('gamma', 'delta'), ('epsilon', 'zeta');
INSERT INTO "CasedName" ("Field1") VALUES ('Alpha'), ('Beta'), ('Gamma');
