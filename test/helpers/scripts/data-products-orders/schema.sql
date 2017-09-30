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


insert into products(name, price, description, specs, tags, in_stock)
values ('Product 1', 12.00, 'Product 1 description', null, null, true),
('Product 2', 24.00, 'Product 2 description', '{"weight": 20, "dimensions": {"length": 15, "width": 12}}', '{tag1,tag2}', true),
('Product 3', 35.00, 'Product 3 description', '{"weight": 30, "sizes": [10, 15, 20]}', '{tag2,tag3}', false),
('Product 4', 40.00, 'Product 4 description', '["why", "not", "have", "an", "array"]', '{tag4,tag''quote,"tag,comma","tag{brace}"}', false);


insert into orders(product_id, user_id, notes)
values (1, 1, 'user 1 ordered product 1'),
  (2, 1, 'user 1 ordered product 2'),
  (4, 1, 'user 1 ordered product 4');