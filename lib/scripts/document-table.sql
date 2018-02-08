CREATE TABLE ${schema~}.${table~}(
  id serial PRIMARY KEY,
  body jsonb NOT NULL,
  search tsvector,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_${index^} ON ${schema~}.${table~} USING GIN(body jsonb_path_ops);
CREATE INDEX idx_search_${index^} ON ${schema~}.${table~} USING GIN(search);

COMMENT ON TABLE ${schema~}.${table~} IS 'A document table generated with Massive.js.';
COMMENT ON COLUMN ${schema~}.${table~}.id IS 'The document primary key. Will be added to the body when retrieved using Massive document functions';
COMMENT ON COLUMN ${schema~}.${table~}.body IS 'The document body, stored without primary key.';
COMMENT ON COLUMN ${schema~}.${table~}.search IS 'Search vector for full-text search support.';
COMMENT ON COLUMN ${schema~}.${table~}.created_at IS 'Timestamp for document creation.';
