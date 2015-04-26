drop table if exists "Users";
drop table if exists products cascade;
drop table if exists docs;


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
  created_at timestamptz default now() not null
);

create table docs(
  id serial primary key,
  body jsonb not null,
  search tsvector
);



insert into "Users"("Email", "Name")
values('test@test.com', 'A test user');

insert into products(name, price, description, in_stock)
values ('Product 1', 12.00, 'Product 1 description', true),
('Product 2', 24.00, 'Product 2 description', true),
('Product 3', 35.00, 'Product 3 description', false);

insert into docs(body) 
values('{"title":"A Document","price":22,"description":"lorem ipsum etc","is_good":true,"created_at":"2015-03-04T09:43:41.643Z"}'),
('{"title":"Another Document","price":18,"description":"Macaroni and Cheese","is_good":true,"created_at":"2015-03-04T09:43:41.643Z"}'),
('{"title":"Starsky and Hutch","price":6,"description":"Two buddies fighting crime","is_good":false,"created_at":"1977-03-04T09:43:41.643Z","studios": [{"name" : "Warner"}, {"name" : "Universal"}]}');



-- schema stuff:
drop table if exists myschema.artists cascade;
drop table if exists myschema.albums cascade; -- drops functions too
drop table if exists myschema.docs;

-- just in case:
drop table if exists myschema.doggies;
drop schema if exists myschema;

create schema myschema;

-- Added for testing filtering on load:

drop table if exists secrets.__secret_table cascade;
drop table if exists secrets.__semi_secret_table cascade; 
drop schema if exists secrets;

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

insert into myschema.artists(name)
values ('AC/DC'), ('Bauhaus'), ('Sex Pistols');

insert into myschema.albums(artist_id, title)
values (1, 'Power Age'), 
(2, 'Press Eject and Give Me the Tape'), 
(3, 'Never Mind the Bullocks');

insert into myschema.docs(body) 
values('{"title":"A Document","price":22,"description":"lorem ipsum etc","is_good":true,"created_at":"2015-03-04T09:43:41.643Z"}'),
('{"title":"Another Document","price":18,"description":"Macaroni and Cheese","is_good":true,"created_at":"2015-03-04T09:43:41.643Z"}'),
('{"title":"Starsky and Hutch","price":6,"description":"Two buddies fighting crime","is_good":false,"created_at":"1977-03-04T09:43:41.643Z","studios": [{"name" : "Warner"}, {"name" : "Universal"}]}');


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




