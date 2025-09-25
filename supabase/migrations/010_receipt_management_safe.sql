-- Receipt Management Migration (Safe Version)
-- Creates tables for receipt scanning, OCR processing, and spending analytics
-- Uses IF NOT EXISTS to avoid conflicts

-- Create receipts table (safe)
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    store_name TEXT NOT NULL,
    receipt_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2),
    raw_text TEXT,
    confidence DECIMAL(5,4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create receipt_items table (safe)
CREATE TABLE IF NOT EXISTS receipt_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_id UUID REFERENCES receipts(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit TEXT,
    price DECIMAL(10,2) NOT NULL,
    category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('protein', 'vegetables', 'fruits', 'grains', 'dairy', 'spices', 'herbs', 'oils', 'pantry', 'other')),
    confidence DECIMAL(5,4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance (safe)
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_receipts_store_name ON receipts(store_name);
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_category ON receipt_items(category);
CREATE INDEX IF NOT EXISTS idx_receipt_items_name ON receipt_items(name);

-- Enable Row Level Security (safe - won't error if already enabled)
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Users can manage their own receipts" ON receipts;
DROP POLICY IF EXISTS "Users can manage their own receipt items" ON receipt_items;

-- RLS Policies for receipts
CREATE POLICY "Users can manage their own receipts" ON receipts
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for receipt_items
CREATE POLICY "Users can manage their own receipt items" ON receipt_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM receipts r
            WHERE r.id = receipt_items.receipt_id
            AND r.user_id = auth.uid()
        )
    );

-- Add update trigger for receipts (safe)
DROP TRIGGER IF EXISTS update_receipts_updated_at ON receipts;
CREATE TRIGGER update_receipts_updated_at
    BEFORE UPDATE ON receipts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();