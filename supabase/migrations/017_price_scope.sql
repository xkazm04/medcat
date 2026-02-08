-- Migration: 017_price_scope.sql
-- Proposal 2: Add price_scope column to reference_prices.
--
-- Problem: All SK prices are SET-level (covering complete surgical kits),
-- but products are individual components. The UI needs to distinguish:
--   'set'       — price covers a full kit (hip TEP, knee TEP)
--   'component' — price is for a single part (cup, stem, head, liner)
--   'procedure' — price is for a procedure with implant included
--
-- Populated automatically from component_type.

-- ==========================================================================
-- 1. Add price_scope column
-- ==========================================================================

ALTER TABLE reference_prices
  ADD COLUMN IF NOT EXISTS price_scope TEXT
  CHECK (price_scope IN ('set', 'component', 'procedure'));

COMMENT ON COLUMN reference_prices.price_scope IS
  'What the price covers: set (full kit), component (single part), procedure (implant + surgery)';

CREATE INDEX IF NOT EXISTS idx_refprices_price_scope
  ON reference_prices(price_scope)
  WHERE price_scope IS NOT NULL;

-- ==========================================================================
-- 2. Populate from component_type
-- ==========================================================================

-- Sets and revision sets → 'set'
UPDATE reference_prices
  SET price_scope = 'set'
  WHERE component_type IN ('set', 'revision_set', 'individual_modular')
    AND price_scope IS NULL;

-- Single components → 'component'
UPDATE reference_prices
  SET price_scope = 'component'
  WHERE component_type = 'single_component'
    AND price_scope IS NULL;

-- Fixation devices and arthroscopic → 'procedure' (typically procedure-bundled)
UPDATE reference_prices
  SET price_scope = 'procedure'
  WHERE component_type IN ('fixation_device', 'arthroscopic', 'temporary')
    AND price_scope IS NULL;

-- France LPPR prices are per-component
UPDATE reference_prices
  SET price_scope = 'component'
  WHERE source_country = 'FR'
    AND price_scope IS NULL;

-- Anything remaining without component_type — default to 'set' for SK data
UPDATE reference_prices
  SET price_scope = 'set'
  WHERE source_country = 'SK'
    AND price_scope IS NULL;

-- ==========================================================================
-- 3. Update RPC to include price_scope in return type
-- ==========================================================================

DROP FUNCTION IF EXISTS get_reference_prices(UUID, UUID);

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
  notes TEXT,
  match_type TEXT,
  match_score DECIMAL(3,2),
  match_reason TEXT,
  category_code TEXT,
  category_depth INT,
  price_scope TEXT  -- NEW: set/component/procedure
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_category_id UUID;
  v_category_depth INT;
