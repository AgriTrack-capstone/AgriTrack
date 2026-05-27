import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://syynrrvdnazubsqdtddr.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

if (!supabaseKey) {
	// Helpful warning during development when env var is missing
	// eslint-disable-next-line no-console
	console.warn('REACT_APP_SUPABASE_ANON_KEY is not set — requests may fail.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);