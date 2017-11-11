CREATE SCHEMA public;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE products(
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
  description TEXT,
  in_stock BOOLEAN,
  specs JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  tags CHARACTER VARYING(255)[]
);

CREATE TABLE orders(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INT,
  user_id INT,
  notes CHARACTER VARYING(255),
  ordered_at DATE DEFAULT now() NOT NULL
);

INSERT INTO products(name, price, description, specs, tags, in_stock)
VALUES ('Product 1', 12.00, 'Product 1 description', NULL, NULL, TRUE),
('Product 2', 24.00, 'Product 2 description', '{"weight": 20, "dimensions": {"length": 15, "width": 12}}', '{tag1,tag2}', TRUE),
('Product 3', 35.00, 'Product 3 description', '{"weight": 30, "sizes": [10, 15, 20]}', '{tag2,tag3}', FALSE),
('Product 4', 40.00, 'Product 4 description', '["why", "not", "have", "an", "array"]', '{tag4,tag''quote,"tag,comma","tag{brace}"}', FALSE);

INSERT INTO orders(product_id, user_id, notes)
VALUES (1, 1, 'user 1 ordered product 1'),
  (2, 1, 'user 1 ordered product 2'),
  (4, 1, 'user 1 ordered product 4');
