-- Load non-pk sequences.

SELECT
  s.sequence_schema AS schema,
  s.sequence_name AS name
FROM information_schema.sequences AS s
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_class AS c
  JOIN pg_attribute AS a ON a.attrelid = c.oid
  JOIN pg_constraint AS pks ON pks.conrelid = c.oid
  JOIN information_schema._pg_expandarray(pks.conkey) AS ordinals ON ordinals.n = a.attnum
  JOIN pg_attrdef AS ad ON ad.adrelid = c.oid AND ad.adnum = a.attnum
  WHERE pg_get_expr(ad.adbin, ad.adrelid) = 'nextval(''' || s.sequence_name || '''::regclass)'
    OR pg_get_expr(ad.adbin, ad.adrelid) = 'nextval(''"' || s.sequence_name || '"''::regclass)' -- casing!
);