BEGIN
  -- Resolve the category for the product if not provided
  IF p_emdn_category_id IS NULL AND p_product_id IS NOT NULL THEN
    SELECT p.emdn_category_id INTO v_category_id
    FROM products p WHERE p.id = p_product_id;
  ELSE
    v_category_id := p_emdn_category_id;
  END IF;

  -- Get category depth for ancestor limiting
  IF v_category_id IS NOT NULL THEN
    SELECT ec.depth INTO v_category_depth
    FROM emdn_categories ec WHERE ec.id = v_category_id;
  END IF;

  RETURN QUERY

  -- Priority 1: Product-level AI/rule matches (from product_price_matches)
  SELECT
    rp.id, rp.product_id, rp.emdn_category_id,
    rp.price_original, rp.currency_original, rp.price_eur,
    rp.price_type, rp.source_country, rp.source_name,
    rp.source_url, rp.source_code,
    rp.manufacturer_name, rp.product_family, rp.component_description,
    rp.valid_from, rp.valid_until, rp.extracted_at,
    rp.extraction_method, rp.notes,
    'product_match'::TEXT AS match_type,
    ppm.match_score,
    ppm.match_reason,
    ecc.code AS category_code,
    ecc.depth AS category_depth,
    rp.price_scope
  FROM product_price_matches ppm
  JOIN reference_prices rp ON rp.id = ppm.reference_price_id
  LEFT JOIN emdn_categories ecc ON ecc.id = COALESCE(rp.emdn_leaf_category_id, rp.emdn_category_id)
  WHERE p_product_id IS NOT NULL AND ppm.product_id = p_product_id

  UNION ALL

  -- Priority 2: Direct product_id match on reference_prices
  SELECT
    rp.id, rp.product_id, rp.emdn_category_id,
    rp.price_original, rp.currency_original, rp.price_eur,
    rp.price_type, rp.source_country, rp.source_name,
    rp.source_url, rp.source_code,
    rp.manufacturer_name, rp.product_family, rp.component_description,
    rp.valid_from, rp.valid_until, rp.extracted_at,
    rp.extraction_method, rp.notes,
    'product_direct'::TEXT AS match_type,
    1.0::DECIMAL(3,2) AS match_score,
    'Direct product linkage'::TEXT AS match_reason,
    ecc.code AS category_code,
    ecc.depth AS category_depth,
    rp.price_scope
  FROM reference_prices rp
  LEFT JOIN emdn_categories ecc ON ecc.id = COALESCE(rp.emdn_leaf_category_id, rp.emdn_category_id)
  WHERE p_product_id IS NOT NULL
    AND rp.product_id = p_product_id
    AND NOT EXISTS (
      SELECT 1 FROM product_price_matches ppm
      WHERE ppm.product_id = p_product_id AND ppm.reference_price_id = rp.id
    )

  UNION ALL

  -- Priority 3: Leaf EMDN category match (NO depth limit — leaf IS the precision)
  SELECT
    rp.id, rp.product_id, rp.emdn_category_id,
    rp.price_original, rp.currency_original, rp.price_eur,
    rp.price_type, rp.source_country, rp.source_name,
    rp.source_url, rp.source_code,
    rp.manufacturer_name, rp.product_family, rp.component_description,
    rp.valid_from, rp.valid_until, rp.extracted_at,
    rp.extraction_method, rp.notes,
    'category_leaf'::TEXT AS match_type,
    CASE
      WHEN rp.emdn_leaf_category_id = v_category_id THEN 0.7::DECIMAL(3,2)
      ELSE 0.5::DECIMAL(3,2)
    END AS match_score,
    'Leaf EMDN category match'::TEXT AS match_reason,
    ecc.code AS category_code,
    ecc.depth AS category_depth,
    rp.price_scope
  FROM reference_prices rp
  LEFT JOIN emdn_categories ecc ON ecc.id = rp.emdn_leaf_category_id
  WHERE v_category_id IS NOT NULL
    AND rp.emdn_leaf_category_id IS NOT NULL
    AND rp.emdn_leaf_category_id IN (
      SELECT get_category_ancestors(v_category_id)
    )
    -- Exclude already matched via product_price_matches
    AND (p_product_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM product_price_matches ppm
      WHERE ppm.product_id = p_product_id AND ppm.reference_price_id = rp.id
    ))

  UNION ALL

  -- Priority 4: Broad category match (with depth limit to prevent worst pollution)
  SELECT
    rp.id, rp.product_id, rp.emdn_category_id,
    rp.price_original, rp.currency_original, rp.price_eur,
    rp.price_type, rp.source_country, rp.source_name,
    rp.source_url, rp.source_code,
    rp.manufacturer_name, rp.product_family, rp.component_description,
    rp.valid_from, rp.valid_until, rp.extracted_at,
    rp.extraction_method, rp.notes,
    CASE
      WHEN rp.emdn_category_id = v_category_id THEN 'category_exact'
      ELSE 'category_ancestor'
    END::TEXT AS match_type,
    CASE
      WHEN rp.emdn_category_id = v_category_id THEN 0.4::DECIMAL(3,2)
      ELSE 0.2::DECIMAL(3,2)
    END AS match_score,
    CASE
      WHEN rp.emdn_category_id = v_category_id THEN 'Exact EMDN category'
      ELSE 'Ancestor EMDN category (broad match)'
    END::TEXT AS match_reason,
    ecc.code AS category_code,
    ecc.depth AS category_depth,
    rp.price_scope
  FROM reference_prices rp
  LEFT JOIN emdn_categories ecc ON ecc.id = rp.emdn_category_id
  WHERE v_category_id IS NOT NULL
    AND rp.emdn_leaf_category_id IS NULL  -- Only prices without leaf mapping
    AND rp.emdn_category_id IN (
      SELECT get_category_ancestors(v_category_id)
    )
    -- Depth limit: max 3 levels up from product category
    AND ecc.depth >= GREATEST(1, COALESCE(v_category_depth, 1) - 3)
    -- Exclude already matched
    AND (p_product_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM product_price_matches ppm
      WHERE ppm.product_id = p_product_id AND ppm.reference_price_id = rp.id
    ))

  ORDER BY match_score DESC, price_eur ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_reference_prices TO anon, authenticated;
