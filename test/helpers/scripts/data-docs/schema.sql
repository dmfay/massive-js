CREATE SCHEMA public;

CREATE TABLE docs(
  id serial PRIMARY KEY,
  body jsonb NOT NULL,
  search tsvector,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE OR REPLACE FUNCTION massive_document_inserted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY definer
AS $$
BEGIN
  NEW.search = to_tsvector(NEW.body::text);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION massive_document_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY definer
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.search = to_tsvector(NEW.body::text);
  RETURN NEW;
END;
$$;

CREATE TRIGGER public_docs_inserted
BEFORE INSERT ON public.docs
FOR EACH ROW EXECUTE PROCEDURE massive_document_inserted();

CREATE TRIGGER public_docs_updated
BEFORE UPDATE ON public.docs
FOR EACH ROW EXECUTE PROCEDURE massive_document_updated();

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE uuid_docs(
  id uuid PRIMARY KEY default gen_random_uuid(),
  body jsonb NOT NULL,
  search tsvector,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE TRIGGER public_uuid_docs_inserted
BEFORE INSERT ON public.uuid_docs
FOR EACH ROW EXECUTE PROCEDURE massive_document_inserted();

CREATE TRIGGER public_uuid_docs_updated
BEFORE UPDATE ON public.uuid_docs
FOR EACH ROW EXECUTE PROCEDURE massive_document_updated();

INSERT INTO uuid_docs(body) VALUES ('{"things": "stuff"}');

ALTER TABLE docs ADD COLUMN is_available BOOLEAN NOT NULL DEFAULT TRUE;

INSERT INTO docs(body)
VALUES('{"title":"Document 1","price":22,"description":"lorem ipsum etc","is_good":true,"created_at":"2015-03-04T09:43:41.643Z"}'),
('{"title":"Document 2","price":18,"description":"Macaroni and Cheese","is_good":true,"created_at":"2015-03-04T15:43:41.643+06:00"}'),
('{"title":"Document 3","price":18,"description":"something or other","is_good":true,"created_at":"2015-03-04T06:43:41.643-03:00"}'),
('{"title":"Something Else","price":6,"description":"Two buddies fighting crime","is_good":false,"created_at":"1977-03-04T09:43:41.643Z","studios": [{"name" : "Warner"}, {"name" : "Universal"}], "nested": { "id": 1 }}');

UPDATE docs SET is_available = FALSE WHERE id = 3;
