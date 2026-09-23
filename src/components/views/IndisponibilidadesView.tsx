import React, { useEffect, useState, useMemo } from 'react';
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
  ShieldAlert,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export interface IndisponibilidadesViewProps {
  hideHeader?: boolean;
}

export const IndisponibilidadesView: React.FC<IndisponibilidadesViewProps> = ({ hideHeader = false }) => {
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

  // Open modal with defaults, optionally pre-filling clicked date
  const handleOpenNewModal = (initialDate?: string) => {
    const today = initialDate || getTodayStr();
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
      showToast('error', 'Selecione um voluntário para registrar a restrição.');
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
      showToast('error', `Erro ao salvar restrição: ${result.error}`);
    } else {
      showToast('success', 'Restrição registrada com sucesso!');
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
      showToast('success', 'Restrição removida.');
      loadData();
    }
  };


  const todayStr = getTodayStr();

  const now = new Date();
  const [calendarYear, setCalendarYear] = useState<number>(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(now.getMonth() + 1); // 1-12
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(now.toISOString().split('T')[0]);
  const [showAllMonth, setShowAllMonth] = useState<boolean>(false);

  const MESES_NOMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const DIAS_SEMANA_HEADERS = [
    { short: 'DOM', full: 'Domingo' },
    { short: 'SEG', full: 'Segunda-feira' },
    { short: 'TER', full: 'Terça-feira' },
    { short: 'QUA', full: 'Quarta-feira' },
    { short: 'QUI', full: 'Quinta-feira' },
    { short: 'SEX', full: 'Sexta-feira' },
    { short: 'SÁB', full: 'Sábado' },
  ];

  const handlePrevCalendarMonth = () => {
    if (calendarMonth === 1) {
      setCalendarMonth(12);
      setCalendarYear((prev) => prev - 1);
    } else {
      setCalendarMonth((prev) => prev - 1);
    }
  };

  const handleNextCalendarMonth = () => {
    if (calendarMonth === 12) {
      setCalendarMonth(1);
      setCalendarYear((prev) => prev + 1);
    } else {
      setCalendarMonth((prev) => prev + 1);
    }
  };

  const handleGoToToday = () => {
    const today = new Date();
    setCalendarYear(today.getFullYear());
    setCalendarMonth(today.getMonth() + 1);
    setSelectedCalendarDate(today.toISOString().split('T')[0]);
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

  // Date header formatter: YYYY-MM-DD -> Quarta-feira, 23/09/2026
  const formatDateHeader = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const dayOfWeek = daysOfWeek[dateObj.getDay()] || '';
    return `${dayOfWeek}, ${day}/${month}/${year}`;
  };

  // Filter list
  const filteredIndisponibilidades = useMemo(() => {
    return indisponibilidades.filter((item) => {
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
  }, [indisponibilidades, isLeaderOrAdmin, leaderViewMode, currentVoluntario, timeFilter, todayStr, searchQuery]);

  // Calendar days grid generator
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth - 1, 1);
    const lastDay = new Date(calendarYear, calendarMonth, 0);

    const startDayOfWeek = firstDay.getDay(); // 0 = Domingo
    const totalDays = lastDay.getDate();

    const prevMonthTotalDays = new Date(calendarYear, calendarMonth - 1, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      dayOfWeek: number;
    }> = [];

    const todayString = new Date().toISOString().split('T')[0];

    // Days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthTotalDays - i;
      const prevDate = new Date(calendarYear, calendarMonth - 2, d);
      const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayString,
        dayOfWeek: prevDate.getDay(),
      });
    }

    // Days of current month
    for (let d = 1; d <= totalDays; d++) {
      const curDate = new Date(calendarYear, calendarMonth - 1, d);
      const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayString,
        dayOfWeek: curDate.getDay(),
      });
    }

    // Days from next month
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(calendarYear, calendarMonth, d);
      const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayString,
        dayOfWeek: nextDate.getDay(),
      });
    }

    return days;
  }, [calendarYear, calendarMonth]);

  // Helper to check restrictions for a date
  const getRestrictionsForDate = (dateStr: string) => {
    return filteredIndisponibilidades.filter(
      (item) => dateStr >= item.data_inicio && dateStr <= item.data_fim
    );
  };

  const currentMonthRestrictions = useMemo(() => {
    const prefix = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}`;
    return filteredIndisponibilidades.filter((item) => {
      return item.data_inicio.startsWith(prefix) || item.data_fim.startsWith(prefix) ||
             (item.data_inicio <= `${prefix}-31` && item.data_fim >= `${prefix}-01`);
    });
  }, [filteredIndisponibilidades, calendarYear, calendarMonth]);



  return (
    <div className="space-y-4 sm:space-y-5 animate-fadeIn pb-12">
      {/* HEADER BANNER */}
      {!hideHeader && (
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
          <h1 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white tracking-tight">
            Restrições de Escala
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
      )}

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

      {/* UNIFIED CONTROLS TOOLBAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Left Section: View Switcher (for Leaders) + Time Filter */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Leader Switcher */}
          {isLeaderOrAdmin && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setLeaderViewMode('my')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[32px] ${
                  leaderViewMode === 'my'
                    ? 'bg-black text-amber-400 border border-amber-400/30 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Minhas Restrições</span>
              </button>

              <button
                onClick={() => setLeaderViewMode('team')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[32px] ${
                  leaderViewMode === 'team'
                    ? 'bg-black text-amber-400 border border-amber-400/30 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Restrições da Equipe</span>
              </button>
            </div>
          )}

          {isLeaderOrAdmin && (
            <div className="hidden sm:block h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
          )}

          {/* Time Filters */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setTimeFilter('future')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${
                timeFilter === 'future'
                  ? 'bg-black text-amber-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Próximas / Ativas
            </button>
            <button
              onClick={() => setTimeFilter('past')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${
                timeFilter === 'past'
                  ? 'bg-black text-amber-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Passadas
            </button>
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${
                timeFilter === 'all'
                  ? 'bg-black text-amber-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todas
            </button>
          </div>
        </div>

        {/* Right Section: Search, Count & New Restriction */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto flex-wrap">
          {/* Search */}
          <div className="relative flex-1 lg:w-56">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por voluntário ou motivo..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[34px]"
            />
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap shrink-0">
            <strong className="text-slate-900 dark:text-white font-bold">{filteredIndisponibilidades.length}</strong> registro(s)
          </div>

          <button
            onClick={() => handleOpenNewModal(selectedCalendarDate)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-neutral-900 text-amber-400 font-bold text-xs rounded-xl border border-amber-400/30 transition-all shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Nova Restrição</span>
          </button>
        </div>
      </div>

      {/* CONTENT: LOADING OR CALENDAR + RESTRICTIONS VIEW */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto mb-3" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Carregando restrições do Supabase...
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
          {/* Calendar Header with Month Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-400/10 text-amber-500 flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                  {MESES_NOMES[calendarMonth - 1]} {calendarYear}
                </h3>
                <p className="text-xs text-slate-400">
                  {currentMonthRestrictions.length} restriç{currentMonthRestrictions.length !== 1 ? 'ões' : 'ão'} registrada{currentMonthRestrictions.length !== 1 ? 's' : ''} no mês
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevCalendarMonth}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleGoToToday}
                className="px-3 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-400/10 rounded-xl transition-colors"
              >
                Hoje
              </button>
              <button
                onClick={handleNextCalendarMonth}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center pt-1">
            {DIAS_SEMANA_HEADERS.map((h) => (
              <span
                key={h.short}
                className={`text-xs font-black uppercase py-1 ${
                  h.short === 'DOM' ? 'text-amber-500 font-bold' : 'text-slate-400'
                }`}
              >
                {h.short}
              </span>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarDays.map((day) => {
              const isSelected = selectedCalendarDate === day.dateStr;
              const dayRestrictions = getRestrictionsForDate(day.dateStr);
              const hasRestrictions = dayRestrictions.length > 0;

              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => {
                    setSelectedCalendarDate(day.dateStr);
                    if (!day.isCurrentMonth) {
                      const [y, m] = day.dateStr.split('-');
                      setCalendarYear(parseInt(y));
                      setCalendarMonth(parseInt(m));
                    }
                    handleOpenNewModal(day.dateStr);
                  }}
                  title={`Clique para registrar restrição em ${day.dateStr.split('-').reverse().join('/')}${hasRestrictions ? ` (${dayRestrictions.length} restrições registradas)` : ''}`}
                  className={`min-h-[72px] sm:min-h-[96px] p-2 sm:p-2.5 rounded-2xl flex flex-col justify-between items-stretch text-left transition-all border group relative ${
                    isSelected
                      ? 'bg-amber-400/10 border-amber-400 shadow-sm ring-2 ring-amber-400/30'
                      : day.isToday
                      ? 'bg-slate-50 dark:bg-slate-800/80 border-amber-400/60 shadow-xs'
                      : !day.isCurrentMonth
                      ? 'bg-slate-50/40 dark:bg-slate-900/40 border-transparent opacity-30 hover:opacity-75'
                      : hasRestrictions
                      ? 'bg-amber-500/5 dark:bg-amber-400/5 border-amber-500/20 hover:border-amber-400/50 hover:bg-amber-400/10'
                      : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:border-amber-400/40 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        day.isToday
                          ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                          : day.isCurrentMonth
                          ? 'text-slate-800 dark:text-slate-200 group-hover:text-amber-500'
                          : 'text-slate-400 dark:text-slate-600'
                      }`}
                    >
                      {day.dayNumber}
                    </span>

                    {hasRestrictions && (
                      <span className="hidden sm:inline-flex px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20">
                        {dayRestrictions.length} {dayRestrictions.length === 1 ? 'restrição' : 'restrições'}
                      </span>
                    )}
                  </div>

                  {/* Restrictions indicators or mini-chips */}
                  <div className="w-full space-y-1 mt-1">
                    {hasRestrictions ? (
                      <>
                        {/* Desktop chips */}
                        <div className="hidden sm:flex flex-col gap-1">
                          {dayRestrictions.slice(0, 2).map((r) => (
                            <div
                              key={r.id}
                              className="truncate px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-400/20 dark:bg-amber-400/15 text-amber-900 dark:text-amber-300 border border-amber-400/30 flex items-center justify-between gap-1"
                              title={`${r.voluntario_nome}: ${r.motivo} (${r.periodo})`}
                            >
                              <span className="truncate">{r.voluntario_nome}: {r.motivo}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(r.id);
                                }}
                                className="text-slate-400 hover:text-red-500 shrink-0"
                                title="Excluir restrição"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                          {dayRestrictions.length > 2 && (
                            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 pl-1">
                              +{dayRestrictions.length - 2} mais
                            </span>
                          )}
                        </div>

                        {/* Mobile dot badges */}
                        <div className="flex sm:hidden items-center justify-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          {dayRestrictions.length > 1 && (
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity py-1">
                        <span className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5">
                          <Plus className="w-3 h-3" /> Registrar
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend & Instructions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Dias com restrição registrada</span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
              💡 Clique em qualquer data para abrir o formulário e cadastrar uma restrição.
            </p>
          </div>
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
                Excluir Restrição?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Esta ação removerá o registro de restrição no Supabase e liberará o voluntário para escalas.
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
            <div className="bg-black text-white px-6 py-4 flex items-center justify-between border-b border-neutral-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center font-bold">
                  <CalendarOff className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white">
                    Registrar Restrição
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
                  Tipo de Restrição:
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
                    {dateMode === 'range' ? 'Data Inicial' : 'Data da Restrição'}{' '}
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
                  Turno da Restrição:
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
                        ? 'bg-black text-amber-400 border-amber-400 font-bold shadow-xs'
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
                  Motivo da Restrição:
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
                            ? 'bg-black text-amber-400 font-bold border-amber-400/40 shadow-xs'
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
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-black hover:bg-neutral-900 text-amber-400 font-bold text-xs sm:text-sm rounded-xl border border-amber-400/30 min-h-[44px] shadow-xs"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  ) : (
                    <span>Salvar Restrição</span>
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
          onClick={() => handleOpenNewModal()}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-400 text-slate-950 shadow-xl border-2 border-slate-900 flex items-center justify-center font-bold hover:scale-105 active:scale-95 transition-all touch-active"
          aria-label="Registrar Restrição"
          title="Registrar Restrição"
        >
          <Plus className="w-6 h-6 text-slate-950" />
        </button>
      </div>
    </div>
  );
};
