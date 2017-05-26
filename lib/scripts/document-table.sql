CREATE TABLE ${schema~}.${table~}(
  id serial PRIMARY KEY,
  body jsonb NOT NULL,
  search tsvector,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_${index^} ON ${schema~}.${table~} USING GIN(body jsonb_path_ops);
CREATE INDEX idx_search_${index^} ON ${schema~}.${table~} USING GIN(search);
