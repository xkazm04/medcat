-- Migration: 021_vendor_neutral_rpcs.sql
-- Purpose: Rewrite similarity and price comparison RPCs
-- to use product_offerings instead of products.price/vendor_id.

-- 1. Rewrite find_similar_products()
-- Now returns manufacturer info + offering aggregates instead of single price/vendor
DROP FUNCTION IF EXISTS find_similar_products(TEXT, TEXT, REAL, INT);

CREATE OR REPLACE FUNCTION find_similar_products(
  search_name TEXT,
  search_sku TEXT DEFAULT NULL,
  similarity_threshold REAL DEFAULT 0.3,
  max_results INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  sku TEXT,
  manufacturer_name TEXT,
  manufacturer_sku TEXT,
  emdn_category_id UUID,
  name_similarity REAL,
  sku_similarity REAL,
  offering_count INT,
  min_price DECIMAL(10,2),
  max_price DECIMAL(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.sku,
    p.manufacturer_name,
    p.manufacturer_sku,
    p.emdn_category_id,
    similarity(LOWER(p.name), LOWER(search_name)) AS name_similarity,
    CASE
      WHEN search_sku IS NOT NULL AND search_sku != ''
      THEN similarity(LOWER(p.sku), LOWER(search_sku))
      ELSE 0.0::REAL
    END AS sku_similarity,
    COALESCE((SELECT COUNT(*)::INT FROM product_offerings po WHERE po.product_id = p.id), 0) AS offering_count,
    (SELECT MIN(po.vendor_price) FROM product_offerings po WHERE po.product_id = p.id) AS min_price,
    (SELECT MAX(po.vendor_price) FROM product_offerings po WHERE po.product_id = p.id) AS max_price
  FROM products p
  WHERE
    similarity(LOWER(p.name), LOWER(search_name)) > similarity_threshold
    OR (
      search_sku IS NOT NULL
      AND search_sku != ''
      AND similarity(LOWER(p.sku), LOWER(search_sku)) > 0.8
    )
  ORDER BY
    GREATEST(
      similarity(LOWER(p.name), LOWER(search_name)),
      CASE
        WHEN search_sku IS NOT NULL AND search_sku != ''
        THEN similarity(LOWER(p.sku), LOWER(search_sku))
        ELSE 0.0::REAL
      END
    ) DESC
  LIMIT max_results;
END;
$$;

GRANT EXECUTE ON FUNCTION find_similar_products TO anon, authenticated;

-- 2. Rewrite get_product_price_comparison()
-- Now returns offerings for a given product (vendor details per offering)
DROP FUNCTION IF EXISTS get_product_price_comparison(UUID, REAL);

CREATE OR REPLACE FUNCTION get_product_price_comparison(
  p_product_id UUID
)
RETURNS TABLE (
  offering_id UUID,
  vendor_id UUID,
  vendor_name TEXT,
  vendor_sku TEXT,
  vendor_price DECIMAL(10,2),
  currency TEXT,
  is_primary BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    po.id AS offering_id,
    po.vendor_id,
    v.name AS vendor_name,
    po.vendor_sku,
    po.vendor_price,
    po.currency,
    po.is_primary
  FROM product_offerings po
  JOIN vendors v ON po.vendor_id = v.id
  WHERE po.product_id = p_product_id
  ORDER BY po.vendor_price ASC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION get_product_price_comparison TO anon, authenticated;
