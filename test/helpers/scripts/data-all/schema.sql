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

create table orders(
  id uuid primary key default gen_random_uuid(),
  product_id int,
  user_id int,
  notes character varying(255),
  ordered_at date default now() not null
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


insert into orders(product_id, user_id, notes)
values (1, 1, 'user 1 ordered product 1'),
  (2, 1, 'user 1 ordered product 2'),
  (4, 1, 'user 1 ordered product 4');

insert into docs(body)
values('{"title":"Document 1","price":22,"description":"lorem ipsum etc","is_good":true,"created_at":"2015-03-04T09:43:41.643Z"}'),
('{"title":"Document 2","price":18,"description":"Macaroni and Cheese","is_good":true,"created_at":"2015-03-04T09:43:41.643Z"}'),
('{"title":"Document 3","price":18,"description":"something or other","is_good":true,"created_at":"2015-03-04T09:43:41.643Z"}'),
('{"title":"Something Else","price":6,"description":"Two buddies fighting crime","is_good":false,"created_at":"1977-03-04T09:43:41.643Z","studios": [{"name" : "Warner"}, {"name" : "Universal"}]}');

insert into uuid_docs(body) values ('{"things": "stuff"}');


create materialized view mv_orders as select * from orders;