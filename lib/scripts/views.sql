-- REQUIRES THREE ARGUMENTS:
-- $1, $2, $2 all must be empty string, or comma-delimited string, or array of string:
select * from (
  select schemaname as schema, viewname as name
  from pg_views
  where schemaname <> 'pg_catalog' and schemaname <> 'information_schema'
  union
  select schemaname as schema, matviewname as name
  from pg_matviews
) v where (
      (case -- allow specific schemas (none or '' assumes all):
        when $1 ='' then 1=1
        else v.schema = any(string_to_array(replace($1, ' ', ''), ',')) end)
      and
      (case -- blacklist tables using LIKE by fully-qualified name (no schema assumes public):
        when $2 = '' then 1=1
        else replace((v.schema || '.'|| v.name), 'public.', '') not like all(string_to_array(replace($2, ' ', ''), ',')) end)
    ) or (
      case -- make exceptions for specific tables, with fully-qualified name or wildcard pattern (no schema assumes public).
        when $3 = '' then 1=0
        -- Below can use '%' as wildcard. Change 'like' to '=' to require exact names:
        else replace((v.schema || '.'|| v.name), 'public.', '') like any(string_to_array(replace($3, ' ', ''), ',')) end
    )
order by v.schema,
         v.name;
