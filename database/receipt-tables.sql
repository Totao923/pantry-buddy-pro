-- =============================================================================
-- RECEIPT SCANNING & ANALYTICS DATABASE SCHEMA
-- =============================================================================

-- Drop existing tables if they exist (be careful with this in production!)
-- DROP TABLE IF EXISTS receipt_items CASCADE;
-- DROP TABLE IF EXISTS receipts CASCADE;
-- DROP TABLE IF EXISTS scanned_products CASCADE;
-- DROP TABLE IF EXISTS spending_analytics CASCADE;

-- 1. RECEIPTS TABLE
-- Stores the main receipt information
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  store_name TEXT NOT NULL,
  receipt_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  raw_text TEXT,
  confidence DECIMAL(3,2) DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for receipts
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own receipts" ON receipts 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own receipts" ON receipts 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own receipts" ON receipts 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own receipts" ON receipts 
  FOR DELETE USING (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(user_id, receipt_date DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_store ON receipts(user_id, store_name);

-- 2. RECEIPT ITEMS TABLE
-- Stores individual items from each receipt
CREATE TABLE IF NOT EXISTS receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID REFERENCES receipts(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1 CHECK (quantity > 0),
  unit TEXT DEFAULT 'each',
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  category TEXT DEFAULT 'other',
  confidence DECIMAL(3,2) DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for receipt items
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own receipt items" ON receipt_items 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM receipts r 
      WHERE r.id = receipt_items.receipt_id 
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own receipt items" ON receipt_items 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM receipts r 
      WHERE r.id = receipt_items.receipt_id 
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own receipt items" ON receipt_items 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM receipts r 
      WHERE r.id = receipt_items.receipt_id 
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own receipt items" ON receipt_items 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM receipts r 
      WHERE r.id = receipt_items.receipt_id 
      AND r.user_id = auth.uid()
    )
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_category ON receipt_items(category);

-- 3. SCANNED PRODUCTS TABLE
-- Stores barcode scanning history and product information
CREATE TABLE IF NOT EXISTS scanned_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  barcode TEXT NOT NULL,
  product_name TEXT NOT NULL,
  brand TEXT,
  category TEXT DEFAULT 'other',
  price DECIMAL(10,2),
  nutrition_info JSONB,
  scan_count INTEGER DEFAULT 1 CHECK (scan_count > 0),
  last_scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one product per user per barcode
  UNIQUE(user_id, barcode)
);

-- Add RLS policies for scanned products
ALTER TABLE scanned_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scanned products" ON scanned_products 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scanned products" ON scanned_products 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scanned products" ON scanned_products 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scanned products" ON scanned_products 
  FOR DELETE USING (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scanned_products_user_id ON scanned_products(user_id);
CREATE INDEX IF NOT EXISTS idx_scanned_products_barcode ON scanned_products(barcode);
CREATE INDEX IF NOT EXISTS idx_scanned_products_last_scanned ON scanned_products(user_id, last_scanned_at DESC);

-- 4. SPENDING ANALYTICS TABLE (Optional - for caching complex analytics)
-- Pre-computed analytics data for better performance
CREATE TABLE IF NOT EXISTS spending_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  category_totals JSONB DEFAULT '{}',
  store_totals JSONB DEFAULT '{}',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_receipts INTEGER DEFAULT 0 CHECK (total_receipts >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one analytics record per user per period
  UNIQUE(user_id, period_type, period_start)
);

-- Add RLS policies for spending analytics
ALTER TABLE spending_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics" ON spending_analytics 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics" ON spending_analytics 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics" ON spending_analytics 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own analytics" ON spending_analytics 
  FOR DELETE USING (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_spending_analytics_user_period ON spending_analytics(user_id, period_type, period_start);

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to update the updated_at column
CREATE TRIGGER update_receipts_updated_at 
  BEFORE UPDATE ON receipts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spending_analytics_updated_at 
  BEFORE UPDATE ON spending_analytics 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically calculate analytics when receipts are added/updated
CREATE OR REPLACE FUNCTION refresh_spending_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete existing analytics for the affected user and date range
  DELETE FROM spending_analytics 
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND period_type = 'monthly'
    AND period_start = date_trunc('month', COALESCE(NEW.receipt_date, OLD.receipt_date))::date;
  
  -- Recalculate and insert new analytics
  INSERT INTO spending_analytics (
    user_id, 
    period_type, 
    period_start, 
    period_end, 
    total_amount, 
    total_receipts,
    category_totals,
    store_totals
  )
  SELECT 
    r.user_id,
    'monthly' as period_type,
    date_trunc('month', r.receipt_date)::date as period_start,
    (date_trunc('month', r.receipt_date) + interval '1 month - 1 day')::date as period_end,
    SUM(r.total_amount) as total_amount,
    COUNT(*) as total_receipts,
    COALESCE(
      jsonb_object_agg(
        ri.category, 
        SUM(ri.price)
      ) FILTER (WHERE ri.category IS NOT NULL),
      '{}'::jsonb
    ) as category_totals,
    jsonb_object_agg(r.store_name, SUM(r.total_amount)) as store_totals
  FROM receipts r
  LEFT JOIN receipt_items ri ON r.id = ri.receipt_id
  WHERE r.user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND date_trunc('month', r.receipt_date) = date_trunc('month', COALESCE(NEW.receipt_date, OLD.receipt_date))
  GROUP BY r.user_id, date_trunc('month', r.receipt_date);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Add trigger to refresh analytics when receipts change
CREATE TRIGGER refresh_analytics_on_receipt_change
  AFTER INSERT OR UPDATE OR DELETE ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION refresh_spending_analytics();

-- =============================================================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================================================

-- Uncomment the following to insert sample data for testing
-- Note: Replace the user_id with a real user ID from your auth.users table

/*
-- Insert sample receipt
INSERT INTO receipts (user_id, store_name, receipt_date, total_amount, tax_amount, confidence) 
VALUES (
  '00000000-0000-0000-0000-000000000000', -- Replace with real user ID
  'Whole Foods Market',
  CURRENT_DATE,
  58.46,
  4.33,
  0.85
);

-- Get the receipt ID for sample items
WITH sample_receipt AS (
  SELECT id FROM receipts WHERE store_name = 'Whole Foods Market' LIMIT 1
)
INSERT INTO receipt_items (receipt_id, name, quantity, unit, price, category, confidence)
SELECT 
  sr.id,
  item.name,
  item.quantity,
  item.unit,
  item.price,
  item.category,
  item.confidence
FROM sample_receipt sr,
(VALUES 
  ('Organic Bananas', 2.5, 'lbs', 3.98, 'fruits', 0.9),
  ('Avocados Large', 4, 'ct', 5.96, 'fruits', 0.8),
  ('Chicken Breast', 1.2, 'lbs', 8.40, 'protein', 0.9),
  ('Whole Milk', 1, 'gal', 4.49, 'dairy', 0.9),
  ('Sourdough Bread', 1, 'each', 3.99, 'grains', 0.8)
) AS item(name, quantity, unit, price, category, confidence);
*/

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check that all tables were created successfully
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('receipts', 'receipt_items', 'scanned_products', 'spending_analytics')
ORDER BY table_name;

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('receipts', 'receipt_items', 'scanned_products', 'spending_analytics')
ORDER BY tablename, policyname;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Receipt scanning database schema has been successfully created!';
  RAISE NOTICE 'Tables created: receipts, receipt_items, scanned_products, spending_analytics';
  RAISE NOTICE 'RLS policies enabled for all tables';
  RAISE NOTICE 'Indexes created for optimal performance';
  RAISE NOTICE 'Triggers added for automatic analytics calculation';
END $$;