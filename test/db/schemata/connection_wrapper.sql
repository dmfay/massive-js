CREATE SCHEMA IF NOT EXISTS public;
drop role if exists massive_users;

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

create sequence products_with_rls_id_seq;
create table products_with_rls(
  id int primary key default nextval('products_with_rls_id_seq'),
  name varchar(50) NOT NULL,
  price decimal(10,2) default 0.00 not null,
  description text,
  in_stock boolean,
  specs jsonb,
  created_at timestamptz default now() not null,
  tags character varying(255)[]
);

create role massive_users;

do $$
begin
  if current_setting('server_version_num')::integer >= 90500 then
    -- Row Level Security requires postgres 9.5+
    execute 'alter table products_with_rls enable row level security';
    execute 'create policy products_allow_user_1 on products_with_rls to massive_users using (current_setting(''claims.user_id'')::integer = 1)';
  end if;
end
$$;

grant usage on schema public to massive_users;
grant select, insert, update on products_with_rls to massive_users;
grant usage, select on sequence products_with_rls_id_seq to massive_users;
