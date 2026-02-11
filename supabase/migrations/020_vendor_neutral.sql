-- Migration: 020_vendor_neutral.sql
-- Purpose: Transform catalog to vendor-neutral model.
-- Products become canonical items identified by (manufacturer_name, manufacturer_sku).
-- Vendor/distributor relationships move to product_offerings junction table.

-- 1. Create product_offerings junction table
CREATE TABLE product_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  vendor_sku TEXT,
  vendor_price DECIMAL(10,2),
  currency TEXT DEFAULT 'EUR',
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, vendor_id)
);

-- 2. Enable RLS on product_offerings
ALTER TABLE product_offerings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read product_offerings" ON product_offerings FOR SELECT USING (true);
CREATE POLICY "Public insert product_offerings" ON product_offerings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update product_offerings" ON product_offerings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete product_offerings" ON product_offerings FOR DELETE USING (true);

-- 3. Migrate existing vendor+price data to offerings
-- Each product with a vendor_id gets an offering row
INSERT INTO product_offerings (product_id, vendor_id, vendor_sku, vendor_price, is_primary)
SELECT id, vendor_id, sku, price, true
FROM products
WHERE vendor_id IS NOT NULL;

-- 4. Indexes for efficient queries
CREATE INDEX idx_offerings_product ON product_offerings(product_id);
CREATE INDEX idx_offerings_vendor ON product_offerings(vendor_id);
CREATE INDEX idx_offerings_price ON product_offerings(vendor_price);

-- 5. Partial unique index for canonical product identity
-- Products with both manufacturer_name and manufacturer_sku must be unique
CREATE UNIQUE INDEX idx_products_manufacturer_identity
  ON products(manufacturer_name, manufacturer_sku)
  WHERE manufacturer_name IS NOT NULL AND manufacturer_sku IS NOT NULL;

-- 6. Updated trigger for updated_at on offerings
CREATE OR REPLACE FUNCTION update_offering_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_offering_updated_at
  BEFORE UPDATE ON product_offerings
  FOR EACH ROW
  EXECUTE FUNCTION update_offering_updated_at();

-- Note: vendor_id and price columns kept on products table temporarily.
-- They will be dropped in a later migration after all UI is updated.
-- During transition, product_offerings is the source of truth for pricing.
