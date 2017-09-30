CREATE SCHEMA public;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

create view popular_products as
  select p.id, p.name, p.price, count(*) as ordered
  from products p
  join orders o on o.product_id = p.id
  group by p.id, p.name, p.price
  order by ordered desc;