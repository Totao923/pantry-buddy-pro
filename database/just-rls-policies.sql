-- =====================================================
-- Simple RLS Policies Setup for Receipts
-- =====================================================
-- Since user_id column exists, just add the policies
-- =====================================================

-- 1. Enable RLS on receipts table
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing policies first
DROP POLICY IF EXISTS "Users can insert their own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can read their own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can update their own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can delete their own receipts" ON public.receipts;

-- 3. Create the RLS policies
CREATE POLICY "Users can insert their own receipts" ON public.receipts
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own receipts" ON public.receipts
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own receipts" ON public.receipts
    FOR UPDATE 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own receipts" ON public.receipts
    FOR DELETE 
    USING (auth.uid() = user_id);

-- 4. Verify policies were created
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'receipts';