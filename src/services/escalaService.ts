import { getSupabaseClient } from '../lib/supabase';
import { 
  CultoRecord, 
  EscalaItemRecord, 
  CultoComEscala, 
  FuncaoRecord, 
  VoluntarioRecord, 
  IndisponibilidadeRecord,
  TipoCultoRecord
} from '../types';
import { tipoCultoService } from './tipoCultoService';

export const SERVICE_TITLE_PRESETS = [
  'Domingo - Manhã',
  'Domingo - Noite',
  'Culto de Quarta',
  'Culto de Jovens',
];

export const escalaService = {
  /**
   * Fetch all cultos with their scale assignments
   */
  async getCultosComEscalas(): Promise<{ data: CultoComEscala[]; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: [], error: 'Supabase não configurado' };

    try {
      // 1. Fetch Cultos
      const { data: cultosData, error: cultosErr } = await supabase
        .from('cultos')
        .select('*')
        .order('data', { ascending: true })
        .order('horario', { ascending: true });

      if (cultosErr) {
        return { data: [], error: cultosErr.message };
      }

      if (!cultosData || cultosData.length === 0) {
        return { data: [], error: null };
      }

      // 2. Fetch Escala Itens joined with funcoes & voluntarios
      const cultoIds = cultosData.map((c: any) => c.id);
      const { data: itensData, error: itensErr } = await supabase
        .from('escala_itens')
        .select('*, funcoes(id, nome, cor), voluntarios(id, nome, sobrenome)')
        .in('culto_id', cultoIds);

      const itemsMap: Record<string, EscalaItemRecord[]> = {};

      if (itensData) {
        itensData.forEach((item: any) => {
          const cId = item.culto_id;
          if (!itemsMap[cId]) itemsMap[cId] = [];

          const fn = item.funcoes;
          const vol = item.voluntarios;
          const st = (item.status_confirmacao || item.status || 'pendente') as 'pendente' | 'confirmado' | 'recusado';

          itemsMap[cId].push({
            id: item.id,
            culto_id: cId,
            funcao_id: item.funcao_id,
            funcao_nome: fn?.nome || item.funcao_nome || 'Função',
            funcao_cor: fn?.cor || item.funcao_cor || 'bg-blue-500',
            voluntario_id: item.voluntario_id || null,
            voluntario_nome: vol?.nome || item.voluntario_nome || '',
            voluntario_sobrenome: vol?.sobrenome || item.voluntario_sobrenome || '',
            status: st,
            status_confirmacao: st,
            motivo_recusa: item.motivo_recusa || null,
          });
        });
      }

      // 3. Format result
      const result: CultoComEscala[] = cultosData.map((c: any) => ({
        culto: {
          id: c.id,
          titulo: c.titulo,
          data: c.data,
          horario: c.horario,
          periodo: c.periodo || 'manha',
          observacao: c.observacao || '',
          created_at: c.created_at,
        },
        escala_itens: itemsMap[c.id] || [],
      }));

      return { data: result, error: null };
    } catch (err: any) {
      return { data: [], error: err.message };
    }
  },

  /**
   * Create a new Culto and populate default function slots
   */
  async createCulto(
    cultoData: Partial<CultoRecord>,
    activeFuncoes: FuncaoRecord[] = []
  ): Promise<{ data: CultoRecord | null; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: null, error: 'Supabase não configurado' };

    try {
      const { data, error } = await supabase
        .from('cultos')
        .insert({
          titulo: cultoData.titulo,
          data: cultoData.data,
          horario: cultoData.horario,
          periodo: cultoData.periodo || 'manha',
          observacao: cultoData.observacao || '',
        })
        .select()
        .single();

      if (error) return { data: null, error: error.message };

      // Initialize empty slots for all active functions
      if (activeFuncoes && activeFuncoes.length > 0) {
        const defaultSlots = activeFuncoes.map((fn) => ({
          culto_id: data.id,
          funcao_id: fn.id,
          voluntario_id: null,
          status: 'pendente',
        }));

        await supabase.from('escala_itens').insert(defaultSlots);
      }

      return {
        data: {
          id: data.id,
          titulo: data.titulo,
          data: data.data,
          horario: data.horario,
          periodo: data.periodo,
          observacao: data.observacao,
        },
        error: null,
      };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  },

  /**
   * Smart recurrence engine for generating cults of a given month from public.tipos_culto
   */
  async createCultosDoMes(
    year: number,
    month: number, // 1 - 12
    activeFuncoes: FuncaoRecord[] = []
  ): Promise<{ count: number; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { count: 0, error: 'Supabase não configurado' };

    try {
      // 1. Fetch active tipos_culto templates from Supabase
      const { data: modelos } = await tipoCultoService.getTiposCulto();
      let activeModelos = (modelos || []).filter((m) => m.ativo !== false);

      // If no models exist in Supabase yet, insert default models
      if (activeModelos.length === 0) {
        const defaultTemplates = [
          { nome: 'Culto de Domingo - Manhã', dia_semana: 0, semana_mes: null, meses_intervalo: 1, horario: '09:00', periodo: 'Manhã', ativo: true },
          { nome: 'Culto de Domingo - Noite', dia_semana: 0, semana_mes: null, meses_intervalo: 1, horario: '18:00', periodo: 'Noite', ativo: true },
          { nome: 'Culto de Quarta', dia_semana: 3, semana_mes: null, meses_intervalo: 1, horario: '19:30', periodo: 'Noite', ativo: true },
        ];
        for (const tmpl of defaultTemplates) {
          await tipoCultoService.createTipoCulto(tmpl);
        }
        const refreshed = await tipoCultoService.getTiposCulto();
        activeModelos = (refreshed.data || []).filter((m) => m.ativo !== false);
      }

      // 2. Fetch existing cultos in target month to avoid duplicate creation
      const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const { data: existingCultos } = await supabase
        .from('cultos')
        .select('data, horario, periodo')
        .gte('data', startDateStr)
        .lte('data', endDateStr);

      const existingSet = new Set<string>();
      if (existingCultos) {
        existingCultos.forEach((c: any) => {
          const shortTime = (c.horario || '').substring(0, 5);
          existingSet.add(`${c.data}_${shortTime}`);
        });
      }

      // 3. Iterate through every day of the month
      const daysInMonth = new Date(year, month, 0).getDate();
      const candidateCultos: Array<{
        titulo: string;
        data: string;
        horario: string;
        periodo: 'manha' | 'noite' | 'integral';
      }> = [];

      const weekdayCounters: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month - 1, day);
        const dayOfWeek = currentDate.getDay(); // 0=Dom ... 6=Sáb

        weekdayCounters[dayOfWeek] = (weekdayCounters[dayOfWeek] || 0) + 1;
        const occurrenceIndex = weekdayCounters[dayOfWeek]; // 1, 2, 3, 4, 5

        const yyyy = currentDate.getFullYear();
        const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dd = String(currentDate.getDate()).padStart(2, '0');
        const formattedDate = `${yyyy}-${mm}-${dd}`;

        // Find matching models for this day
        const matchingModels = activeModelos.filter((modelo) => {
          if (modelo.dia_semana !== dayOfWeek) return false;

          // Check month interval
          if (modelo.meses_intervalo > 1) {
            if ((month - 1) % modelo.meses_intervalo !== 0) {
              return false;
            }
          }

          // Check week occurrence in month (semana_mes)
          if (modelo.semana_mes !== null && modelo.semana_mes !== 0) {
            if (modelo.semana_mes !== occurrenceIndex) {
              return false;
            }
          }

          return true;
        });

        if (matchingModels.length === 0) continue;

        // Group matching models by slot (periodo + time)
        const groupedBySlot: Record<string, TipoCultoRecord[]> = {};

        matchingModels.forEach((mod) => {
          const slotKey = `${(mod.periodo || '').toLowerCase()}_${mod.horario.substring(0, 5)}`;
          if (!groupedBySlot[slotKey]) groupedBySlot[slotKey] = [];
          groupedBySlot[slotKey].push(mod);
        });

        // Resolve overlaps: Specific rules (semana_mes !== null) take priority over generic rules (semana_mes === null)
        Object.values(groupedBySlot).forEach((slotModels) => {
          const specificModels = slotModels.filter(
            (m) => m.semana_mes !== null && m.semana_mes > 0
          );

          const chosenModels = specificModels.length > 0 ? specificModels : slotModels;

          chosenModels.forEach((mod) => {
            const shortTime = mod.horario.substring(0, 5);
            const key = `${formattedDate}_${shortTime}`;

            if (existingSet.has(key)) return;

            let periodoValue: 'manha' | 'noite' | 'integral' = 'manha';
            const lowerP = (mod.periodo || '').toLowerCase();
            if (lowerP.includes('noite') || lowerP.includes('tarde')) periodoValue = 'noite';
            else if (lowerP.includes('integral')) periodoValue = 'integral';

            candidateCultos.push({
              titulo: mod.nome,
              data: formattedDate,
              horario: shortTime,
              periodo: periodoValue,
            });

            existingSet.add(key);
          });
        });
      }

      let countCreated = 0;

      // 4. Batch/sequential creation of candidates
      for (const candidate of candidateCultos) {
        const res = await this.createCulto(candidate, activeFuncoes);
        if (!res.error) countCreated++;
      }

      return { count: countCreated, error: null };
    } catch (err: any) {
      return { count: 0, error: err.message };
    }
  },

  /**
   * Upsert assignment for a function slot in a service
   */
  async saveEscalaItem(
    cultoId: string,
    funcaoId: string,
    voluntarioId: string | null
  ): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase não configurado' };

    try {
      // Check if item already exists for this culto + funcao
      const { data: existing } = await supabase
        .from('escala_itens')
        .select('id')
        .eq('culto_id', cultoId)
        .eq('funcao_id', funcaoId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('escala_itens')
          .update({
            voluntario_id: voluntarioId,
            status_confirmacao: 'pendente',
            status: 'pendente',
            motivo_recusa: null,
          })
          .eq('id', existing.id);

        if (error) return { success: false, error: error.message };
      } else {
        const { error } = await supabase.from('escala_itens').insert({
          culto_id: cultoId,
          funcao_id: funcaoId,
          voluntario_id: voluntarioId,
          status_confirmacao: 'pendente',
          status: 'pendente',
          motivo_recusa: null,
        });

        if (error) return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Volunteer responds to assignment confirmation
   */
  async responderConfirmacao(
    escalaItemId: string,
    status: 'confirmado' | 'recusado',
    motivoRecusa?: string
  ): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase não configurado' };

    try {
      const payload: any = {
        status_confirmacao: status,
        status: status,
      };

      if (status === 'recusado') {
        payload.motivo_recusa = motivoRecusa || 'Motivo não informado';
      } else {
        payload.motivo_recusa = null;
      }

      const { error } = await supabase
        .from('escala_itens')
        .update(payload)
        .eq('id', escalaItemId);

      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Delete a service and its scale items
   */
  async deleteCulto(cultoId: string): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase não configurado' };

    try {
      // Delete items
      await supabase.from('escala_itens').delete().eq('culto_id', cultoId);

      // Delete culto
      const { error } = await supabase.from('cultos').delete().eq('id', cultoId);

      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Auto-suggest algorithm for scale generation
   */
  sugerirEscalaAutomatica(
    culto: CultoRecord,
    funcoes: FuncaoRecord[],
    voluntarios: VoluntarioRecord[],
    indisponibilidades: IndisponibilidadeRecord[],
    currentItens: EscalaItemRecord[],
    todasEscalasMes: CultoComEscala[]
  ): Record<string, string | null> {
    const updatedAssignments: Record<string, string | null> = {};

    // 1. Map monthly assignment counts per volunteer to balance workload
    const monthlyAssignmentCounts: Record<string, number> = {};
    voluntarios.forEach((v) => {
      monthlyAssignmentCounts[v.id] = 0;
    });

    todasEscalasMes.forEach((cComE) => {
      cComE.escala_itens.forEach((item) => {
        if (item.voluntario_id) {
          monthlyAssignmentCounts[item.voluntario_id] =
            (monthlyAssignmentCounts[item.voluntario_id] || 0) + 1;
        }
      });
    });

    // Track volunteers already assigned in THIS service
    const assignedInThisService = new Set<string>();
    currentItens.forEach((item) => {
      if (item.voluntario_id) {
        assignedInThisService.add(item.voluntario_id);
        updatedAssignments[item.funcao_id] = item.voluntario_id;
      }
    });

    // 2. Iterate through each function slot
    funcoes.forEach((fn) => {
      // If already filled, skip
      if (updatedAssignments[fn.id]) return;

      // Find eligible active volunteers
      const eligibleVolunteers = voluntarios.filter((vol) => {
        if (!vol.ativo) return false;

        // Must master function
        const masters = (vol.funcoes_ids || []).includes(fn.id);
        if (!masters) return false;

        // Must not be already assigned in this service
        if (assignedInThisService.has(vol.id)) return false;

        // Check unavailability conflict
        const isUnavailable = indisponibilidades.some((ind) => {
          if (ind.voluntario_id !== vol.id) return false;
          // Check date overlap
          const dateMatch = culto.data >= ind.data_inicio && culto.data <= ind.data_fim;
          if (!dateMatch) return false;
          // Check period overlap
          if (ind.periodo === 'dia_inteiro') return true;
          return ind.periodo === culto.periodo;
        });

        return !isUnavailable;
      });

      // Sort candidates by lowest monthly assignment count (balance workload)
      eligibleVolunteers.sort((a, b) => {
        const countA = monthlyAssignmentCounts[a.id] || 0;
        const countB = monthlyAssignmentCounts[b.id] || 0;
        return countA - countB;
      });

      // Pick top candidate if available
      if (eligibleVolunteers.length > 0) {
        const selectedVol = eligibleVolunteers[0];
        updatedAssignments[fn.id] = selectedVol.id;
        assignedInThisService.add(selectedVol.id);
        monthlyAssignmentCounts[selectedVol.id] = (monthlyAssignmentCounts[selectedVol.id] || 0) + 1;
      } else {
        updatedAssignments[fn.id] = null; // Unassigned / Vaga em aberto
      }
    });

    return updatedAssignments;
  },

  /**
   * Helper to build WhatsApp share text with emojis
   */
  generateWhatsAppShareText(culto: CultoRecord, itens: EscalaItemRecord[]): string {
    const formattedDateParts = culto.data.split('-');
    const dateFormatted =
      formattedDateParts.length === 3
        ? `${formattedDateParts[2]}/${formattedDateParts[1]}`
        : culto.data;

    let text = `📅 *TBC ESCALA - ${culto.titulo.toUpperCase()} (${dateFormatted})*\n`;
    text += `⏰ Horário: ${culto.horario}\n\n`;

    if (culto.observacao) {
      text += `📌 _Obs: ${culto.observacao}_\n\n`;
    }

    const emojiMap: Record<string, string> = {
      transmissao: '🎥',
      cameras: '📹',
      camera: '📹',
      som: '🎚️',
      audio: '🎚️',
      projecao: '💻',
      midia: '💻',
      fotografia: '📸',
      foto: '📸',
      iluminacao: '💡',
      luz: '💡',
    };

    itens.forEach((item) => {
      const fnName = item.funcao_nome || 'Função';
      const volName = item.voluntario_id
        ? `${item.voluntario_nome} ${item.voluntario_sobrenome}`.trim()
        : '_Vaga em aberto_';

      // Pick emoji by matching function name
      const lowerFn = fnName.toLowerCase();
      let icon = '✨';
      for (const [key, em] of Object.entries(emojiMap)) {
        if (lowerFn.includes(key)) {
          icon = em;
          break;
        }
      }

      text += `${icon} *${fnName}:* ${volName}\n`;
    });

    text += `\n_Por favor, confirme sua presença no app TBC Escala!_`;
    return text;
  },
};
