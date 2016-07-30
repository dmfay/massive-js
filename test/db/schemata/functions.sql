CREATE SCHEMA IF NOT EXISTS public;

CREATE EXTENSION IF NOT EXISTS citext;

CREATE OR REPLACE FUNCTION get_number() RETURNS int AS $$
SELECT 1;
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION "GetNumber"() RETURNS int AS $$
SELECT 2;
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_record() RETURNS TABLE (id int, field1 text, field2 text) AS $$
VALUES(1, 'two', 'three');
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_json() RETURNS json AS $$
SELECT '{"hello": "world"}'::json;
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_array() RETURNS text[] AS $$
SELECT ARRAY['yes', 'yes', 'yes', 'yes'];
$$ LANGUAGE SQL;

CREATE TYPE coin_toss AS enum ('heads', 'tails');

CREATE OR REPLACE FUNCTION get_enum() RETURNS coin_toss AS $$
SELECT CASE WHEN random() > 0.5 THEN 'heads'::coin_toss ELSE 'tails'::coin_toss END;
$$ LANGUAGE SQL;

-- `pg` module doesn't support arrays of custom types yet
-- see: https://github.com/brianc/node-postgres/issues/986
-- create function coin_tosses() returns coin_toss[] as $$
-- select array[
--   (case when random() > 0.5 then 'heads'::coin_toss else 'tails'::coin_toss end)
-- , (case when random() > 0.5 then 'heads'::coin_toss else 'tails'::coin_toss end)
-- , (case when random() > 0.5 then 'heads'::coin_toss else 'tails'::coin_toss end)
-- ];
-- $$ language sql;

CREATE DOMAIN email_address AS text CHECK(VALUE SIMILAR TO '[^@]+@[^@]+.[^@]+');

CREATE OR REPLACE FUNCTION get_domain() RETURNS email_address AS $$
SELECT 'example@example.com'::email_address;
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION single_arg(arg int) RETURNS int AS $$
SELECT arg;
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION multi_arg(arg1 int, arg2 int) RETURNS int AS $$
SELECT arg1 + arg2;
$$ LANGUAGE SQL;

CREATE SCHEMA one;

CREATE OR REPLACE FUNCTION one.get_number() RETURNS int AS $$
SELECT 3;
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION one."GetNumber"() RETURNS int AS $$
SELECT 4;
$$ LANGUAGE SQL;
