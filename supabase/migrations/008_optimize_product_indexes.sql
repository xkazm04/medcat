-- Migration: 008_optimize_product_indexes.sql
-- Purpose: Optimize indexes for common filter patterns

-- Composite index for category + vendor filtering (most common filter combo)
CREATE INDEX IF NOT EXISTS idx_products_category_vendor
  ON products(emdn_category_id, vendor_id)
  WHERE emdn_category_id IS NOT NULL;

-- Composite index for category + material filtering
CREATE INDEX IF NOT EXISTS idx_products_category_material
  ON products(emdn_category_id, material_id)
  WHERE emdn_category_id IS NOT NULL;

-- Index for price range queries
CREATE INDEX IF NOT EXISTS idx_products_price
  ON products(price)
  WHERE price IS NOT NULL;

-- Composite index for sorted pagination (name is most common sort)
CREATE INDEX IF NOT EXISTS idx_products_name_sorted
  ON products(name, id);

-- Composite index for SKU search + category filter
CREATE INDEX IF NOT EXISTS idx_products_sku_category
  ON products(sku, emdn_category_id);

-- Improve full-text search index (if not exists)
DROP INDEX IF EXISTS idx_products_name;
CREATE INDEX idx_products_fulltext
  ON products USING gin(
    to_tsvector('english',
      COALESCE(name, '') || ' ' ||
      COALESCE(sku, '') || ' ' ||
      COALESCE(description, '') || ' ' ||
      COALESCE(manufacturer_name, '')
    )
  );

-- Index for manufacturer filtering
CREATE INDEX IF NOT EXISTS idx_products_manufacturer
  ON products(manufacturer_name)
  WHERE manufacturer_name IS NOT NULL;

-- Analyze tables to update statistics
ANALYZE products;
ANALYZE emdn_categories;
ANALYZE vendors;
ANALYZE materials;

COMMENT ON INDEX idx_products_category_vendor IS
  'Composite index for filtering by category and vendor simultaneously';
COMMENT ON INDEX idx_products_fulltext IS
  'Full-text search index covering name, SKU, description, and manufacturer';
