import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  IndisponibilidadeRecord, 
  PeriodoIndisponibilidade, 
  VoluntarioRecord 
} from '../../types';
import { 
  unavailabilityService, 
  REASON_PRESETS 
} from '../../services/unavailabilityService';
import { mediaService } from '../../services/mediaService';
import { 
  CalendarOff, 
  Plus, 
  Info, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sun, 
  Moon, 
  Clock, 
  Users, 
  User, 
  RefreshCw, 
  Calendar, 
  Tag, 
  Check, 
  Search,
  Filter,
  ShieldAlert
} from 'lucide-react';

export const IndisponibilidadesView: React.FC = () => {
  const { user } = useAuth();
  const isLeaderOrAdmin = user?.role === 'admin' || user?.role === 'leader';

  // Sub-tabs for Leader: "Minhas Ausências" vs "Todas da Equipe"
  const [leaderViewMode, setLeaderViewMode] = useState<'my' | 'team'>('my');

  // Filter for future vs past unavailabilities
  const [timeFilter, setTimeFilter] = useState<'future' | 'past' | 'all'>('future');
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [indisponibilidades, setIndisponibilidades] = useState<IndisponibilidadeRecord[]>([]);
  const [voluntariosList, setVoluntariosList] = useState<VoluntarioRecord[]>([]);
  const [currentVoluntario, setCurrentVoluntario] = useState<VoluntarioRecord | null>(null);

  // Loading & Feedback
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Modal / Bottom-Sheet state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Fields
  const [targetVoluntarioId, setTargetVoluntarioId] = useState<string>('');
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [period, setPeriod] = useState<PeriodoIndisponibilidade>('dia_inteiro');
  const [selectedReason, setSelectedReason] = useState<string>('Viagem');
  const [customReason, setCustomReason] = useState<string>('');
  const [observacao, setObservacao] = useState<string>('');

  // Set default start date to today in YYYY-MM-DD
  const getTodayStr = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setNotice({ type, text });
    setTimeout(() => {
      setNotice(null);
    }, 4000);
  };

  // Initial Load
  const loadData = async () => {
    setLoading(true);
    setNotice(null);

    // 1. Identify volunteer record for authenticated user
    let userVol: VoluntarioRecord | null = null;
    if (user) {
      const volRes = await unavailabilityService.getVoluntarioForCurrentUser(user.id, user.email);
      userVol = volRes.voluntario;
      setCurrentVoluntario(userVol);
    }

    // 2. Load all volunteers (useful for Leaders or dropdowns)
    const volsRes = await mediaService.getVoluntarios();
    setVoluntariosList(volsRes.data);

    // 3. Load unavailabilities
    // If not leader, filter only for user's volunteer ID (if found)
    const filterVolId = (!isLeaderOrAdmin && userVol) ? userVol.id : undefined;
    const indRes = await unavailabilityService.getIndisponibilidades(filterVolId);

    setIndisponibilidades(indRes.data);

    if (indRes.error) {
      setNotice({
        type: 'error',
        text: `Aviso Supabase: ${indRes.error}. Se a tabela 'indisponibilidades' não existir ainda no projeto Supabase, crie-a para sincronizar.`,
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Open modal with defaults
  const handleOpenNewModal = () => {
    const today = getTodayStr();
    setDateMode('single');
    setStartDate(today);
    setEndDate(today);
    setPeriod('dia_inteiro');
    setSelectedReason('Viagem');
    setCustomReason('');
    setObservacao('');

    // Default target volunteer
    if (currentVoluntario) {
      setTargetVoluntarioId(currentVoluntario.id);
    } else if (voluntariosList.length > 0) {
      setTargetVoluntarioId(voluntariosList[0].id);
    } else {
      setTargetVoluntarioId('');
    }

    setIsModalOpen(true);
  };

  // Handle submit form
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetVoluntarioId) {
      showToast('error', 'Selecione um voluntário para registrar a indisponibilidade.');
      return;
    }

    if (!startDate) {
      showToast('error', 'Selecione a data de início.');
      return;
    }

    const finalEndDate = dateMode === 'range' ? endDate : startDate;

    if (dateMode === 'range' && finalEndDate < startDate) {
      showToast('error', 'A data de término não pode ser anterior à data de início.');
      return;
    }

    const finalReason = selectedReason === 'Outro' && customReason.trim()
      ? customReason.trim()
      : selectedReason;

    setActionLoading(true);

    const result = await unavailabilityService.createIndisponibilidade({
      voluntario_id: targetVoluntarioId,
      data_inicio: startDate,
      data_fim: finalEndDate,
      periodo: period,
      motivo: finalReason,
      observacao: observacao.trim(),
    });

    setActionLoading(false);

    if (result.error) {
      showToast('error', `Erro ao salvar indisponibilidade: ${result.error}`);
    } else {
      showToast('success', 'Indisponibilidade registrada com sucesso!');
      setIsModalOpen(false);
      loadData();
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    setActionLoading(true);
    const result = await unavailabilityService.deleteIndisponibilidade(id);
    setActionLoading(false);
    setDeleteConfirmId(null);

    if (result.error) {
      showToast('error', `Erro ao excluir: ${result.error}`);
    } else {
      showToast('success', 'Indisponibilidade removida.');
      loadData();
    }
  };

  // Date display formatter: YYYY-MM-DD -> 18/Out/2026
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthIdx = parseInt(month, 10) - 1;
    return `${day}/${months[monthIdx] || month}/${year}`;
  };

  const todayStr = getTodayStr();

  // Filter list
  const filteredIndisponibilidades = indisponibilidades.filter((item) => {
    // 1. Leader View Filter (My vs Team)
    if (isLeaderOrAdmin) {
      if (leaderViewMode === 'my') {
        if (currentVoluntario && item.voluntario_id !== currentVoluntario.id) {
          return false;
        }
      }
    }

    // 2. Time filter (Future vs Past vs All)
    if (timeFilter === 'future') {
      if (item.data_fim < todayStr) return false;
    } else if (timeFilter === 'past') {
      if (item.data_fim >= todayStr) return false;
    }

    // 3. Search Query
    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase();
      const volName = `${item.voluntario_nome} ${item.voluntario_sobrenome}`.toLowerCase();
      const reason = item.motivo.toLowerCase();
      const obs = (item.observacao || '').toLowerCase();
      return volName.includes(term) || reason.includes(term) || obs.includes(term);
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* HEADER BANNER */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
        <h1 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white tracking-tight">
          Minhas Indisponibilidades
        </h1>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 transition-all touch-active min-h-[38px]"
          title="Atualizar dados"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      </div>

      {/* NOTICE TOAST */}
      {notice && (
        <div
          className={`p-4 text-xs sm:text-sm font-medium rounded-2xl border flex items-start gap-2.5 animate-fadeIn shadow-sm ${
            notice.type === 'error'
              ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
              : notice.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20'
          }`}
        >
          {notice.type === 'error' ? (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          ) : (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
          )}
          <span className="flex-1 leading-relaxed">{notice.text}</span>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* UNLINKED VOLUNTEER WARNING BANNER FOR REGULAR VOLUNTEERS */}
      {!currentVoluntario && !isLeaderOrAdmin && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
          <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">Ficha de Voluntário Não Vinculada</span>
            <span>
              Sua conta ainda não está associada a uma ficha na equipe de mídia em public.voluntarios. Solicite ao seu líder para vincular seu e-mail ({user?.email}) na aba de Voluntários.
            </span>
          </div>
        </div>
      )}

      {/* VIEW SWITCHER FOR LEADERS / ADMINS */}
      {isLeaderOrAdmin && (
        <div className="flex items-center justify-between flex-wrap gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setLeaderViewMode('my')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                leaderViewMode === 'my'
                  ? 'bg-slate-900 text-amber-400 border border-amber-400/30 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Minhas Ausências</span>
            </button>

            <button
              onClick={() => setLeaderViewMode('team')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                leaderViewMode === 'team'
                  ? 'bg-slate-900 text-amber-400 border border-amber-400/30 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Todas da Equipe (Visão Consolidada)</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Exibindo: <strong className="text-slate-900 dark:text-white">{filteredIndisponibilidades.length}</strong> registro(s)
          </div>
        </div>
      )}

      {/* TOOLBAR: TIME FILTER & SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Time Filters */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setTimeFilter('future')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              timeFilter === 'future'
                ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Próximas / Ativas
          </button>
          <button
            onClick={() => setTimeFilter('past')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              timeFilter === 'past'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Passadas
          </button>
          <button
            onClick={() => setTimeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              timeFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Todas
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por voluntário ou motivo..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[38px]"
          />
        </div>
      </div>

      {/* CONTENT: LOADING, EMPTY OR LIST */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto mb-3" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Carregando indisponibilidades do Supabase...
          </p>
        </div>
      ) : filteredIndisponibilidades.length === 0 ? (
        /* EMPTY STATE */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center shadow-sm max-w-xl mx-auto my-6">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mx-auto mb-4">
            <CalendarOff className="w-8 h-8" />
          </div>
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-2">
            Nenhuma indisponibilidade encontrada
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6 max-w-md mx-auto">
            {timeFilter === 'future'
              ? 'Você e sua equipe estão totalmente disponíveis para as próximas escalas! Caso saiba de alguma ausência, registre com antecedência.'
              : 'Nenhum registro de ausência corresponde aos filtros aplicados.'}
          </p>
          <button
            onClick={handleOpenNewModal}
            className="inline-flex items-center gap-2 px-5 py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-amber-400 font-bold text-xs sm:text-sm rounded-xl border border-amber-400/30 shadow-md min-h-[44px]"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Registrar Indisponibilidade</span>
          </button>
        </div>
      ) : (
        /* CARDS GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIndisponibilidades.map((item) => {
            const isPast = item.data_fim < todayStr;
            const isSingleDay = item.data_inicio === item.data_fim;

            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border ${
                  isPast
                    ? 'border-slate-200/60 dark:border-slate-800/60 opacity-60'
                    : 'border-slate-200 dark:border-slate-800 hover:border-amber-400/40'
                } p-5 shadow-sm space-y-4 flex flex-col justify-between transition-all`}
              >
                <div className="space-y-3">
                  {/* Card Header: Period Badge & Trash Action */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Period Badge */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.periodo === 'dia_inteiro'
                            ? 'bg-amber-400/10 text-amber-600 dark:text-amber-400 border border-amber-400/20'
                            : item.periodo === 'manha'
                            ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                            : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                        }`}
                      >
                        {item.periodo === 'dia_inteiro'
                          ? 'Dia Inteiro / Ambos Cultos'
                          : item.periodo === 'manha'
                          ? 'Apenas Manhã'
                          : 'Apenas Noite'}
                      </span>

                      {/* Past Badge */}
                      {isPast && (
                        <span className="px-2 py-0.2 rounded text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-500">
                          Passada
                        </span>
                      )}
                    </div>

                    {/* Delete action */}
                    <button
                      onClick={() => setDeleteConfirmId(item.id)}
                      className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Excluir indisponibilidade"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Volunteer Name (If Leader Team View) */}
                  {(leaderViewMode === 'team' || isLeaderOrAdmin) && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-800 text-amber-400 font-bold text-xs flex items-center justify-center border border-slate-700">
                        {item.voluntario_nome?.[0] || 'V'}
                      </div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {item.voluntario_nome} {item.voluntario_sobrenome}
                      </span>
                    </div>
                  )}

                  {/* Dates Display */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {isSingleDay ? (
                        <span>Data: {formatDateDisplay(item.data_inicio)}</span>
                      ) : (
                        <span>
                          {formatDateDisplay(item.data_inicio)} até {formatDateDisplay(item.data_fim)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Reason & Details */}
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      {item.motivo}
                    </span>

                    {item.observacao && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 pt-1 leading-relaxed italic">
                        "{item.observacao}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Sincronizado via Supabase</span>
                  <Clock className="w-3 h-3 text-slate-400" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- CONFIRMATION DIALOG FOR DELETE --- */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Excluir Indisponibilidade?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Esta ação removerá o registro de ausência no Supabase e liberará o voluntário para escalas.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm min-h-[44px] flex items-center justify-center"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Confirmar Exclusão</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL / BOTTOM-SHEET: REGISTRAR INDISPONIBILIDADE --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full sm:max-w-lg rounded-t-[32px] sm:rounded-3xl border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center font-bold">
                  <CalendarOff className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white">
                    Registrar Indisponibilidade
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Sincronização direta com a tabela public.indisponibilidades
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreate} className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Leader Selector: Registrar para... */}
              {isLeaderOrAdmin && voluntariosList.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Registrar para o Voluntário:
                  </label>
                  <select
                    value={targetVoluntarioId}
                    onChange={(e) => setTargetVoluntarioId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
                  >
                    {voluntariosList.map((vol) => (
                      <option key={vol.id} value={vol.id}>
                        {vol.nome} {vol.sobrenome} {vol.email ? `(${vol.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date Mode Selector: Apenas 1 Dia vs Intervalo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Tipo de Ausência:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDateMode('single')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all min-h-[44px] ${
                      dateMode === 'single'
                        ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Apenas 1 Dia (Culto)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateMode('range')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all min-h-[44px] ${
                      dateMode === 'range'
                        ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Intervalo (Viagem / Férias)
                  </button>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {dateMode === 'range' ? 'Data Inicial' : 'Data da Ausência'}{' '}
                    <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (dateMode === 'single') setEndDate(e.target.value);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
                  />
                </div>

                {dateMode === 'range' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Data Final <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
                    />
                  </div>
                )}
              </div>

              {/* Period Selector Chips */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Período da Indisponibilidade:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPeriod('dia_inteiro')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all min-h-[48px] justify-center ${
                      period === 'dia_inteiro'
                        ? 'bg-amber-400/20 text-amber-700 dark:text-amber-300 border-amber-400 font-bold'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span>Dia Inteiro</span>
                    <span className="text-[10px] opacity-75 font-normal">Ambos os Cultos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPeriod('manha')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all min-h-[48px] justify-center ${
                      period === 'manha'
                        ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-400 font-bold'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Apenas Manhã</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPeriod('noite')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all min-h-[48px] justify-center ${
                      period === 'noite'
                        ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-400 font-bold'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Apenas Noite</span>
                  </button>
                </div>
              </div>

              {/* Preset Reason Chips */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Motivo da Ausência:
                </label>
                <div className="flex flex-wrap gap-2">
                  {REASON_PRESETS.map((reason) => {
                    const isSelected = selectedReason === reason;
                    return (
                      <button
                        type="button"
                        key={reason}
                        onClick={() => setSelectedReason(reason)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all min-h-[36px] ${
                          isSelected
                            ? 'bg-slate-900 dark:bg-slate-800 text-amber-400 font-bold border-amber-400/40 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {reason}
                      </button>
                    );
                  })}
                </div>

                {selectedReason === 'Outro' && (
                  <input
                    type="text"
                    required
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Especifique o motivo..."
                    className="w-full mt-2.5 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
                  />
                )}
              </div>

              {/* Observação Adicional */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observação Curta (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Ex: Chego após às 19h no domingo..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 rounded-xl min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-slate-800 text-amber-400 font-bold text-xs sm:text-sm rounded-xl border border-amber-400/30 hover:bg-slate-800 min-h-[44px]"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  ) : (
                    <span>Salvar Indisponibilidade</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLOATING ACTION BUTTON (FAB) */}
      <div className="fixed bottom-18 right-4 sm:bottom-20 sm:right-6 z-40">
        <button
          onClick={handleOpenNewModal}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-400 text-slate-950 shadow-xl border-2 border-slate-900 flex items-center justify-center font-bold hover:scale-105 active:scale-95 transition-all touch-active"
          aria-label="Registrar Indisponibilidade"
          title="Registrar Indisponibilidade"
        >
          <Plus className="w-6 h-6 text-slate-950" />
        </button>
      </div>
    </div>
  );
};
