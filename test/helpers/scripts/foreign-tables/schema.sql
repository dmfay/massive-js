CREATE SCHEMA public;

CREATE TABLE t1 (id serial PRIMARY KEY);
CREATE TABLE t2 (id serial PRIMARY KEY);

CREATE EXTENSION IF NOT EXISTS postgres_fdw;

CREATE SERVER loopback FOREIGN DATA WRAPPER postgres_fdw OPTIONS (host 'localhost', dbname 'massive', port '5432');

CREATE USER MAPPING FOR postgres
  SERVER loopback
  OPTIONS (user 'postgres');

CREATE FOREIGN TABLE foreigntable (id serial) SERVER loopback OPTIONS (schema_name 'public', table_name 't1');

CREATE FOREIGN TABLE inheriting (id serial) INHERITS (t2) SERVER loopback OPTIONS (schema_name 'public', table_name 't1');
