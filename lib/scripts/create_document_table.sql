create table %s(
  id serial primary key,
  body jsonb not null,
  search tsvector,
  created_at timestamptz default now()
);
create index idx_%s on %s using GIN(body jsonb_path_ops); 
create index idx_search_%s on %s using GIN(search); 