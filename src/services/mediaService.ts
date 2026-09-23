import { getSupabaseClient } from '../lib/supabase';
import { FuncaoRecord, PerfilSimple, VoluntarioRecord } from '../types';

export const DEFAULT_FUNCOES: Omit<FuncaoRecord, 'id'>[] = [
  { nome: 'Transmissão & Live Stream', descricao: 'Operação de software de transmissão (OBS Studio, vMix)', cor: 'bg-blue-500', ativa: true },
  { nome: 'Câmeras de Vídeo', descricao: 'Operação de câmeras fixas e PTZ no templo', cor: 'bg-purple-500', ativa: true },
  { nome: 'Projeção & Letras', descricao: 'Operação do ProPresenter / Holyrics para projeção de letras e avisos', cor: 'bg-amber-500', ativa: true },
  { nome: 'Mesa de Som (Áudio)', descricao: 'Mixagem de áudio para templo e transmissão', cor: 'bg-emerald-500', ativa: true },
  { nome: 'Iluminação Cênica', descricao: 'Controladora DMX e luzes dos cultos', cor: 'bg-orange-500', ativa: true },
  { nome: 'Fotografia', descricao: 'Registro fotográfico dos cultos e eventos', cor: 'bg-rose-500', ativa: true },
  { nome: 'Mídias Sociais & Stories', descricao: 'Cobertura em tempo real e publicação de conteúdo', cor: 'bg-cyan-500', ativa: true },
];

/**
 * Utility to format Brazilian phone numbers (XX) XXXXX-XXXX
 */
