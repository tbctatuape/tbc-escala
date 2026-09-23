import { getSupabaseClient } from '../lib/supabase';
import { IndisponibilidadeRecord, VoluntarioRecord } from '../types';

export const REASON_PRESETS = [
  'Viagem',
  'Trabalho / Estudo',
  'Família',
  'Saúde',
  'Férias',
  'Outro',
];

export const unavailabilityService = {
  /**
   * Find matching volunteer ID for authenticated user by user_id or email
   */
  async getVoluntarioForCurrentUser(
    userId: string,
    userEmail: string
  ): Promise<{ voluntario: VoluntarioRecord | null; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { voluntario: null, error: 'Supabase não configurado' };

    try {
      // First attempt: match by user_id
      if (userId) {
        const { data: byUserId } = await supabase
          .from('voluntarios')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (byUserId) {
          return {
            voluntario: {
              id: byUserId.id,
              nome: byUserId.nome,
              sobrenome: byUserId.sobrenome || '',
              email: byUserId.email,
              celular: byUserId.celular || '',
              ativo: byUserId.ativo ?? true,
              user_id: byUserId.user_id,
            },
            error: null,
          };
        }
      }

      // Second attempt: match by email
      if (userEmail) {
        const { data: byEmail } = await supabase
          .from('voluntarios')
          .select('*')
          .eq('email', userEmail.trim().toLowerCase())
          .maybeSingle();

        if (byEmail) {
          // Auto-link user_id if missing
          if (!byEmail.user_id && userId) {
            await supabase
              .from('voluntarios')
              .update({ user_id: userId })
              .eq('id', byEmail.id);
          }

          return {
            voluntario: {
              id: byEmail.id,
              nome: byEmail.nome,
              sobrenome: byEmail.sobrenome || '',
              email: byEmail.email,
              celular: byEmail.celular || '',
              ativo: byEmail.ativo ?? true,
              user_id: userId || byEmail.user_id,
            },
            error: null,
          };
        }
      }

      return { voluntario: null, error: null };
    } catch (err: any) {
      return { voluntario: null, error: err.message };
    }
  },

  /**
   * Fetch unavailabilities with voluntario info
   */
  async getIndisponibilidades(
    voluntarioId?: string
  ): Promise<{ data: IndisponibilidadeRecord[]; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: [], error: 'Supabase não configurado' };

    try {
      let query = supabase
        .from('indisponibilidades')
        .select('*, voluntarios(id, nome, sobrenome, email)')
        .order('data_inicio', { ascending: true });

      if (voluntarioId) {
        query = query.eq('voluntario_id', voluntarioId);
      }

      const { data, error } = await query;

      if (error) {
        return { data: [], error: error.message };
      }

      if (!data) return { data: [], error: null };

      const formatted: IndisponibilidadeRecord[] = data.map((item: any) => {
        const vol = item.voluntarios;
        return {
          id: item.id,
          voluntario_id: item.voluntario_id,
          voluntario_nome: vol?.nome || 'Voluntário',
          voluntario_sobrenome: vol?.sobrenome || '',
          voluntario_email: vol?.email || '',
          data_inicio: item.data_inicio,
          data_fim: item.data_fim || item.data_inicio,
          periodo: item.periodo || 'dia_inteiro',
          motivo: item.motivo || 'Indisponível',
          observacao: item.observacao || '',
          created_at: item.created_at,
        };
      });

      return { data: formatted, error: null };
    } catch (err: any) {
      return { data: [], error: err.message };
    }
  },

  /**
   * Insert new unavailability record
   */
  async createIndisponibilidade(
    record: Partial<IndisponibilidadeRecord>
  ): Promise<{ data: IndisponibilidadeRecord | null; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: null, error: 'Supabase não configurado' };

    try {
      const { data, error } = await supabase
        .from('indisponibilidades')
        .insert({
          voluntario_id: record.voluntario_id,
          data_inicio: record.data_inicio,
          data_fim: record.data_fim || record.data_inicio,
          periodo: record.periodo || 'dia_inteiro',
          motivo: record.motivo,
          observacao: record.observacao || '',
        })
        .select()
        .single();

      if (error) return { data: null, error: error.message };

      return {
        data: {
          id: data.id,
          voluntario_id: data.voluntario_id,
          data_inicio: data.data_inicio,
          data_fim: data.data_fim,
          periodo: data.periodo,
          motivo: data.motivo,
          observacao: data.observacao,
          created_at: data.created_at,
        },
        error: null,
      };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  },

  /**
   * Delete unavailability record by ID
   */
  async deleteIndisponibilidade(
    id: string
  ): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase não configurado' };

    try {
      const { error } = await supabase
        .from('indisponibilidades')
        .delete()
        .eq('id', id);

      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};
