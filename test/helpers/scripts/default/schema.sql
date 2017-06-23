CREATE SCHEMA public;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

create table "Users"(
  "Id" serial primary key,
  "Email" varchar(50) not null,
  "Name" varchar(50) not null,
  search tsvector
);

create table products(
  id serial primary key,
  name varchar(50) NOT NULL,
  price decimal(10,2) default 0.00 not null,
  description text,
  in_stock boolean,
  specs jsonb,
  created_at timestamptz default now() not null,
  tags character varying(255)[]
);

create table docs(
  id serial primary key,
  body jsonb not null,
  search tsvector
);

create table uuid_docs(
  id uuid primary key default gen_random_uuid(),
  body jsonb not null,
  search tsvector
);

create table orders(
  id uuid primary key default gen_random_uuid(),
  product_id int,
  user_id int,
  notes character varying(255),
  ordered_at date default now() not null
);

create view popular_products as
  select p.id, p.name, p.price, count(*) as ordered
  from products p
  join orders o on o.product_id = p.id
  group by p.id, p.name, p.price
  order by ordered desc;

insert into "Users"("Email", "Name")
values('test@test.com', 'A test user');

insert into products(name, price, description, specs, tags, in_stock)
values ('Product 1', 12.00, 'Product 1 description', null, null, true),
('Product 2', 24.00, 'Product 2 description', '{"weight": 20, "dimensions": {"length": 15, "width": 12}}', '{tag1,tag2}', true),
('Product 3', 35.00, 'Product 3 description', '{"weight": 30, "sizes": [10, 15, 20]}', '{tag2,tag3}', false),
('Product 4', 40.00, 'Product 4 description', '["why", "not", "have", "an", "array"]', '{tag4,tag''quote,"tag,comma","tag{brace}"}', false);

insert into docs(body)
values('{"title":"Document 1","price":22,"description":"lorem ipsum etc","is_good":true,"created_at":"2015-03-04T09:43:41.643Z"}'),
('{"title":"Document 2","price":18,"description":"Macaroni and Cheese","is_good":true,"created_at":"2015-03-04T09:43:41.643Z"}'),
('{"title":"Document 3","price":18,"description":"something or other","is_good":true,"created_at":"2015-03-04T09:43:41.643Z"}'),
('{"title":"Something Else","price":6,"description":"Two buddies fighting crime","is_good":false,"created_at":"1977-03-04T09:43:41.643Z","studios": [{"name" : "Warner"}, {"name" : "Universal"}]}');

insert into uuid_docs(body) values ('{"things": "stuff"}');

insert into orders(product_id, user_id, notes)
values (1, 1, 'user 1 ordered product 1'),
  (2, 1, 'user 1 ordered product 2'),
  (4, 1, 'user 1 ordered product 4');

create materialized view mv_orders as select * from orders;

create schema myschema;

-- Added for testing filtering on load:

create schema secrets;
create table secrets.__secret_table (id serial primary key, secret_stuff text);
create table secrets.__semi_secret_table (id serial primary key, semi_secret_stuff text);

create table myschema.artists (
  id serial primary key,
  name text
);

create table myschema.albums (
  id serial primary key,
  title text,
  artist_id integer
);

-- duplicate name of public docs is intentional - let's make sure it works the way a schema is supposed to:
create table myschema.docs(
  id serial primary key,
  body jsonb not null,
  search tsvector
);

create view myschema.top_artists as
  select a.id, a.name, count(*) as albums
  from myschema.artists a
  left outer join myschema.albums b on b.artist_id = a.id
  group by a.id, a.name
  order by albums desc;

insert into myschema.artists(name)
values ('AC/DC'), ('Bauhaus'), ('Sex Pistols');

insert into myschema.albums(artist_id, title)
values (1, 'Power Age'),
(2, 'Press Eject and Give Me the Tape'),
(3, 'Never Mind the Bullocks');

insert into myschema.docs(body)
values('{"title":"Document 1","price":22,"description":"lorem ipsum etc","is_good":true,"created_at":"2015-03-04T09:43:41.643Z"}'),
('{"title":"Document 2","price":18,"description":"Macaroni and Cheese","is_good":true,"created_at":"2015-03-04T09:43:41.643Z"}'),
('{"title":"Document 3","price":6,"description":"Two buddies fighting crime","is_good":false,"created_at":"1977-03-04T09:43:41.643Z","studios": [{"name" : "Warner"}, {"name" : "Universal"}]}');

create or replace function all_products()
returns setof products
as
$$
select * from products;
$$
language sql;

create or replace function myschema.all_albums()
returns setof myschema.albums
as
$$
select * from myschema.albums;
$$
language sql;

create or replace function myschema.artist_by_name(find_name varchar(50))
returns setof myschema.artists
as
$$
select * from myschema.artists where name=find_name;
$$
language sql;

-- Create some camel-cased functions to test name escapes:
create or replace function "AllMyProducts"()
returns setof products
as
$$
select * from products;
$$
language sql;

create or replace function myschema."AllMyAlbums"()
returns setof myschema.albums
as
$$
select * from myschema.albums;
$$
language sql;
