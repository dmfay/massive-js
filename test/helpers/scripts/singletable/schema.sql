CREATE SCHEMA public;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE products (
  id serial PRIMARY KEY,
  string varchar NOT NULL,
  tags character varying(255)[],
  description text,
  specs jsonb,
  price decimal(10,2) default 0.00,
  uuid uuid default gen_random_uuid(),
  "CaseName" varchar
);

INSERT INTO products (string) VALUES ('one');
INSERT INTO products (string) VALUES ('two');
INSERT INTO products (string) VALUES ('three');
INSERT INTO products (string) VALUES ('four');
