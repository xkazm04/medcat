-- Migration: 015_pricing_precision.sql
-- Purpose: Add component-type classification, XC subcode tracking, and
--          product-level price matching for precision reference pricing.
--
-- Problem: All 845 reference prices are category-level only (product_id=NULL),
--          mapped at EMDN depth 2. The ancestor-walking RPC returns ALL hip
--          prices (€168–€19,845) for any hip component — a 118x range.
--
-- Solution: Classify prices by component_type + XC subcode, enable leaf-level
--           EMDN mapping, and introduce scored product↔price matches.

-- ==========================================================================
-- 1. New columns on reference_prices
-- ==========================================================================

-- Component type classification derived from XC subcodes
ALTER TABLE reference_prices
  ADD COLUMN IF NOT EXISTS component_type TEXT;

COMMENT ON COLUMN reference_prices.component_type IS
  'Classification: single_component, set, revision_set, individual_modular, system, fixation_device';

-- Original XC subcode (e.g. XC1.1, XC2.5) for traceability
ALTER TABLE reference_prices
  ADD COLUMN IF NOT EXISTS xc_subcode TEXT;

COMMENT ON COLUMN reference_prices.xc_subcode IS
  'Original Slovak XC classification subcode parsed from source_code';

-- More granular EMDN mapping (depth 3-6 instead of depth 2)
ALTER TABLE reference_prices
  ADD COLUMN IF NOT EXISTS emdn_leaf_category_id UUID REFERENCES emdn_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_refprices_emdn_leaf
  ON reference_prices(emdn_leaf_category_id)
  WHERE emdn_leaf_category_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_refprices_component_type
  ON reference_prices(component_type)
  WHERE component_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_refprices_xc_subcode
  ON reference_prices(xc_subcode)
  WHERE xc_subcode IS NOT NULL;

-- ==========================================================================
-- 2. Product-level price match table
-- ==========================================================================

CREATE TABLE IF NOT EXISTS product_price_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reference_price_id UUID NOT NULL REFERENCES reference_prices(id) ON DELETE CASCADE,

  -- Match quality
  match_score DECIMAL(3,2) NOT NULL CHECK (match_score >= 0 AND match_score <= 1),
  match_reason TEXT,  -- Human-readable explanation
  match_method TEXT NOT NULL,  -- 'rule', 'ai', 'manual'

  -- Timestamps
  matched_at TIMESTAMPTZ DEFAULT now(),

  -- Prevent duplicate matches
  UNIQUE(product_id, reference_price_id)
);

CREATE INDEX idx_ppm_product ON product_price_matches(product_id);
CREATE INDEX idx_ppm_reference_price ON product_price_matches(reference_price_id);
CREATE INDEX idx_ppm_score ON product_price_matches(match_score DESC);

-- RLS: public read
ALTER TABLE product_price_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read product_price_matches"
  ON product_price_matches FOR SELECT USING (true);

-- ==========================================================================
-- 3. Replace get_reference_prices with precision-aware version
-- ==========================================================================

-- Must drop old function first because return type changes (adding new columns)
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
  category_depth INT
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
    SELECT emdn_category_id INTO v_category_id
    FROM products WHERE products.id = p_product_id;
  ELSE
    v_category_id := p_emdn_category_id;
  END IF;

  -- Get category depth for ancestor limiting
  IF v_category_id IS NOT NULL THEN
    SELECT depth INTO v_category_depth
    FROM emdn_categories WHERE emdn_categories.id = v_category_id;
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
    ec.code AS category_code,
    ec.depth AS category_depth
  FROM product_price_matches ppm
  JOIN reference_prices rp ON rp.id = ppm.reference_price_id
  LEFT JOIN emdn_categories ec ON ec.id = COALESCE(rp.emdn_leaf_category_id, rp.emdn_category_id)
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
    ec.code AS category_code,
    ec.depth AS category_depth
  FROM reference_prices rp
  LEFT JOIN emdn_categories ec ON ec.id = COALESCE(rp.emdn_leaf_category_id, rp.emdn_category_id)
  WHERE p_product_id IS NOT NULL
    AND rp.product_id = p_product_id
    -- Exclude those already in product_price_matches to avoid duplicates
    AND NOT EXISTS (
      SELECT 1 FROM product_price_matches ppm
      WHERE ppm.product_id = p_product_id AND ppm.reference_price_id = rp.id
    )

  UNION ALL

  -- Priority 3: Leaf EMDN category match (depth 3+)
  SELECT
    rp.id, rp.product_id, rp.emdn_category_id,
    rp.price_original, rp.currency_original, rp.price_eur,
    rp.price_type, rp.source_country, rp.source_name,
    rp.source_url, rp.source_code,
    rp.manufacturer_name, rp.product_family, rp.component_description,
    rp.valid_from, rp.valid_until, rp.extracted_at,
    rp.extraction_method, rp.notes,
    'category_leaf'::TEXT AS match_type,
    0.6::DECIMAL(3,2) AS match_score,
    'Leaf EMDN category match'::TEXT AS match_reason,
    ec.code AS category_code,
    ec.depth AS category_depth
  FROM reference_prices rp
  LEFT JOIN emdn_categories ec ON ec.id = rp.emdn_leaf_category_id
  WHERE v_category_id IS NOT NULL
    AND rp.emdn_leaf_category_id IS NOT NULL
    AND rp.emdn_leaf_category_id IN (
      SELECT get_category_ancestors(v_category_id)
    )
    -- Only match within 2 depth levels
    AND ec.depth >= GREATEST(1, COALESCE(v_category_depth, 1) - 2)
    -- Exclude already matched
    AND (p_product_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM product_price_matches ppm
      WHERE ppm.product_id = p_product_id AND ppm.reference_price_id = rp.id
    ))

  UNION ALL

  -- Priority 4: Original EMDN category match (limited to ±2 depth levels)
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
      WHEN rp.emdn_category_id = v_category_id THEN 0.5::DECIMAL(3,2)
      ELSE 0.3::DECIMAL(3,2)
    END AS match_score,
    CASE
      WHEN rp.emdn_category_id = v_category_id THEN 'Exact EMDN category'
      ELSE 'Ancestor EMDN category (broad)'
    END::TEXT AS match_reason,
    ec.code AS category_code,
    ec.depth AS category_depth
  FROM reference_prices rp
  LEFT JOIN emdn_categories ec ON ec.id = rp.emdn_category_id
  WHERE v_category_id IS NOT NULL
    AND rp.emdn_leaf_category_id IS NULL  -- Only fallback when no leaf mapping
    AND rp.emdn_category_id IN (
      SELECT get_category_ancestors(v_category_id)
    )
    -- Limit ancestor walking: max 2 depth levels up from product category
    AND ec.depth >= GREATEST(1, COALESCE(v_category_depth, 1) - 2)
    -- Exclude already matched
    AND (p_product_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM product_price_matches ppm
      WHERE ppm.product_id = p_product_id AND ppm.reference_price_id = rp.id
    ))

  ORDER BY match_score DESC, price_eur ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_reference_prices TO anon, authenticated;

-- ==========================================================================
-- 4. Write policy for product_price_matches (service role managed)
-- ==========================================================================

CREATE POLICY "Service role write product_price_matches"
  ON product_price_matches FOR ALL
  USING (true)
  WITH CHECK (true);
