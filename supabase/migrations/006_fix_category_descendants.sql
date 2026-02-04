-- Migration: 006_fix_category_descendants.sql
-- Purpose: Fix path delimiter in get_category_descendants function
-- The paths use '.' as delimiter, not '/'

-- Drop and recreate the function with correct delimiter
CREATE OR REPLACE FUNCTION get_category_descendants(parent_category_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  parent_path TEXT;
BEGIN
  -- Get the parent's path
  SELECT path INTO parent_path
  FROM emdn_categories
  WHERE id = parent_category_id;

  IF parent_path IS NULL THEN
    -- Category not found, return just the ID (may still exist without path)
    RETURN QUERY SELECT parent_category_id;
    RETURN;
  END IF;

  -- Return parent category + all descendants (path starts with parent_path.)
  -- FIX: Use '.' delimiter instead of '/'
  RETURN QUERY
  SELECT id FROM emdn_categories
  WHERE id = parent_category_id  -- The parent itself
     OR path LIKE parent_path || '.%';  -- All descendants
END;
$$;

-- Update index for dot-separated path pattern matching
DROP INDEX IF EXISTS idx_emdn_path_pattern;
CREATE INDEX idx_emdn_path_pattern ON emdn_categories (path text_pattern_ops);

COMMENT ON FUNCTION get_category_descendants IS
  'Returns a category ID and all its descendant category IDs using dot-separated path matching';
