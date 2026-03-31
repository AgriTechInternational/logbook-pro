import { createClient } from '@supabase/supabase-js';

// AgriTech Pro: Supabase Connection (Logbook App)
const supabaseUrl = 'https://tctgihojkynjpmsheyhq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjdGdpaG9qa3luanBtc2hleWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzQzMzEsImV4cCI6MjA5MDIxMDMzMX0.anwpFu3gVOiYMOLGQPBUhejz5ouRs31RFTWEVxNyMEc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const tables = {
    PROFILES: 'profiles', // For User Roles & Approvals
    LOGS: 'operation_logs',
    MEETINGS: 'meetings',
    ACTIONS: 'actions',
    ANOMALIES: 'anomalies',
    MILESTONES: 'milestones',
    ATTENDANCE: 'attendance',
    PRODUCTION: 'production'
};
