-- Migration: 007_category_counts_materialized.sql
-- Purpose: Materialized view for efficient category product counts
-- Eliminates need to fetch all products just to count by category

-- Create materialized view with precomputed counts
CREATE MATERIALIZED VIEW IF NOT EXISTS category_product_counts AS
WITH RECURSIVE category_tree AS (
  -- Base: direct product counts per category
  SELECT
    c.id,
    c.code,
    c.name,
    c.parent_id,
    c.path,
    c.depth,
    COUNT(p.id) as direct_count
  FROM emdn_categories c
  LEFT JOIN products p ON p.emdn_category_id = c.id
  GROUP BY c.id, c.code, c.name, c.parent_id, c.path, c.depth
)
SELECT
  ct.id,
  ct.code,
  ct.name,
  ct.parent_id,
  ct.path,
  ct.depth,
  ct.direct_count,
  -- Total count includes all descendants (using path prefix matching)
  (
    SELECT COALESCE(SUM(sub.direct_count), 0)
    FROM category_tree sub
    WHERE sub.id = ct.id OR sub.path LIKE ct.path || '.%'
  )::INTEGER as total_count
FROM category_tree ct
ORDER BY ct.code;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_category_counts_id
  ON category_product_counts(id);

-- Create index for fast parent lookups (tree building)
CREATE INDEX IF NOT EXISTS idx_category_counts_parent
  ON category_product_counts(parent_id);

-- Create index for path-based queries
CREATE INDEX IF NOT EXISTS idx_category_counts_path
  ON category_product_counts(path text_pattern_ops);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_category_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY category_product_counts;
END;
$$;

-- Grant permissions
GRANT SELECT ON category_product_counts TO anon, authenticated;
GRANT EXECUTE ON FUNCTION refresh_category_counts TO authenticated;

-- Create trigger function for automatic refresh on product changes
CREATE OR REPLACE FUNCTION trigger_refresh_category_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Use pg_notify to signal refresh needed (async handling recommended)
  PERFORM pg_notify('category_counts_refresh', '');
  RETURN NULL;
END;
$$;

-- Trigger on product insert/update/delete affecting category
CREATE OR REPLACE TRIGGER products_category_change
AFTER INSERT OR UPDATE OF emdn_category_id OR DELETE
ON products
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_category_counts();

COMMENT ON MATERIALIZED VIEW category_product_counts IS
  'Precomputed category product counts for efficient sidebar rendering.
   Refresh with: SELECT refresh_category_counts()';
