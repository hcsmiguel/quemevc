import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ddfefbwauuhqxqufhwwr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkZmVmYndhdXVocXhxdWZod3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1ODMxNjgsImV4cCI6MjEwOTE1OTE2OH0.l1eh6jmMsi1fTiqy7h28fjkgl0SJLegELUoNmk0dRPE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Função auxiliar para hash de senha seguro no navegador (SHA-256)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_quem_e_vc_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
