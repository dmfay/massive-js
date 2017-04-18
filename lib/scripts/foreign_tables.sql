-- REQUIRES THREE ARGUMENTS:
-- $1, $2, $2 all must be empty string, or comma-delimited string, or array of string:
select table_schema as schema, table_name as name, is_insertable_into
from information_schema.tables
where table_type = 'FOREIGN TABLE'
  and (((
      -- allow specific schemas (none or '' assumes all):
      case when $1 ='' then 1=1
      else table_schema = any(string_to_array(replace($1, ' ', ''), ','))
      end
    ) and (
      -- blacklist tables using LIKE by fully-qualified name (no schema assumes public):
      case when $2 = '' then 1=1
      else replace((table_schema || '.'|| table_name), 'public.', '') not like all(string_to_array(replace($2, ' ', ''), ','))
      end
  )) or (
  -- make exceptions for specific tables, with fully-qualified name or wildcard pattern (no schema assumes public).
    case when $3 = '' then 1=0
      -- Below can use '%' as wildcard. Change 'like' to '=' to require exact names:
    else replace((table_schema || '.'|| table_name), 'public.', '') like any(string_to_array(replace($3, ' ', ''), ','))
    end
  ))
order by table_schema, table_name;

