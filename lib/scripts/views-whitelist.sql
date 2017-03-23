-- REQUIRES ONE ARGUMENT:
-- $1 must be empty string, or comma-delimited string, or array of string as schema names to INCLUDE.
select * from (
  select schemaname as schema, viewname as name
  from pg_views
  where schemaname <> 'pg_catalog' and schemaname <> 'information_schema'
  union
  select schemaname as schema, matviewname as name
  from pg_matviews
) v
where (
  -- whitelist specific tables, with fully-qualified name (no schema assumes public).
  case when $1 = '' then 1=1
  else replace((v.schema || '.'|| v.name), 'public.', '') like any(string_to_array(replace($1, ' ', ''), ','))
  end
)
order by v.schema, v.name;
