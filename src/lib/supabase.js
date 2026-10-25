import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../config.js';

export const db = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
