-- Migration: 013_reference_prices.sql
-- Purpose: Multi-source reference pricing from EU registries, tenders, and reimbursement lists

CREATE TABLE reference_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Linkage: at least one must be non-null
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  emdn_category_id UUID REFERENCES emdn_categories(id) ON DELETE SET NULL,

  -- Price data (original currency + EUR conversion)
  price_original DECIMAL(12,2) NOT NULL,
  currency_original CHAR(3) NOT NULL,   -- ISO 4217 (EUR, CZK, PLN, HUF, GBP, INR)
  price_eur DECIMAL(12,2) NOT NULL,

  -- Classification
  price_type TEXT NOT NULL,  -- 'reimbursement_ceiling', 'tender_unit', 'catalog_list', 'reference'

  -- Source identification
  source_country CHAR(2) NOT NULL,  -- ISO 3166 alpha-2
  source_name TEXT NOT NULL,         -- 'LPPR', 'MZ SR Kategorizacia', 'CZ Tender', 'TED'
  source_url TEXT,
  source_code TEXT,                  -- LPP code, XC2 code, CPV code, tender reference

  -- Product context (for category-level prices that describe a component)
  manufacturer_name TEXT,
  product_family TEXT,
  component_description TEXT,

  -- Validity
  valid_from DATE,
  valid_until DATE,

  -- Metadata
  extracted_at TIMESTAMPTZ DEFAULT now(),
  extraction_method TEXT,  -- 'manual', 'ai_extraction', 'scraper'
  notes TEXT,

  -- Constraint: at least one linkage must exist
  CONSTRAINT reference_prices_linkage_check
    CHECK (product_id IS NOT NULL OR emdn_category_id IS NOT NULL)
);

-- Indexes
CREATE INDEX idx_refprices_product ON reference_prices(product_id)
  WHERE product_id IS NOT NULL;
CREATE INDEX idx_refprices_emdn ON reference_prices(emdn_category_id)
  WHERE emdn_category_id IS NOT NULL;
CREATE INDEX idx_refprices_country ON reference_prices(source_country);
CREATE INDEX idx_refprices_emdn_country ON reference_prices(emdn_category_id, source_country)
  WHERE emdn_category_id IS NOT NULL;

-- RLS: public SELECT only (data managed via service role scripts)
ALTER TABLE reference_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read reference_prices" ON reference_prices FOR SELECT USING (true);

-- RPC function: get reference prices for a product (direct + category match)
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
    (p_product_id IS NOT NULL AND rp.product_id = p_product_id)
    OR
    (p_emdn_category_id IS NOT NULL AND rp.emdn_category_id = p_emdn_category_id)
  ORDER BY rp.price_eur ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_reference_prices TO anon, authenticated;
