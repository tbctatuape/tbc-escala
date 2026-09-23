import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NivelAcesso, PerfilRecord, SupabaseConfig, UserProfile, UserRole } from '../types';

const STORAGE_KEY_URL = 'tbc_escala_supabase_url';
const STORAGE_KEY_KEY = 'tbc_escala_supabase_key';

let supabaseInstance: SupabaseClient | null = null;
let currentInstanceUrl = '';
let currentInstanceKey = '';

/**
 * Gets active Supabase configuration from env vars or localStorage
 */
export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

  const localUrl = localStorage.getItem(STORAGE_KEY_URL) || '';
  const localKey = localStorage.getItem(STORAGE_KEY_KEY) || '';

  const url = envUrl || localUrl;
  const anonKey = envKey || localKey;

  const isConfigured = Boolean(
    url && 
    anonKey && 
    url.startsWith('https://') && 
    !url.includes('your-project-id')
  );

  return {
    url,
    anonKey,
    isConfigured,
  };
}

/**
 * Returns instantiated Supabase client or null if not configured
 */
export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return null;
  }

  // Reuse instance if config hasn't changed
  if (supabaseInstance && currentInstanceUrl === config.url && currentInstanceKey === config.anonKey) {
    return supabaseInstance;
  }

  try {
    supabaseInstance = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    currentInstanceUrl = config.url;
    currentInstanceKey = config.anonKey;
    return supabaseInstance;
  } catch (err) {
    console.error('Erro ao inicializar o cliente Supabase:', err);
    return null;
  }
}

/**
 * Save user custom Supabase credentials
 */
export function saveSupabaseConfig(url: string, anonKey: string): void {
  localStorage.setItem(STORAGE_KEY_URL, url.trim());
  localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  // Reset cached instance
  supabaseInstance = null;
}

/**
 * Clear stored custom Supabase credentials
 */
export function clearSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_KEY);
  supabaseInstance = null;
}

/**
 * Maps Supabase DB `nivel_acesso` enum to application `UserRole`
 */
export function mapNivelAcessoToUserRole(nivel?: NivelAcesso | string): UserRole {
  if (nivel === 'admin') return 'admin';
  if (nivel === 'lider') return 'leader';
  return 'volunteer';
}

/**
 * Translates Supabase authentication & database errors into readable Portuguese
 */
export function translateSupabaseError(error: any): string {
  if (!error) return 'Ocorreu um erro desconhecido.';

  const message = (error.message || '').toLowerCase();
  const code = (error.code || '').toLowerCase();

  if (message.includes('invalid login credentials') || message.includes('invalid_credentials')) {
    return 'E-mail ou senha incorretos. Verifique suas credenciais.';
  }

  if (message.includes('email not confirmed')) {
    return 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou spam.';
  }

  if (message.includes('user not found') || message.includes('user_not_found')) {
    return 'Usuário não cadastrado no sistema TBC Escala.';
  }

  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Muitas tentativas em curto intervalo. Aguarde alguns minutos e tente novamente.';
  }

  if (message.includes('failed to fetch') || message.includes('networkerror') || message.includes('connection')) {
    return 'Falha de conexão com os servidores do Supabase. Verifique sua internet e as chaves cadastradas.';
  }

  if (message.includes('password should be at least')) {
    return 'A senha deve conter pelo menos 6 caracteres.';
  }

  return error.message || 'Erro ao processar sua solicitação no Supabase.';
}
