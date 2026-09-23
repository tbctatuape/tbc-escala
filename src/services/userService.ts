import { getSupabaseClient } from '../lib/supabase';
import { NivelAcesso, PerfilRecord, VoluntarioRecord } from '../types';

export interface UserWithVolunteerLink {
  perfil: PerfilRecord;
  voluntario: VoluntarioRecord | null;
  linked: boolean;
}

export const userService = {
  /**
   * Fetch all profiles from public.perfis and match with public.voluntarios
   */
  async getPerfisComVoluntario(): Promise<{ data: UserWithVolunteerLink[]; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: [], error: 'Supabase não configurado' };

    try {
      // 1. Fetch all perfis
      const { data: perfis, error: perfisErr } = await supabase
        .from('perfis')
        .select('*')
        .order('nome', { ascending: true });

      if (perfisErr) {
        return { data: [], error: perfisErr.message };
      }

      // 2. Fetch all voluntarios to match links
      const { data: voluntarios } = await supabase
        .from('voluntarios')
        .select('*');

      const volMapByUserId: Record<string, VoluntarioRecord> = {};
      const volMapByCelularOrName: Record<string, VoluntarioRecord> = {};

      if (voluntarios) {
        voluntarios.forEach((v: any) => {
          if (v.user_id) {
            volMapByUserId[v.user_id] = v;
          }
          if (v.celular) {
            volMapByCelularOrName[v.celular.trim()] = v;
          }
        });
      }

      const result: UserWithVolunteerLink[] = (perfis || []).map((p: any) => {
        const matchedVol = volMapByUserId[p.id] || (p.celular ? volMapByCelularOrName[p.celular.trim()] : null) || null;
        return {
          perfil: {
            id: p.id,
            nome: p.nome || 'Usuário',
            sobrenome: p.sobrenome || '',
            celular: p.celular || '',
            nivel_acesso: (p.nivel_acesso as NivelAcesso) || 'voluntario',
            ativo: p.ativo ?? true,
            avatar_url: p.avatar_url || '',
          },
          voluntario: matchedVol,
          linked: Boolean(matchedVol),
        };
      });

      return { data: result, error: null };
    } catch (err: any) {
      return { data: [], error: err.message };
    }
  },

  /**
   * Update nivel_acesso for a user in public.perfis
   */
  async updateNivelAcesso(
    userId: string,
    novoNivel: NivelAcesso
  ): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase não configurado' };

    try {
      const { error } = await supabase
        .from('perfis')
        .update({ nivel_acesso: novoNivel })
        .eq('id', userId);

      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Link or Create a volunteer entry in public.voluntarios for a profile
   */
  async vincularOuCriarVoluntario(
    perfil: PerfilRecord,
    emailFallback?: string
  ): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase não configurado' };

    try {
      // Check if volunteer already exists by user_id
      const { data: existing } = await supabase
        .from('voluntarios')
        .select('id')
        .eq('user_id', perfil.id)
        .maybeSingle();

      if (existing) {
        return { success: true, error: null }; // Already linked
      }

      // Create new volunteer record
      const { error } = await supabase.from('voluntarios').insert({
        nome: perfil.nome || 'Sem Nome',
        sobrenome: perfil.sobrenome || '',
        email: emailFallback || '',
        celular: perfil.celular || '',
        ativo: true,
        user_id: perfil.id,
      });

      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Create a new user account via Supabase RPC procedure 'criar_usuario_admin'
   */
  async criarUsuarioAdmin(params: {
    email: string;
    senha: string;
    nome: string;
    sobrenome: string;
    nivel: NivelAcesso;
  }): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase não configurado' };

    try {
      const { error } = await supabase.rpc('criar_usuario_admin', {
        p_email: params.email.trim(),
        p_password: params.senha,
        p_nome: params.nome.trim(),
        p_sobrenome: params.sobrenome.trim(),
        p_nivel_acesso: params.nivel,
      });

      if (error) {
        let msg = error.message;
        if (msg.includes('already exists') || msg.includes('duplicate') || error.code === '23505') {
          msg = 'Este e-mail já possui cadastro no sistema.';
        }
        return { success: false, error: msg };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao comunicar com o Supabase' };
    }
  },

  /**
   * Fetch all volunteers from public.voluntarios for dropdown list
   */
  async getTodosVoluntarios(): Promise<{ data: VoluntarioRecord[]; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: [], error: 'Supabase não configurado' };

    try {
      const { data, error } = await supabase
        .from('voluntarios')
        .select('*')
        .order('nome', { ascending: true });

      if (error) return { data: [], error: error.message };
      return { data: data || [], error: null };
    } catch (err: any) {
      return { data: [], error: err.message };
    }
  },

  /**
   * Update name, surname, level, and volunteer link for a user
   */
  async updatePerfilCompleto(params: {
    userId: string;
    nome: string;
    sobrenome: string;
    nivel_acesso: NivelAcesso;
    voluntarioId: string | null;
  }): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase não configurado' };

    try {
      // 1. Update public.perfis (nome, sobrenome, nivel_acesso)
      const { error: perfisErr } = await supabase
        .from('perfis')
        .update({
          nome: params.nome.trim(),
          sobrenome: params.sobrenome.trim(),
          nivel_acesso: params.nivel_acesso,
        })
        .eq('id', params.userId);

      if (perfisErr) return { success: false, error: perfisErr.message };

      // 2. Unlink any previous voluntario record linked to this user_id
      await supabase
        .from('voluntarios')
        .update({ user_id: null })
        .eq('user_id', params.userId);

      // 3. Link selected voluntario record (or create new if CREATE_NEW)
      if (params.voluntarioId) {
        if (params.voluntarioId === 'CREATE_NEW') {
          await supabase.from('voluntarios').insert({
            nome: params.nome.trim() || 'Sem Nome',
            sobrenome: params.sobrenome.trim() || '',
            ativo: true,
            user_id: params.userId,
          });
        } else {
          await supabase
            .from('voluntarios')
            .update({ user_id: params.userId })
            .eq('id', params.voluntarioId);
        }
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao atualizar perfil' };
    }
  },

  /**
   * Delete a user account via Supabase RPC procedure 'deletar_usuario_admin'
   */
  async deletarUsuarioAdmin(userId: string): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase não configurado' };

    try {
      const { error } = await supabase.rpc('deletar_usuario_admin', {
        p_user_id: userId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao comunicar com o Supabase' };
    }
  },

  /**
   * Upload user avatar to Supabase Storage bucket 'avatars' and save URL to public.perfis(avatar_url)
   */
  async uploadAvatar(
    userId: string,
    file: File
  ): Promise<{ publicUrl: string | null; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { publicUrl: null, error: 'Supabase não configurado' };

    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${userId}_${Date.now()}.${fileExt}`;

      // Upload file to bucket 'avatars'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        return { publicUrl: null, error: uploadError.message };
      }

      // Retrieve public URL
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData?.publicUrl || null;
      if (!publicUrl) {
        return { publicUrl: null, error: 'Erro ao gerar URL pública da imagem.' };
      }

      // Update public.perfis avatar_url column
      const { error: updateError } = await supabase
        .from('perfis')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) {
        return { publicUrl, error: updateError.message };
      }

      return { publicUrl, error: null };
    } catch (err: any) {
      return { publicUrl: null, error: err.message || 'Erro ao realizar upload' };
    }
  },
};
