import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nykdfctdnokgfwuwcnwr.supabase.co';
const supabaseKey = 'sb_publishable_6lMtN31ghSTDz8QHQshGMQ_F9HnOSOB';

export const supabase = createClient(supabaseUrl, supabaseKey);