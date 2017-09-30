CREATE SCHEMA public;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE products (
        id serial PRIMARY KEY,
        string varchar NOT NULL
);

INSERT INTO products (string) VALUES ('one');
INSERT INTO products (string) VALUES ('two');
INSERT INTO products (string) VALUES ('three');
INSERT INTO products (string) VALUES ('four');

