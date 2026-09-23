import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthStatus, NivelAcesso, PerfilRecord, SupabaseConfig, UserProfile, UserRole } from '../types';
import { 
  getSupabaseClient, 
  getSupabaseConfig, 
  mapNivelAcessoToUserRole, 
  saveSupabaseConfig, 
  translateSupabaseError 
} from '../lib/supabase';

interface AuthContextType {
  user: UserProfile | null;
  status: AuthStatus;
  supabaseConfig: SupabaseConfig;
  noticeMessage: { type: 'success' | 'error' | 'info'; text: string } | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  updateUserPassword: (newPassword: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setAuthStatus: (status: AuthStatus) => void;
  updateSupabaseConfig: (url: string, key: string) => void;
  clearNotice: () => void;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [supabaseConfig, setSupabaseConfigState] = useState<SupabaseConfig>(getSupabaseConfig());
  const [noticeMessage, setNoticeMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Helper to fetch user profile from public.perfis
  const fetchUserProfileFromDb = async (userId: string, userEmail: string): Promise<UserProfile> => {
    const supabase = getSupabaseClient();
    
    let dbPerfil: PerfilRecord | null = null;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('perfis')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (!error && data) {
          dbPerfil = data as PerfilRecord;
        }
      } catch (err) {
        console.warn('Não foi possível buscar registro em public.perfis:', err);
      }
    }

    if (dbPerfil) {
      const fullName = [dbPerfil.nome, dbPerfil.sobrenome].filter(Boolean).join(' ').trim();
      return {
        id: userId,
        email: userEmail,
        fullName: fullName || userEmail.split('@')[0],
        role: mapNivelAcessoToUserRole(dbPerfil.nivel_acesso),
        phone: dbPerfil.celular || '',
        active: dbPerfil.ativo ?? true,
        functions: ['Mídia'],
        avatarUrl: dbPerfil.avatar_url || undefined,
      };
    }

    // Fallback if public.perfis not created or pending
    return {
      id: userId,
      email: userEmail,
      fullName: userEmail.split('@')[0],
      role: 'volunteer',
      phone: '',
      active: true,
      functions: ['Mídia'],
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80`,
    };
  };

  // Sync auth state with Supabase
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const supabase = getSupabaseClient();

    if (!supabase) {
      if (isMounted) {
        setStatus('unauthenticated');
        setIsLoading(false);
      }
      return;
    }

    // Check URL parameters or hash for recovery mode
    const checkUrlRecoveryMode = () => {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      return hash.includes('type=recovery') || search.includes('type=recovery') || hash.includes('access_token');
    };

    const isRecoveryInUrl = checkUrlRecoveryMode();

    // Listen to Supabase auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        setStatus('recovery');
        setIsLoading(false);
        return;
      }

      if (session?.user) {
        const profile = await fetchUserProfileFromDb(session.user.id, session.user.email || '');
        if (isMounted) {
          setUser(profile);
          // If URL indicates recovery mode, keep in recovery state so user can enter new password
          if (isRecoveryInUrl) {
            setStatus('recovery');
          } else {
            setStatus('authenticated');
          }
        }
      } else {
        if (isMounted) {
          setUser(null);
          setStatus(isRecoveryInUrl ? 'recovery' : 'unauthenticated');
        }
      }
      if (isMounted) {
        setIsLoading(false);
      }
    });

    // Check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;

      if (isRecoveryInUrl) {
        setStatus('recovery');
        setIsLoading(false);
        return;
      }

      if (session?.user) {
        const profile = await fetchUserProfileFromDb(session.user.id, session.user.email || '');
        if (isMounted) {
          setUser(profile);
          setStatus('authenticated');
        }
      } else {
        if (isMounted) {
          setUser(null);
          setStatus('unauthenticated');
        }
      }
      if (isMounted) {
        setIsLoading(false);
      }
    }).catch(() => {
      if (isMounted) {
        setIsLoading(false);
        setStatus(isRecoveryInUrl ? 'recovery' : 'unauthenticated');
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [supabaseConfig]);

  const refreshUserProfile = async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    const profile = await fetchUserProfileFromDb(user.id, user.email);
    setUser(profile);
  };

  const login = async (email: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    setNoticeMessage(null);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setNoticeMessage({
        type: 'error',
        text: 'Chaves do Supabase não configuradas! Preencha a URL e a Anon Key no menu de Configurações para conectar.',
      });
      setIsLoading(false);
      return false;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });

      if (error) {
        setNoticeMessage({
          type: 'error',
          text: translateSupabaseError(error),
        });
        setIsLoading(false);
        return false;
      }

      if (data?.user) {
        const profile = await fetchUserProfileFromDb(data.user.id, data.user.email || email);
        setUser(profile);
        setStatus('authenticated');
        setNoticeMessage({
          type: 'success',
          text: `Sessão iniciada com sucesso! Bem-vindo, ${profile.fullName}.`,
        });
        setIsLoading(false);
        return true;
      }
    } catch (err) {
      setNoticeMessage({
        type: 'error',
        text: translateSupabaseError(err),
      });
    }

    setIsLoading(false);
    return false;
  };

  const sendPasswordReset = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    setNoticeMessage(null);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setNoticeMessage({
        type: 'error',
        text: 'Cliente Supabase não configurado. Adicione suas credenciais no menu de Configurações.',
      });
      setIsLoading(false);
      return false;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}`,
      });

