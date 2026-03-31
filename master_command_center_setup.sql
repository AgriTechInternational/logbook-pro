-- ====================================================================
-- AGRITECH COMMAND CENTER: MASTER DATABASE SETUP (SUPABASE)
-- ====================================================================
-- Run this script in the Supabase SQL Editor for repository: tctgihojkynjpmsheyhq
-- This script ensures ALL tables for Logbook, Labor Pro, and Finance Pro exist.

-- 1. PROFILES & ACCESS CONTROL
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE,
    role TEXT DEFAULT 'PENDING', -- SUPER_ADMIN, ENGINEER, PENDING
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LOGBOOK & OPERATIONS
CREATE TABLE IF NOT EXISTS public.operation_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    attachments JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH
    status TEXT DEFAULT 'TODO', -- TODO, IN_PROGRESS, DONE
    assigned_to TEXT DEFAULT 'All Engineers',
    created_by TEXT,
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
    anomaly_id UUID REFERENCES public.anomalies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    attachments JSONB DEFAULT '[]'::jsonb
);


CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    agenda TEXT,
    way_forward TEXT,
    date DATE DEFAULT CURRENT_DATE,
    time TIME,
    location TEXT,
    attendees TEXT, -- Stored as CSV string to match app logic
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    attachments JSONB DEFAULT '[]'::jsonb
);


CREATE TABLE IF NOT EXISTS public.anomalies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT DEFAULT 'MEDIUM', -- LOW, MEDIUM, CRITICAL
    status TEXT DEFAULT 'OPEN', -- OPEN, INVESTIGATING, RESOLVED
    reported_by TEXT, -- Fixed: Added to match frontend save logic
    created_at TIMESTAMPTZ DEFAULT NOW(),
    attachments JSONB DEFAULT '[]'::jsonb
);


CREATE TABLE IF NOT EXISTS public.milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    deadline DATE, -- Fixed: Renamed from target_date to match frontend
    status TEXT DEFAULT 'PENDING',
    progress INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    attachments JSONB DEFAULT '[]'::jsonb
);

-- 3. LABOR & PRODUCTION PRO
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    worker_name TEXT NOT NULL,
    status TEXT DEFAULT 'PRESENT', -- PRESENT, ABSENT, LATE
    shift TEXT DEFAULT 'DAY',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.production (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    shift TEXT NOT NULL,
    bags_produced INTEGER DEFAULT 0,
    tons_produced DECIMAL(10,2) DEFAULT 0,
    anomalies TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. FINANCE PRO
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    category TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.partner_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    partner_name TEXT NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    type TEXT NOT NULL, -- Credit, Debit
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    item_name TEXT NOT NULL,
    quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
    unit TEXT, -- kg, bags, tons
    type TEXT NOT NULL, -- IN, OUT
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cashflow (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    description TEXT,
    inflow DECIMAL(12,2) DEFAULT 0,
    outflow DECIMAL(12,2) DEFAULT 0,
    balance DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- REALTIME & SECURITY POLICIES
-- ====================================================================

-- Enable Realtime for all operational tables
ALTER PUBLICATION supabase_realtime ADD TABLE 
    public.profiles, 
    public.operation_logs, 
    public.actions, 
    public.meetings, 
    public.anomalies, 
    public.milestones,
    public.attendance,
    public.production,
    public.expenses,
    public.partner_transactions,
    public.inventory,
    public.cashflow;

-- Open Access Policies (Simplified for Migration Phase)
-- IMPORTANT: Update these with User-Role checks after verification.
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Public Full Access" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Public Full Access" ON public.%I FOR ALL USING (true)', t);
    END LOOP;
END $$;

-- 5. RELOAD SCHEMA CACHE (Failsafe for PostgREST)
-- Run this to force the API to recognize the new 'meetings' table instantly.
NOTIFY pgrst, 'reload schema';

