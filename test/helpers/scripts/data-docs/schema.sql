CREATE SCHEMA public;

create table docs(
  id serial primary key,
  body jsonb not null,
  search tsvector
);

CREATE EXTENSION IF NOT EXISTS pgcrypto;

create table uuid_docs(
  id uuid primary key default gen_random_uuid(),
  body jsonb not null,
  search tsvector
);


insert into uuid_docs(body) values ('{"things": "stuff"}');

insert into docs(body)
values('{"title":"Document 1","price":22,"description":"lorem ipsum etc","is_good":true,"created_at":"2015-03-04T09:43:41.643Z"}'),
('{"title":"Document 2","price":18,"description":"Macaroni and Cheese","is_good":true,"created_at":"2015-03-04T15:43:41.643+06:00"}'),
('{"title":"Document 3","price":18,"description":"something or other","is_good":true,"created_at":"2015-03-04T06:43:41.643-03:00"}'),
('{"title":"Something Else","price":6,"description":"Two buddies fighting crime","is_good":false,"created_at":"1977-03-04T09:43:41.643Z","studios": [{"name" : "Warner"}, {"name" : "Universal"}], "nested": { "id": 1 }}');