export function formatPhoneBR(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Builds WhatsApp chat link for Brazilian mobile numbers
 */
export function getWhatsAppUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '#';
  const fullPhone = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${fullPhone}`;
}

/**
 * Service to manage Funções da Mídia and Voluntários in Supabase
 */
export const mediaService = {
  /**
   * Fetch all media functions with active volunteer count
   */
  async getFuncoes(): Promise<{ data: FuncaoRecord[]; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { data: [], error: 'Cliente Supabase não configurado.' };
    }

    try {
      const { data: funcoes, error: funcoesErr } = await supabase
        .from('funcoes')
        .select('*')
        .order('nome', { ascending: true });

      if (funcoesErr) {
        return { data: [], error: `Erro ao buscar funções: ${funcoesErr.message}` };
      }

      if (!funcoes || funcoes.length === 0) {
        return { data: [], error: null };
      }

      // Fetch volunteer_funcoes counts
      const { data: vfList, error: vfErr } = await supabase
        .from('voluntario_funcoes')
        .select('funcao_id');

      const countsMap: Record<string, number> = {};
      if (!vfErr && vfList) {
        vfList.forEach((row) => {
          countsMap[row.funcao_id] = (countsMap[row.funcao_id] || 0) + 1;
        });
      }

      const formatted: FuncaoRecord[] = funcoes.map((f) => ({
        id: f.id,
        nome: f.nome,
        descricao: f.descricao || '',
        cor: f.cor || 'bg-blue-500',
        ativa: f.ativa ?? true,
        created_at: f.created_at,
        voluntarios_count: countsMap[f.id] || 0,
      }));

      return { data: formatted, error: null };
    } catch (err: any) {
      return { data: [], error: err.message || 'Erro inesperado ao consultar funções.' };
    }
  },

  /**
   * Seed default media functions into public.funcoes
   */
  async seedDefaultFuncoes(): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase não configurado' };

    try {
      const { error } = await supabase.from('funcoes').insert(DEFAULT_FUNCOES);
      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Create or update a function
   */
  async saveFuncao(funcao: Partial<FuncaoRecord>): Promise<{ data: FuncaoRecord | null; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: null, error: 'Supabase não configurado' };

    try {
      if (funcao.id) {
        // Update
        const { data, error } = await supabase
          .from('funcoes')
          .update({
            nome: funcao.nome,
            descricao: funcao.descricao,
            cor: funcao.cor,
            ativa: funcao.ativa,
          })
          .eq('id', funcao.id)
          .select()
          .single();

        if (error) return { data: null, error: error.message };
        return { data: data as FuncaoRecord, error: null };
      } else {
        // Insert
        const { data, error } = await supabase
          .from('funcoes')
          .insert({
            nome: funcao.nome,
            descricao: funcao.descricao || '',
            cor: funcao.cor || 'bg-blue-500',
            ativa: funcao.ativa ?? true,
          })
          .select()
          .single();

        if (error) return { data: null, error: error.message };
        return { data: data as FuncaoRecord, error: null };
      }
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  },

  /**
   * Toggle function active status
   */
  async toggleFuncaoStatus(id: string, currentAtiva: boolean): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase não configurado' };

    try {
      const { error } = await supabase
        .from('funcoes')
        .update({ ativa: !currentAtiva })
        .eq('id', id);

      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Fetch all volunteers with their assigned functions
   */
  async getVoluntarios(): Promise<{ data: VoluntarioRecord[]; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: [], error: 'Supabase não configurado' };

    try {
      // 1. Fetch volunteers
      const { data: vols, error: volsErr } = await supabase
        .from('voluntarios')
        .select('*')
        .order('nome', { ascending: true });

      if (volsErr) {
        return { data: [], error: `Erro ao buscar voluntários: ${volsErr.message}` };
      }

      if (!vols || vols.length === 0) {
        return { data: [], error: null };
      }

      // 2. Fetch profiles to match avatar_url for linked user_ids
      const userIds = vols.map((v) => v.user_id).filter(Boolean);
      const avatarMapByUserId: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: perfisData } = await supabase
          .from('perfis')
          .select('id, avatar_url')
          .in('id', userIds);

        if (perfisData) {
          perfisData.forEach((p: any) => {
            if (p.id && p.avatar_url) {
              avatarMapByUserId[p.id] = p.avatar_url;
            }
          });
        }
      }

      // 3. Fetch junctions and functions
      const { data: junctions, error: juncErr } = await supabase
        .from('voluntario_funcoes')
        .select('voluntario_id, funcao_id, funcoes(id, nome, cor)');

      const volunteerFuncoesMap: Record<string, { ids: string[]; names: string[] }> = {};

      if (!juncErr && junctions) {
        junctions.forEach((j: any) => {
          const volId = j.voluntario_id;
          const funcObj = j.funcoes;
          if (!volunteerFuncoesMap[volId]) {
            volunteerFuncoesMap[volId] = { ids: [], names: [] };
          }
          if (funcObj && funcObj.id) {
            volunteerFuncoesMap[volId].ids.push(funcObj.id);
            volunteerFuncoesMap[volId].names.push(funcObj.nome);
          } else if (j.funcao_id) {
            volunteerFuncoesMap[volId].ids.push(j.funcao_id);
          }
        });
      }

      const formatted: VoluntarioRecord[] = vols.map((v) => ({
        id: v.id,
        nome: v.nome,
        sobrenome: v.sobrenome || '',
        email: v.email,
        celular: v.celular || '',
        ativo: v.ativo ?? true,
        user_id: v.user_id || null,
        created_at: v.created_at,
        funcoes_ids: volunteerFuncoesMap[v.id]?.ids || [],
        funcoes_names: volunteerFuncoesMap[v.id]?.names || [],
        avatar_url: v.user_id ? avatarMapByUserId[v.user_id] || '' : '',
      }));

      return { data: formatted, error: null };
    } catch (err: any) {
      return { data: [], error: err.message || 'Erro ao carregar voluntários.' };
    }
  },

  /**
   * Save (insert or update) a volunteer and update junction rows
   */
  async saveVoluntario(
    voluntario: Partial<VoluntarioRecord>,
    funcaoIds: string[]
  ): Promise<{ data: VoluntarioRecord | null; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: null, error: 'Supabase não configurado' };

    try {
      let savedId = voluntario.id;

      if (savedId) {
        // Update
        const { error } = await supabase
          .from('voluntarios')
          .update({
            nome: voluntario.nome,
            sobrenome: voluntario.sobrenome || '',
            email: voluntario.email,
            celular: voluntario.celular || '',
            ativo: voluntario.ativo ?? true,
            user_id: voluntario.user_id || null,
          })
          .eq('id', savedId);

        if (error) return { data: null, error: error.message };
      } else {
        // Insert
        const { data, error } = await supabase
          .from('voluntarios')
          .insert({
            nome: voluntario.nome,
            sobrenome: voluntario.sobrenome || '',
            email: voluntario.email,
            celular: voluntario.celular || '',
            ativo: voluntario.ativo ?? true,
            user_id: voluntario.user_id || null,
          })
          .select()
          .single();

        if (error) return { data: null, error: error.message };
        savedId = data.id;
      }

      if (savedId) {
        // Delete previous junction records
        await supabase
          .from('voluntario_funcoes')
          .delete()
          .eq('voluntario_id', savedId);

        // Insert new junction records
        if (funcaoIds.length > 0) {
          const rowsToInsert = funcaoIds.map((fId) => ({
            voluntario_id: savedId,
            funcao_id: fId,
          }));

          const { error: juncErr } = await supabase
            .from('voluntario_funcoes')
            .insert(rowsToInsert);

          if (juncErr) {
            console.warn('Erro ao associar funções ao voluntário:', juncErr);
          }
        }
      }

      return {
        data: {
          id: savedId!,
          nome: voluntario.nome || '',
          sobrenome: voluntario.sobrenome || '',
          email: voluntario.email || '',
          celular: voluntario.celular || '',
          ativo: voluntario.ativo ?? true,
          user_id: voluntario.user_id || null,
          funcoes_ids: funcaoIds,
        },
        error: null,
      };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  },

  /**
   * Toggle volunteer active status
   */
  async toggleVoluntarioStatus(id: string, currentAtivo: boolean): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase não configurado' };

    try {
      const { error } = await supabase
        .from('voluntarios')
        .update({ ativo: !currentAtivo })
        .eq('id', id);

      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Delete volunteer and its function junction records
   */
  async deleteVoluntario(id: string): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase não configurado' };

    try {
      // First delete junctions
      await supabase.from('voluntario_funcoes').delete().eq('voluntario_id', id);

      // Delete volunteer
      const { error } = await supabase.from('voluntarios').delete().eq('id', id);

      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Fetch profiles list from public.perfis to allow user linking
   */
  async getPerfisSimple(): Promise<{ data: PerfilSimple[]; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: [], error: 'Supabase não configurado' };

    try {
      const { data, error } = await supabase
        .from('perfis')
        .select('id, nome, sobrenome, nivel_acesso, avatar_url')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (error) return { data: [], error: error.message };
      return { data: data as PerfilSimple[], error: null };
    } catch (err: any) {
      return { data: [], error: err.message };
    }
  },
};
