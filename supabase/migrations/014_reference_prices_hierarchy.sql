-- Migration: 014_reference_prices_hierarchy.sql
-- Purpose: Make reference price lookups EMDN-hierarchy-aware.
-- Products at subcategory level (e.g. P090804) should also find
-- reference prices stored at parent level (e.g. P0908).

-- Helper: get ancestor category IDs by walking up parent_id chain
CREATE OR REPLACE FUNCTION get_category_ancestors(p_category_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_id UUID := p_category_id;
  current_parent UUID;
BEGIN
  -- Return the category itself first
  RETURN NEXT current_id;

  -- Walk up the parent chain
  LOOP
    SELECT parent_id INTO current_parent
    FROM emdn_categories
    WHERE id = current_id;

    EXIT WHEN current_parent IS NULL;
    RETURN NEXT current_parent;
    current_id := current_parent;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION get_category_ancestors TO anon, authenticated;

-- Replace get_reference_prices with hierarchy-aware version
CREATE OR REPLACE FUNCTION get_reference_prices(
  p_product_id UUID DEFAULT NULL,
  p_emdn_category_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  product_id UUID,
  emdn_category_id UUID,
  price_original DECIMAL(12,2),
  currency_original CHAR(3),
  price_eur DECIMAL(12,2),
  price_type TEXT,
  source_country CHAR(2),
  source_name TEXT,
  source_url TEXT,
  source_code TEXT,
  manufacturer_name TEXT,
  product_family TEXT,
  component_description TEXT,
  valid_from DATE,
  valid_until DATE,
  extracted_at TIMESTAMPTZ,
  extraction_method TEXT,
  notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rp.id, rp.product_id, rp.emdn_category_id,
    rp.price_original, rp.currency_original, rp.price_eur,
    rp.price_type, rp.source_country, rp.source_name,
    rp.source_url, rp.source_code,
    rp.manufacturer_name, rp.product_family, rp.component_description,
    rp.valid_from, rp.valid_until, rp.extracted_at,
    rp.extraction_method, rp.notes
  FROM reference_prices rp
  WHERE
    -- Direct product match
    (p_product_id IS NOT NULL AND rp.product_id = p_product_id)
    OR
    -- Category match: exact category OR any ancestor category
    (p_emdn_category_id IS NOT NULL AND rp.emdn_category_id IN (
      SELECT get_category_ancestors(p_emdn_category_id)
    ))
  ORDER BY rp.price_eur ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_reference_prices TO anon, authenticated;
