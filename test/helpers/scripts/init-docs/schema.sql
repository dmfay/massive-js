CREATE SCHEMA public;

create table docs(
  id serial primary key,
  body jsonb not null,
  search tsvector
);


create schema myschema;


-- duplicate name of public docs is intentional - let's make sure it works the way a schema is supposed to:
create table myschema.docs(
  id serial primary key,
  body jsonb not null,
  search tsvector
);