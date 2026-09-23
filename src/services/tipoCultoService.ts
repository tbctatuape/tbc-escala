import { getSupabaseClient } from '../lib/supabase';
import { TipoCultoRecord } from '../types';

export const tipoCultoService = {
  /**
   * Fetch all service templates (tipos_culto)
   */
  async getTiposCulto(): Promise<{ data: TipoCultoRecord[]; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: [], error: 'Supabase não configurado' };

    try {
      const { data, error } = await supabase
        .from('tipos_culto')
        .select('*')
        .order('nome', { ascending: true });

      if (error) {
        return { data: [], error: error.message };
      }

      const formatted: TipoCultoRecord[] = (data || []).map((item: any) => ({
        id: item.id,
        nome: item.nome,
        dia_semana: Number(item.dia_semana ?? 0),
        semana_mes: item.semana_mes !== null && item.semana_mes !== undefined ? Number(item.semana_mes) : null,
        meses_intervalo: Number(item.meses_intervalo || 1),
        horario: item.horario || '10:00',
        periodo: item.periodo || 'Manhã',
        ativo: item.ativo ?? true,
        created_at: item.created_at,
      }));

      return { data: formatted, error: null };
    } catch (err: any) {
      return { data: [], error: err.message };
    }
  },

  /**
   * Create a new TipoCulto template
   */
  async createTipoCulto(
    payload: Omit<TipoCultoRecord, 'id' | 'created_at'>
  ): Promise<{ data: TipoCultoRecord | null; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: null, error: 'Supabase não configurado' };

    try {
      const { data, error } = await supabase
        .from('tipos_culto')
        .insert({
          nome: payload.nome,
          dia_semana: payload.dia_semana,
          semana_mes: payload.semana_mes,
          meses_intervalo: payload.meses_intervalo,
          horario: payload.horario,
          periodo: payload.periodo,
          ativo: payload.ativo ?? true,
        })
        .select()
        .single();

      if (error) return { data: null, error: error.message };

      return {
        data: {
          id: data.id,
          nome: data.nome,
          dia_semana: Number(data.dia_semana),
          semana_mes: data.semana_mes !== null ? Number(data.semana_mes) : null,
          meses_intervalo: Number(data.meses_intervalo),
          horario: data.horario,
          periodo: data.periodo,
          ativo: data.ativo ?? true,
        },
        error: null,
      };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  },

  /**
   * Update an existing TipoCulto template
   */
  async updateTipoCulto(
    id: string,
    payload: Partial<TipoCultoRecord>
  ): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase não configurado' };

    try {
      const updateData: any = {};
      if (payload.nome !== undefined) updateData.nome = payload.nome;
      if (payload.dia_semana !== undefined) updateData.dia_semana = payload.dia_semana;
      if (payload.semana_mes !== undefined) updateData.semana_mes = payload.semana_mes;
      if (payload.meses_intervalo !== undefined) updateData.meses_intervalo = payload.meses_intervalo;
      if (payload.horario !== undefined) updateData.horario = payload.horario;
      if (payload.periodo !== undefined) updateData.periodo = payload.periodo;
      if (payload.ativo !== undefined) updateData.ativo = payload.ativo;

      const { error } = await supabase
        .from('tipos_culto')
        .update(updateData)
        .eq('id', id);

      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Delete or deactivate a TipoCulto template
   */
  async deleteTipoCulto(id: string): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase não configurado' };

    try {
      const { error } = await supabase.from('tipos_culto').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};
