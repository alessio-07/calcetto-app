import { createClient } from '@supabase/supabase-js';

// PRENDI QUESTI DATI DAL SITO SUPABASE -> SETTINGS -> API
const supabaseUrl = 'https://zsffubmfwjvrhggikzyr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzZmZ1Ym1md2p2cmhnZ2lrenlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIyNzcxNywiZXhwIjoyMDgxODAzNzE3fQ.BJ-P3FrnZccdGS6SCwF8cYftsFQxttbhyRcGceyG3YA';

export const supabase = createClient(supabaseUrl, supabaseKey);