      if (error) {
        setNoticeMessage({
          type: 'error',
          text: translateSupabaseError(error),
        });
        setIsLoading(false);
        return false;
      }

      setNoticeMessage({
        type: 'success',
        text: `Link de redefinição de senha enviado com sucesso para ${email}!`,
      });
      setIsLoading(false);
      return true;
    } catch (err) {
      setNoticeMessage({
        type: 'error',
        text: translateSupabaseError(err),
      });
      setIsLoading(false);
      return false;
    }
  };

  const updateUserPassword = async (newPassword: string): Promise<boolean> => {
    setIsLoading(true);
    setNoticeMessage(null);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setNoticeMessage({
        type: 'error',
        text: 'Cliente Supabase não configurado.',
      });
      setIsLoading(false);
      return false;
    }

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setNoticeMessage({
          type: 'error',
          text: translateSupabaseError(error),
        });
        setIsLoading(false);
        return false;
      }

      // Clear recovery parameters from window hash
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }

      setNoticeMessage({
        type: 'success',
        text: 'Sua senha foi redefinida com sucesso! Você já pode navegar no TBC Escala.',
      });

      if (data?.user) {
        const profile = await fetchUserProfileFromDb(data.user.id, data.user.email || '');
        setUser(profile);
        setStatus('authenticated');
      } else {
        setStatus('unauthenticated');
      }

      setIsLoading(false);
      return true;
    } catch (err) {
      setNoticeMessage({
        type: 'error',
        text: translateSupabaseError(err),
      });
      setIsLoading(false);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error('Erro ao fazer logout:', e);
      }
    }
    setUser(null);
    setStatus('unauthenticated');
    setNoticeMessage({ type: 'info', text: 'Sessão encerrada.' });
    setIsLoading(false);
  };

  const setAuthStatus = (newStatus: AuthStatus) => {
    setStatus(newStatus);
  };

  const updateSupabaseConfig = (url: string, key: string) => {
    saveSupabaseConfig(url, key);
    const updated = getSupabaseConfig();
    setSupabaseConfigState(updated);
    if (updated.isConfigured) {
      setNoticeMessage({
        type: 'success',
        text: 'Credenciais salvas! Conexão com o Supabase estabelecida com sucesso.',
      });
    } else {
      setNoticeMessage({
        type: 'info',
        text: 'Configurações atualizadas.',
      });
    }
  };

  const clearNotice = () => setNoticeMessage(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        supabaseConfig,
        noticeMessage,
        isLoading,
        login,
        sendPasswordReset,
        updateUserPassword,
        logout,
        setAuthStatus,
        updateSupabaseConfig,
        clearNotice,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
