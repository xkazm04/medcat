-- Migration: Add regulatory fields to products table
-- Run this in Supabase SQL Editor

-- Add regulatory columns
ALTER TABLE products
ADD COLUMN IF NOT EXISTS udi_di VARCHAR(14),
ADD COLUMN IF NOT EXISTS ce_marked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mdr_class VARCHAR(3) CHECK (mdr_class IN ('I', 'IIa', 'IIb', 'III') OR mdr_class IS NULL);

-- Add index for UDI-DI lookups (useful for duplicate detection later)
CREATE INDEX IF NOT EXISTS idx_products_udi ON products(udi_di) WHERE udi_di IS NOT NULL;

-- Add RLS policies for write operations
-- Permissive for now (no auth required) - will be tightened when auth is added
DROP POLICY IF EXISTS "Allow all updates" ON products;
DROP POLICY IF EXISTS "Allow all deletes" ON products;

CREATE POLICY "Allow all updates" ON products FOR UPDATE USING (true);
CREATE POLICY "Allow all deletes" ON products FOR DELETE USING (true);

-- Verify
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'products'
AND column_name IN ('udi_di', 'ce_marked', 'mdr_class');
