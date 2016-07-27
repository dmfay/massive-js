-- Include and/or exclude functions with a name matching the string pattern passed in (i.e. "pg_%")
-- inclusion/exclusion is schema - aspecific, no schema assumes 'public'
select distinct
    n.nspname as "schema",
    (not p.proretset) as "return_single_row",
    (t.typtype in ('b', 'd', 'e', 'r')) as "return_single_value",
    p.proname as "name",
    p.pronargs as param_count
from pg_proc p
     inner join pg_namespace n on (p.pronamespace = n.oid)
     inner join pg_type t on (p.prorettype = t.oid)
where n.nspname not in ('pg_catalog','information_schema')
  and n.nspname NOT LIKE 'pgp%'
  and (case -- blacklist functions using LIKE by fully-qualified name (no schema assumes public):
            when $1 = '' then 1=1
            else replace((n.nspname || '.'|| p.proname), 'public.', '')  not like all(string_to_array(replace($1, ' ', ''), ','))
       end)
  and (case -- whitelist functions using LIKE by fully-qualified name (no schema assumes public):
            when $2 = '' then 1=1
            else replace((n.nspname || '.'|| p.proname), 'public.', '') like any(string_to_array(replace($2, ' ', ''), ','))
       end)
order by n.nspname, p.proname;
