-- Add headers column to batch_imports for server-side row processing
ALTER TABLE batch_imports ADD COLUMN IF NOT EXISTS headers JSONB;
