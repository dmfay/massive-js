CREATE SCHEMA public;

CREATE TABLE normal_pk (
  id SERIAL NOT NULL PRIMARY KEY,
  field1 TEXT,
  array_field TEXT[]
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

INSERT INTO normal_pk (field1) VALUES ('alpha'), ('beta'), ('gamma');
INSERT INTO compound_pk (field1) VALUES ('alpha'), ('beta'), ('gamma');
INSERT INTO no_pk (field1, field2) VALUES ('alpha', 'beta'), ('gamma', 'delta'), ('epsilon', 'zeta');
INSERT INTO "CasedName" ("Field1") VALUES ('Alpha'), ('Beta'), ('Gamma');
