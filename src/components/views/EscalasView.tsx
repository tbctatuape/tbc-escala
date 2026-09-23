import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  CultoComEscala, 
  CultoRecord, 
  EscalaItemRecord, 
  FuncaoRecord, 
  VoluntarioRecord, 
  IndisponibilidadeRecord,
  TipoCultoRecord 
} from '../../types';
import { escalaService, SERVICE_TITLE_PRESETS } from '../../services/escalaService';
import { tipoCultoService } from '../../services/tipoCultoService';
import { mediaService } from '../../services/mediaService';
import { unavailabilityService } from '../../services/unavailabilityService';
import { TiposCultoManager } from './TiposCultoManager';
import { IndisponibilidadesView } from './IndisponibilidadesView';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Filter, 
  Clock, 
  Sparkles, 
  X, 
  Tv, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Share2, 
  Copy, 
  ExternalLink, 
  Trash2, 
  RefreshCw, 
  Edit3, 
  Wand2, 
  Users, 
  User, 
  Check, 
  AlertTriangle, 
  MessageSquare, 
  Sun, 
  Moon, 
  CalendarDays,
  UserCheck,
  XCircle,
  UserX,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  CalendarOff
} from 'lucide-react';

export interface EscalasViewProps {
  initialSubTab?: 'escalas' | 'restricoes';
}

export const EscalasView: React.FC<EscalasViewProps> = ({ initialSubTab = 'escalas' }) => {
  const { user } = useAuth();
  const isLeaderOrAdmin = user?.role === 'admin' || user?.role === 'leader';

  // Submenu: 'escalas' vs 'restricoes'
  const [activeMainSubTab, setActiveMainSubTab] = useState<'escalas' | 'restricoes'>(initialSubTab);

  const handleSwitchSubTab = (tab: 'escalas' | 'restricoes') => {
    setActiveMainSubTab(tab);
    if (tab === 'escalas') {
      loadData();
    }
  };

  // View Mode: 'calendar' (default) vs 'cards'
  const [viewMode, setViewMode] = useState<'calendar' | 'cards'>('calendar');

  // Sub-tabs in cards mode: "Próximos Cultos" vs "Histórico / Passados"
  const [tabMode, setTabMode] = useState<'upcoming' | 'past'>('upcoming');

  // Calendar Navigation
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showAllMonth, setShowAllMonth] = useState<boolean>(false);


  // Data States
  const [cultosComEscala, setCultosComEscala] = useState<CultoComEscala[]>([]);
  const [funcoes, setFuncoes] = useState<FuncaoRecord[]>([]);
  const [voluntarios, setVoluntarios] = useState<VoluntarioRecord[]>([]);
  const [indisponibilidades, setIndisponibilidades] = useState<IndisponibilidadeRecord[]>([]);
  const [tiposCulto, setTiposCulto] = useState<TipoCultoRecord[]>([]);
  const [currentUserVoluntario, setCurrentUserVoluntario] = useState<VoluntarioRecord | null>(null);

  // Loading & Feedback
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Modal 1: Novo Culto
  const [isNovoCultoModalOpen, setIsNovoCultoModalOpen] = useState(false);
  const [selectedModeloId, setSelectedModeloId] = useState<string>('');
  const [novoTitulo, setNovoTitulo] = useState('Domingo - Manhã');
  const [novaData, setNovaData] = useState('');
  const [novoHorario, setNovoHorario] = useState('09:00');
  const [novoPeriodo, setNovoPeriodo] = useState<'manha' | 'noite' | 'integral'>('manha');
  const [novaObservacao, setNovaObservacao] = useState('');

  // Modal Modelos Manager
  const [isModelosModalOpen, setIsModelosModalOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);

  // Modal 2: Criar Cultos do Mês
  const [isCultosMesModalOpen, setIsCultosMesModalOpen] = useState(false);
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear());
  const [targetMonth, setTargetMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedTiposCultoIds, setSelectedTiposCultoIds] = useState<string[]>([]);
  const [autoPreencherEscalas, setAutoPreencherEscalas] = useState<boolean>(true);

  // Modal 3: Editor de Escala do Culto
  const [editingCultoComEscala, setEditingCultoComEscala] = useState<CultoComEscala | null>(null);
  const [editedItens, setEditedItens] = useState<Record<string, string | null>>({}); // funcao_id -> voluntario_id
  const [replicateToSundaySister, setReplicateToSundaySister] = useState<boolean>(true);

  // Modal 4: Compartilhar WhatsApp
  const [shareCultoComEscala, setShareCultoComEscala] = useState<CultoComEscala | null>(null);
  const [shareText, setShareText] = useState('');

  // Confirm delete
  const [deleteCultoId, setDeleteCultoId] = useState<string | null>(null);

  // Modal 5: Recusa de Escala (Pedir Substituição)
  const [recusalTarget, setRecusalTarget] = useState<{
    item: EscalaItemRecord;
    cultoTitulo: string;
    cultoData: string;
  } | null>(null);
  const [recusalMotivoOpcao, setRecusalMotivoOpcao] = useState<string>('Trabalho / Estudo');
  const [recusalMotivoTexto, setRecusalMotivoTexto] = useState<string>('');

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

  // Handler: Confirmar Presença
  const handleConfirmarPresenca = async (item: EscalaItemRecord) => {
    if (!item.id) return;

    // Optimistic UI update
    setCultosComEscala((prev) =>
      prev.map((c) => ({
        ...c,
        escala_itens: c.escala_itens.map((it) =>
          it.id === item.id
            ? { ...it, status_confirmacao: 'confirmado', status: 'confirmado', motivo_recusa: null }
            : it
        ),
      }))
    );

    showToast('success', 'Presença confirmada! Que você sirva com alegria. 🙌');

    const res = await escalaService.responderConfirmacao(item.id, 'confirmado');
    if (res.error) {
      showToast('error', `Erro ao atualizar confirmação no Supabase: ${res.error}`);
      loadData(); // Revert
    }
  };

  // Handler: Abrir Modal de Recusa
  const handleOpenRecusalModal = (item: EscalaItemRecord, cultoTitulo: string, cultoData: string) => {
    setRecusalTarget({ item, cultoTitulo, cultoData });
    setRecusalMotivoOpcao('Trabalho / Estudo');
    setRecusalMotivoTexto('');
  };

  // Handler: Salvar Recusa
  const handleSaveRecusal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recusalTarget || !recusalTarget.item.id) return;

    const fullMotivo = recusalMotivoTexto.trim()
      ? `${recusalMotivoOpcao}: ${recusalMotivoTexto.trim()}`
      : recusalMotivoOpcao;

    const itemId = recusalTarget.item.id;

    // Optimistic UI update
    setCultosComEscala((prev) =>
      prev.map((c) => ({
        ...c,
        escala_itens: c.escala_itens.map((it) =>
          it.id === itemId
            ? { ...it, status_confirmacao: 'recusado', status: 'recusado', motivo_recusa: fullMotivo }
            : it
        ),
      }))
    );

    setRecusalTarget(null);
    showToast('error', 'Escala recusada. O líder foi notificado para providenciar substituto.');

    const res = await escalaService.responderConfirmacao(itemId, 'recusado', fullMotivo);
    if (res.error) {
      showToast('error', `Erro ao salvar recusa no Supabase: ${res.error}`);
      loadData(); // Revert
    }
  };

  // Handler: Líder trocar voluntário
  const handleLeaderSubstituir = (cComE: CultoComEscala, item: EscalaItemRecord) => {
    handleOpenEditor(cComE);
    showToast('info', `Ajuste o substituto da função "${item.funcao_nome}". O status de confirmação será resetado para Pendente.`);
  };

  // Load all necessary data from Supabase
  const loadData = async () => {
    setLoading(true);
    setNotice(null);

    const [cultosRes, funcoesRes, volsRes, indRes, tiposRes] = await Promise.all([
      escalaService.getCultosComEscalas(),
      mediaService.getFuncoes(),
      mediaService.getVoluntarios(),
      unavailabilityService.getIndisponibilidades(),
      tipoCultoService.getTiposCulto(),
    ]);

    setCultosComEscala(cultosRes.data);
    setFuncoes(funcoesRes.data);
    setVoluntarios(volsRes.data);
    setIndisponibilidades(indRes.data);
    setTiposCulto(tiposRes.data);

    // Identify user volunteer profile
    if (user) {
      const userVolRes = await unavailabilityService.getVoluntarioForCurrentUser(user.id, user.email);
      setCurrentUserVoluntario(userVolRes.voluntario);
    }

    if (cultosRes.error) {
      setNotice({
        type: 'error',
        text: `Aviso Supabase: ${cultosRes.error}. Se as tabelas 'cultos' ou 'escala_itens' não existirem ainda, você pode criá-las no seu banco.`,
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Open Modal: Novo Culto (optional preset date)
  const handleOpenNovoCulto = (presetDate?: string) => {
    const today = getTodayStr();
    setSelectedModeloId('');
    setNovoTitulo('Domingo - Manhã');
    setNovaData(presetDate || today);
    setNovoHorario('09:00');
    setNovoPeriodo('manha');
    setNovaObservacao('');
    setIsNovoCultoModalOpen(true);
  };

  const handleSelectModelo = (modeloId: string) => {
    setSelectedModeloId(modeloId);
    if (!modeloId) return;

    const modelo = tiposCulto.find((m) => m.id === modeloId);
    if (!modelo) return;

    setNovoTitulo(modelo.nome);
    setNovoHorario(modelo.horario || '09:00');

    const pLower = (modelo.periodo || '').toLowerCase();
    if (pLower.includes('noite')) {
      setNovoPeriodo('noite');
    } else if (pLower.includes('integral')) {
      setNovoPeriodo('integral');
    } else {
      setNovoPeriodo('manha');
    }
  };

  // Submit: Novo Culto
  const handleSaveNovoCulto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTitulo || !novaData) {
      showToast('error', 'Preencha o título e a data do culto.');
      return;
    }

    setActionLoading(true);
    const result = await escalaService.createCulto(
      {
        titulo: novoTitulo,
        data: novaData,
        horario: novoHorario,
        periodo: novoPeriodo,
        observacao: novaObservacao.trim(),
      },
      funcoes.filter((f) => f.ativa)
    );
    setActionLoading(false);

    if (result.error) {
      showToast('error', `Erro ao criar culto: ${result.error}`);
    } else {
      showToast('success', `Culto "${novoTitulo}" criado com sucesso!`);
      setIsNovoCultoModalOpen(false);
      loadData();
    }
  };

  const DIAS_SEMANA_NOMES = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ];

  // Open Modal 2: Gerar Cultos do Mês
  const handleOpenCultosMesModal = () => {
    const now = new Date();
    setTargetYear(now.getFullYear());
    setTargetMonth(now.getMonth() + 1);

    // Pre-select all active templates by default
    const activeIds = tiposCulto.filter((t) => t.ativo !== false).map((t) => t.id);
    setSelectedTiposCultoIds(activeIds);
    setIsCultosMesModalOpen(true);
  };

  const toggleTipoCulto = (id: string) => {
    setSelectedTiposCultoIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllTipos = () => {
    setSelectedTiposCultoIds(tiposCulto.filter((t) => t.ativo !== false).map((t) => t.id));
  };

  const handleDeselectAllTipos = () => {
    setSelectedTiposCultoIds([]);
  };

  const getRecorrenciaDesc = (tipo: TipoCultoRecord) => {
    const dia = DIAS_SEMANA_NOMES[tipo.dia_semana] || 'Dia';
    let semanaStr = 'Todo(a)';
    if (tipo.semana_mes) {
      semanaStr = `${tipo.semana_mes}º(ª)`;
    }
    return `${semanaStr} ${dia} às ${tipo.horario.substring(0, 5)}`;
  };

  // Sister Sunday service if current editing service is on a Sunday
  const sisterSundayCulto = useMemo(() => {
    if (!editingCultoComEscala) return null;
    const cData = editingCultoComEscala.culto.data;
    const cId = editingCultoComEscala.culto.id;
    const isSunday =
      new Date(cData + 'T12:00:00').getDay() === 0 ||
      editingCultoComEscala.culto.titulo.toLowerCase().includes('domingo');
    if (!isSunday) return null;
    return cultosComEscala.find((c) => c.culto.data === cData && c.culto.id !== cId) || null;
  }, [editingCultoComEscala, cultosComEscala]);

  // Submit: Criar Cultos do Mês
  const handleGenerateCultosDoMes = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedTiposCultoIds.length === 0) {
      showToast('error', 'Selecione ao menos um tipo de culto para gerar.');
      return;
    }

    setActionLoading(true);

    const activeFunctions = funcoes.filter((f) => f.ativa);
    const result = await escalaService.createCultosDoMes(
      targetYear, 
      targetMonth, 
      activeFunctions,
      selectedTiposCultoIds
    );

    if (result.error) {
      setActionLoading(false);
      showToast('error', `Erro ao gerar cultos do mês: ${result.error}`);
      return;
    }

    // If autoPreencherEscalas is selected, auto-fill all services respecting Sunday twin rule
    if (autoPreencherEscalas) {
      const refreshed = await escalaService.getCultosComEscalas();
      if (refreshed.data) {
        await escalaService.gerarEscalaAutomaticaMes(
          refreshed.data,
          targetYear,
          targetMonth,
          funcoes,
          voluntarios,
          indisponibilidades
        );
      }
      showToast('success', `${result.count} cultos criados e escalas preenchidas com a mesma equipe nos cultos de domingo!`);
    } else {
      showToast('success', `${result.count} cultos criados para o mês selecionado!`);
    }

    setActionLoading(false);
    setIsCultosMesModalOpen(false);
    loadData();
  };

  // Direct Auto-Schedule for Current Calendar Month
  const handleAutoEscalarMes = async () => {
    if (currentMonthCultos.length === 0) {
      showToast('info', `Nenhum culto encontrado em ${MESES_NOMES[calendarMonth - 1]} para escalar.`);
      return;
    }

    const confirm = window.confirm(
      `Deseja preencher automaticamente as escalas de ${MESES_NOMES[calendarMonth - 1]} de ${calendarYear}?\n\n` +
      `⚡ Regra: Aos domingos, a equipe de manhã e à noite será exatamente a mesma.`
    );
    if (!confirm) return;

    setActionLoading(true);
    const res = await escalaService.gerarEscalaAutomaticaMes(
      cultosComEscala,
      calendarYear,
      calendarMonth,
      funcoes,
      voluntarios,
      indisponibilidades
    );
    setActionLoading(false);

    if (res.error) {
      showToast('error', `Erro ao gerar escala automática: ${res.error}`);
    } else {
      showToast('success', `Escalas de ${MESES_NOMES[calendarMonth - 1]} geradas com sucesso! Equipe única aos domingos.`);
      loadData();
    }
  };

  // Open Editor for Scale
  const handleOpenEditor = (cComE: CultoComEscala) => {
    setEditingCultoComEscala(cComE);
    setReplicateToSundaySister(true);

    // Populate current assignments
    const map: Record<string, string | null> = {};
    const activeFunctions = funcoes.filter((f) => f.ativa);

    activeFunctions.forEach((fn) => {
      const existing = cComE.escala_itens.find((item) => item.funcao_id === fn.id);
      map[fn.id] = existing ? existing.voluntario_id : null;
    });

    setEditedItens(map);
  };

  // Auto-Suggest Scale
  const handleAutoSuggest = () => {
    if (!editingCultoComEscala) return;

    const activeFunctions = funcoes.filter((f) => f.ativa);
    const suggestedMap = escalaService.sugerirEscalaAutomatica(
      editingCultoComEscala.culto,
      activeFunctions,
      voluntarios,
      indisponibilidades,
      editingCultoComEscala.escala_itens,
      cultosComEscala
    );

    setEditedItens({ ...editedItens, ...suggestedMap });

    if (sisterSundayCulto) {
      const sisterHasAssigned = sisterSundayCulto.escala_itens.some((it) => Boolean(it.voluntario_id));
      if (sisterHasAssigned) {
        showToast('success', `Escala sincronizada com a mesma equipe do ${sisterSundayCulto.culto.titulo}!`);
      } else {
        showToast('info', 'Escala gerada automaticamente! Ao salvar, ela será aplicada a ambos os cultos de domingo.');
      }
    } else {
      showToast('info', 'Escala preenchida automaticamente de forma inteligente!');
    }
  };

  // Save Escala Items
  const handleSaveEscalaItems = async () => {
    if (!editingCultoComEscala) return;

    setActionLoading(true);
    const cultoId = editingCultoComEscala.culto.id;
    const activeFunctions = funcoes.filter((f) => f.ativa);

    let hasError = false;

    for (const fn of activeFunctions) {
      const volId = editedItens[fn.id] || null;
      const res = await escalaService.saveEscalaItem(cultoId, fn.id, volId);
      if (res.error) hasError = true;
    }

    // Replicate to sister Sunday service if enabled
    if (replicateToSundaySister && sisterSundayCulto) {
      for (const fn of activeFunctions) {
        const volId = editedItens[fn.id] || null;
        const resSister = await escalaService.saveEscalaItem(sisterSundayCulto.culto.id, fn.id, volId);
        if (resSister.error) hasError = true;
      }
    }

    setActionLoading(false);

    if (hasError) {
      showToast('error', 'Houve um aviso ao salvar algumas vagas da escala no Supabase.');
    } else {
      if (replicateToSundaySister && sisterSundayCulto) {
        showToast('success', 'Escala salva e replicada para os dois cultos de domingo (Manhã e Noite)!');
      } else {
        showToast('success', 'Escala do culto atualizada com sucesso!');
      }
      setEditingCultoComEscala(null);
      loadData();
    }
  };

  // Delete Culto
  const handleDeleteCulto = async (cultoId: string) => {
    setActionLoading(true);
    const res = await escalaService.deleteCulto(cultoId);
    setActionLoading(false);
    setDeleteCultoId(null);

    if (res.error) {
      showToast('error', `Erro ao excluir culto: ${res.error}`);
    } else {
      showToast('success', 'Culto e escala excluídos.');
      loadData();
    }
  };

  // Open Share WhatsApp
  const handleOpenShare = (cComE: CultoComEscala) => {
    setShareCultoComEscala(cComE);
    const generated = escalaService.generateWhatsAppShareText(cComE.culto, cComE.escala_itens);
    setShareText(generated);
  };

  const handleCopyShareText = () => {
    navigator.clipboard.writeText(shareText);
    showToast('success', 'Texto da escala copiado para a área de transferência!');
  };

  // Check if volunteer is unavailable for a given Culto
  const getVolunteerUnavailabilityWarning = (
    voluntarioId: string,
    cultoData: string,
    cultoPeriodo: string
  ): string | null => {
    if (!voluntarioId) return null;

    const ind = indisponibilidades.find((i) => {
      if (i.voluntario_id !== voluntarioId) return false;
      const matchesDate = cultoData >= i.data_inicio && cultoData <= i.data_fim;
      if (!matchesDate) return false;
      if (i.periodo === 'dia_inteiro') return true;
      return i.periodo === cultoPeriodo;
    });

    if (ind) {
      return ind.motivo ? `Indisponível: ${ind.motivo}` : 'Indisponível nesta data';
    }

    return null;
  };

  // Format date display: YYYY-MM-DD -> Domingo, 18/10/2026
  const formatDateHeader = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const dayOfWeek = daysOfWeek[dateObj.getDay()] || '';
    return `${dayOfWeek}, ${day}/${month}/${year}`;
  };

  const todayStr = getTodayStr();

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

  // Generate calendar days for month starting on Domingo (0) and ending on Sábado (6)
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth - 1, 1);
    const lastDay = new Date(calendarYear, calendarMonth, 0);

    const startDayOfWeek = firstDay.getDay(); // 0 = Domingo
    const totalDays = lastDay.getDate();

    // Previous month total days
    const prevMonthTotalDays = new Date(calendarYear, calendarMonth - 1, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      dayOfWeek: number;
    }> = [];

    const todayString = new Date().toISOString().split('T')[0];

    // Days from previous month to align first week on Domingo
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

    // Days from next month to close last week on Sábado
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

  // Filtered List of Cultos
  const filteredCultos = useMemo(() => {
    return cultosComEscala.filter((item) => {
      const isPast = item.culto.data < todayStr;

      // Tab filter (Upcoming vs Past) only applies in Cards mode
      if (viewMode === 'cards') {
        if (tabMode === 'upcoming' && isPast) return false;
        if (tabMode === 'past' && !isPast) return false;
      }

      return true;
    });
  }, [cultosComEscala, viewMode, tabMode, todayStr]);

  // Map cultos by date (YYYY-MM-DD)
  const cultosByDate = useMemo(() => {
    const map: Record<string, CultoComEscala[]> = {};
    filteredCultos.forEach((c) => {
      const d = c.culto.data;
      if (!map[d]) map[d] = [];
      map[d].push(c);
    });

    Object.keys(map).forEach((dateKey) => {
      map[dateKey].sort((a, b) => (a.culto.horario || '').localeCompare(b.culto.horario || ''));
    });

    return map;
  }, [filteredCultos]);

  // Current month cultos
  const currentMonthCultos = useMemo(() => {
    const prefix = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}`;
    return filteredCultos.filter((c) => c.culto.data.startsWith(prefix));
  }, [filteredCultos, calendarYear, calendarMonth]);

  // Selected date cultos for mobile
  const selectedDateCultos = useMemo(() => {
    return cultosByDate[selectedCalendarDate] || [];
  }, [cultosByDate, selectedCalendarDate]);

  // --- REUSABLE CULTO CARD COMPONENT (WITH FUNCTIONS LIST AND VOLUNTEERS) ---
  const renderCultoCard = (cComE: CultoComEscala, isCalendarCell: boolean = false) => {
    const culto = cComE.culto;
    const itens = cComE.escala_itens;

    // Check if current logged-in user is assigned to this service
    let myAssignedItem: EscalaItemRecord | null = null;
    if (currentUserVoluntario) {
      myAssignedItem = itens.find((it) => it.voluntario_id === currentUserVoluntario.id) || null;
    }

    const assignedCount = itens.filter((i) => i.voluntario_id).length;
    const totalSlotsCount = itens.length > 0 ? itens.length : funcoes.length;

    return (
      <div
        key={culto.id}
        className={`bg-white dark:bg-slate-900 rounded-3xl border ${
          myAssignedItem
            ? 'border-amber-400/90 ring-2 ring-amber-400/20 shadow-md'
            : 'border-slate-200 dark:border-slate-800 hover:border-amber-400/40 shadow-sm'
        } ${isCalendarCell ? 'p-3.5 space-y-3' : 'p-5 sm:p-6 space-y-4'} transition-all flex flex-col justify-between`}
      >
        <div className="space-y-3">
          {/* USER SCALED HIGHLIGHT & ACTION BANNER */}
          {myAssignedItem && (
            <div className="space-y-2">
              {myAssignedItem.status_confirmacao === 'confirmado' ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-emerald-700 dark:text-emerald-400">
                        Presença Confirmada!
                      </div>
                      <div className="text-[11px] text-emerald-800 dark:text-emerald-300">
                        Função: <u className="font-bold">{myAssignedItem.funcao_nome}</u>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenRecusalModal(myAssignedItem!, culto.titulo, culto.data)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:underline px-2 py-0.5"
                  >
                    Pedir troca
                  </button>
                </div>
              ) : myAssignedItem.status_confirmacao === 'recusado' ? (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-900 dark:text-red-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-lg bg-red-500/20 text-red-500 flex items-center justify-center shrink-0 mt-0.5">
                      <XCircle className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-red-700 dark:text-red-400 flex items-center gap-1.5">
                        <span>Escala Recusada</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-red-500/20 text-red-600 font-bold border border-red-500/30">
                          Líder Notificado
                        </span>
                      </div>
                      {myAssignedItem.motivo_recusa && (
                        <div className="text-[10px] text-red-800 dark:text-red-300 italic mt-0.5">
                          "{myAssignedItem.motivo_recusa}"
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleConfirmarPresenca(myAssignedItem!)}
                    className="text-[11px] font-bold px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-all self-end sm:self-auto"
                  >
                    Confirmar
                  </button>
                </div>
              ) : (
                /* PENDING CONFIRMATION */
                <div className="p-3 bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-transparent border-2 border-amber-400/60 rounded-2xl space-y-2 shadow-xs">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        Sua escala: <u className="underline decoration-amber-500">{myAssignedItem.funcao_nome}</u>
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 bg-amber-400 text-slate-950 font-black text-[9px] rounded uppercase shrink-0">
                      Pendente
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    <button
                      onClick={() => handleConfirmarPresenca(myAssignedItem!)}
                      className="inline-flex items-center justify-center gap-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all touch-active min-h-[34px]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Confirmar</span>
                    </button>

                    <button
                      onClick={() => handleOpenRecusalModal(myAssignedItem!, culto.titulo, culto.data)}
                      className="inline-flex items-center justify-center gap-1 py-1.5 px-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs rounded-xl border border-red-500/30 transition-all touch-active min-h-[34px]"
                    >
                      <XCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Recusar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Culto Title & Period Badge */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                    culto.periodo === 'manha'
                      ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                      : culto.periodo === 'noite'
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                      : 'bg-amber-400/10 text-amber-600 dark:text-amber-400 border border-amber-400/20'
                  }`}
                >
                  {culto.periodo === 'manha'
                    ? 'Manhã'
                    : culto.periodo === 'noite'
                    ? 'Noite'
                    : 'Integral'}
                </span>

                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-500" />
                  {culto.horario ? culto.horario.substring(0, 5) : ''}
                </span>
              </div>

              <h3 className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white mt-1 leading-snug">
                {culto.titulo}
              </h3>
              {!isCalendarCell && (
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  {formatDateHeader(culto.data)}
                </p>
              )}
            </div>

            {/* Action Controls (WhatsApp, Editar, Excluir) */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleOpenShare(cComE)}
                className="p-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                title="Compartilhar escala no WhatsApp"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>

              {isLeaderOrAdmin && (
                <>
                  <button
                    onClick={() => handleOpenEditor(cComE)}
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                    title="Editar Escala"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                  </button>
                  <button
                    onClick={() => setDeleteCultoId(culto.id)}
                    className="p-1.5 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                    title="Excluir Culto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Observação */}
          {culto.observacao && (
            <p className="text-[11px] italic text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
              "{culto.observacao}"
            </p>
          )}

          {/* LISTA DAS FUNÇÕES E QUEM ESTÁ ESCALADO */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Equipe Escalada:</span>
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                {assignedCount} de {totalSlotsCount} preenchidas
              </span>
            </div>

            {itens.length === 0 ? (
              <div className="p-3 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-xs text-slate-400 italic border border-slate-200/60 dark:border-slate-800">
                <p className="text-[11px]">Nenhuma função escalada ainda.</p>
              </div>
            ) : (
              <div className={`space-y-1.5 ${isCalendarCell ? '' : 'grid grid-cols-1 sm:grid-cols-2 gap-2 space-y-0'}`}>
                {itens.map((item, idx) => {
                  const isAssigned = Boolean(item.voluntario_id);
                  const isCurrentUser =
                    currentUserVoluntario &&
                    item.voluntario_id === currentUserVoluntario.id;

                  const st = item.status_confirmacao || item.status || 'pendente';

                  // Conflict warning
                  const conflictWarning = item.voluntario_id
                    ? getVolunteerUnavailabilityWarning(
                        item.voluntario_id,
                        culto.data,
                        culto.periodo
                      )
                    : null;

                  return (
                    <div
                      key={item.id || idx}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-1.5 text-xs transition-all ${
                        st === 'recusado'
                          ? 'bg-red-500/10 border-red-500/40 text-red-900 dark:text-red-200'
                          : st === 'confirmado'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100'
                          : isCurrentUser
                          ? 'bg-amber-400/15 border-amber-400/50 text-amber-950 dark:text-amber-200 ring-1 ring-amber-400/30 font-semibold'
                          : isAssigned
                          ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/70 text-slate-900 dark:text-slate-100'
                          : 'bg-slate-100/40 dark:bg-slate-800/20 border-dashed border-slate-300 dark:border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.funcao_cor || 'bg-blue-500'
                          } shrink-0`}
                        />
                        <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300 truncate shrink-0 max-w-[85px]">
                          {item.funcao_nome}:
                        </span>
                        <span
                          className={`truncate text-[11px] ${
                            !isAssigned
                              ? 'italic text-slate-400 font-normal'
                              : 'font-semibold text-slate-900 dark:text-white'
                          }`}
                        >
                          {isAssigned
                            ? `${item.voluntario_nome} ${item.voluntario_sobrenome || ''}`.trim()
                            : 'Vago'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isAssigned ? (
                          st === 'confirmado' ? (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                              title="Presença Confirmada"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span className="hidden sm:inline">Ok</span>
                            </span>
                          ) : st === 'recusado' ? (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-600 dark:text-red-400 animate-pulse"
                              title="Escala Recusada"
                            >
                              <AlertTriangle className="w-3 h-3 text-red-500" />
                              <span className="hidden sm:inline">Não</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-400/20 text-amber-700 dark:text-amber-300"
                              title="Confirmação Pendente"
                            >
                              <Clock className="w-3 h-3 text-amber-500" />
                              <span className="hidden sm:inline">Pendente</span>
                            </span>
                          )
                        ) : null}

                        {conflictWarning && (
                          <span
                            className="text-[10px] font-bold text-red-500"
                            title={conflictWarning}
                          >
                            <AlertTriangle className="w-3 h-3" />
                          </span>
                        )}

                        {isLeaderOrAdmin && isAssigned && (
                          <button
                            onClick={() => handleLeaderSubstituir(cComE, item)}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                            title="Substituir voluntário"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-fadeIn pb-12">
      {/* 1. TOP HEADER & ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
        {/* Left: Main Submenu (Escalas de Culto vs Restrições) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
            <button
              onClick={() => handleSwitchSubTab('escalas')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[38px] ${
                activeMainSubTab === 'escalas'
                  ? 'bg-black text-amber-400 border border-amber-400/30 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>Escalas de Culto</span>
            </button>

            <button
              onClick={() => handleSwitchSubTab('restricoes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[38px] ${
                activeMainSubTab === 'restricoes'
                  ? 'bg-black text-amber-400 border border-amber-400/30 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarOff className="w-4 h-4" />
              <span>Restrições</span>
            </button>
          </div>
        </div>

        {/* Right: Leader Actions & Refresh */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {activeMainSubTab === 'escalas' && isLeaderOrAdmin && (
            <>
              <button
                onClick={handleAutoEscalarMes}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-xs min-h-[38px] transition-all touch-active"
                title="Auto escalar equipes deste mês com equipe única aos domingos"
              >
                <Wand2 className="w-3.5 h-3.5 fill-slate-950" />
                <span className="hidden md:inline">Auto Escalar Mês</span>
                <span className="md:hidden">Auto Escalar</span>
              </button>

              <button
                onClick={handleOpenCultosMesModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-200/80 dark:border-slate-700/80 min-h-[38px] transition-all touch-active"
              >
                <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
                <span>Gerar Cultos</span>
              </button>

              <button
                onClick={() => handleOpenNovoCulto()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-black hover:bg-neutral-900 text-amber-400 font-bold text-xs rounded-xl border border-amber-400/30 min-h-[38px] transition-all shadow-xs touch-active"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Novo Culto</span>
              </button>
            </>
          )}

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 transition-all touch-active min-h-[38px]"
            title="Atualizar dados do Supabase"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* SUB-TAB: RESTRIÇÕES */}
      {activeMainSubTab === 'restricoes' && (
        <IndisponibilidadesView hideHeader />
      )}

      {/* SUB-TAB: ESCALAS DE CULTO */}
      {activeMainSubTab === 'escalas' && (
        <>
          {/* NOTICE TOAST */}
          {notice && (
            <div
              className={`p-3.5 text-xs sm:text-sm font-medium rounded-2xl border flex items-start gap-2.5 animate-fadeIn shadow-xs ${
                notice.type === 'error'
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                  : notice.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20'
              }`}
            >
              {notice.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
              )}
              <span className="flex-1 leading-relaxed">{notice.text}</span>
              <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 2. UNIFIED CONTROLS TOOLBAR */}
          <div className="bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Left: View Mode Toggle */}
            <div className="flex items-center gap-2">
              {/* View Switcher: Calendário vs Cards */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[30px] ${
                    viewMode === 'calendar'
                      ? 'bg-black text-amber-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Calendário</span>
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[30px] ${
                    viewMode === 'cards'
                      ? 'bg-black text-amber-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards</span>
                </button>
              </div>
            </div>

            {/* Right: Cards Mode Switch (Upcoming vs Past) OR Monthly Count in Calendar Mode */}
            <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
              {viewMode === 'cards' ? (
                <div className="flex items-center gap-2">
                  {/* Month navigator in cards mode */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      onClick={handlePrevCalendarMonth}
                      className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 min-h-[26px] min-w-[26px] flex items-center justify-center transition-colors"
                      title="Mês Anterior"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                      {MESES_NOMES[calendarMonth - 1]}
                    </span>
                    <button
                      onClick={handleNextCalendarMonth}
                      className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 min-h-[26px] min-w-[26px] flex items-center justify-center transition-colors"
                      title="Próximo Mês"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Sub-tabs in cards mode */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      onClick={() => setTabMode('upcoming')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all min-h-[28px] ${
                        tabMode === 'upcoming'
                          ? 'bg-black text-amber-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Próximos
                    </button>
                    <button
                      onClick={() => setTabMode('past')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all min-h-[28px] ${
                        tabMode === 'past'
                          ? 'bg-black text-amber-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Histórico
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 px-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span>
                    <strong className="text-slate-900 dark:text-white font-bold">{currentMonthCultos.length}</strong> culto{currentMonthCultos.length !== 1 ? 's' : ''} em{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{MESES_NOMES[calendarMonth - 1]}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

      {/* CONTENT AREA: CALENDAR OR CARDS */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto mb-3" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Carregando cultos e escalas do Supabase...
          </p>
        </div>
      ) : viewMode === 'calendar' ? (
        /* --- CALENDAR VIEW (UNIFIED MASTER-DETAIL FOR DESKTOP & MOBILE) --- */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT/TOP: COMPACT CALENDAR (DOMINGO A SÁBADO) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-4">
              {/* Month Header & Nav inside the card */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/15 text-amber-500 flex items-center justify-center shrink-0">
                    <CalendarDays className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                      {MESES_NOMES[calendarMonth - 1]}{' '}
                      <span className="text-amber-500 font-extrabold">{calendarYear}</span>
                    </h2>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {currentMonthCultos.length} culto{currentMonthCultos.length !== 1 ? 's' : ''} no mês
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevCalendarMonth}
                    className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors min-w-[30px] min-h-[30px] flex items-center justify-center"
                    title="Mês Anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleGoToToday}
                    className="px-2 py-1 text-[11px] font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 transition-colors"
                  >
                    Hoje
                  </button>
                  <button
                    onClick={handleNextCalendarMonth}
                    className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors min-w-[30px] min-h-[30px] flex items-center justify-center"
                    title="Próximo Mês"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day of Week Labels (DOMINGO A SÁBADO) */}
              <div className="grid grid-cols-7 text-center pb-2 border-b border-slate-100 dark:border-slate-800/80">
                {DIAS_SEMANA_HEADERS.map((dia, idx) => (
                  <span
                    key={idx}
                    className={`text-[11px] font-black uppercase tracking-wider ${
                      idx === 0 ? 'text-amber-500 font-extrabold' : 'text-slate-400'
                    }`}
                  >
                    {dia.short}
                  </span>
                ))}
              </div>

              {/* Day Grid Buttons (DOMINGO A SÁBADO) */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {calendarDays.map((day) => {
                  const cultosDoDia = cultosByDate[day.dateStr] || [];
                  const isSelected = selectedCalendarDate === day.dateStr && !showAllMonth;
                  const hasCultos = cultosDoDia.length > 0;

                  return (
                    <button
                      key={day.dateStr}
                      onClick={() => {
                        setSelectedCalendarDate(day.dateStr);
                        setShowAllMonth(false);
                        if (!day.isCurrentMonth) {
                          const [y, m] = day.dateStr.split('-');
                          setCalendarYear(parseInt(y));
                          setCalendarMonth(parseInt(m));
                        }
                      }}
                      className={`h-11 sm:h-12 rounded-2xl flex flex-col items-center justify-center relative transition-all group ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 font-black shadow-md scale-105 z-10 ring-2 ring-amber-400/50'
                          : day.isToday
                          ? 'bg-slate-100 dark:bg-slate-800 text-amber-500 font-bold border border-amber-400/40 hover:bg-amber-400/10'
                          : !day.isCurrentMonth
                          ? 'text-slate-300 dark:text-slate-700 opacity-30 hover:opacity-75'
                          : hasCultos
                          ? 'text-slate-900 dark:text-white font-bold hover:bg-amber-400/15'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <span className="text-xs sm:text-sm">{day.dayNumber}</span>
                      {hasCultos && (
                        <div className="flex items-center gap-0.5 mt-0.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? 'bg-slate-950' : 'bg-amber-500'
                            }`}
                          />
                          {cultosDoDia.length > 1 && (
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSelected ? 'bg-slate-950' : 'bg-amber-500'
                              }`}
                            />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend & Stats */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Dias com culto marcado</span>
                </div>
                <button
                  onClick={() => setShowAllMonth(!showAllMonth)}
                  className="font-bold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  {showAllMonth ? 'Ver dia selecionado' : 'Ver todos do mês'}
                </button>
              </div>
            </div>


          </div>

          {/* RIGHT/BOTTOM: CULTOS CARDS WITH DETAILED FUNCTIONS & VOLUNTEERS */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            <div className="flex items-center justify-between px-1 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                <h3 className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  {showAllMonth
                    ? `Todos os Cultos de ${MESES_NOMES[calendarMonth - 1]}`
                    : `Cultos de ${formatDateHeader(selectedCalendarDate)}`}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {showAllMonth ? currentMonthCultos.length : selectedDateCultos.length}
                </span>
              </div>

              <button
                onClick={() => setShowAllMonth(!showAllMonth)}
                className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-bold"
              >
                {showAllMonth ? 'Ver apenas dia selecionado' : 'Ver todos do mês'}
              </button>
            </div>

            {/* List of Cultos Cards */}
            {showAllMonth ? (
              currentMonthCultos.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-sm text-slate-500 space-y-2">
                  <CalendarDays className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-60" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    Nenhum culto programado para {MESES_NOMES[calendarMonth - 1]}.
                  </p>
                  {isLeaderOrAdmin && (
                    <button
                      onClick={handleOpenCultosMesModal}
                      className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-400 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-300 transition-colors shadow-xs"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Gerar Cultos do Mês</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {currentMonthCultos.map((cComE) => renderCultoCard(cComE, false))}
                </div>
              )
            ) : selectedDateCultos.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-sm text-slate-500 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-500 flex items-center justify-center mx-auto">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    Nenhum culto cadastrado para esta data
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDateHeader(selectedCalendarDate)}</p>
                </div>
                {isLeaderOrAdmin ? (
                  <button
                    onClick={() => handleOpenNovoCulto(selectedCalendarDate)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-neutral-900 text-amber-400 font-bold text-xs rounded-xl border border-amber-400/30 transition-all shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cadastrar culto neste dia</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAllMonth(true)}
                    className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-bold hover:underline"
                  >
                    Ver outros cultos deste mês
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDateCultos.map((cComE) => renderCultoCard(cComE, false))}
              </div>
            )}
          </div>
        </div>
      ) : filteredCultos.length === 0 ? (
        /* EMPTY STATE IN CARDS MODE */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center shadow-sm max-w-xl mx-auto my-6">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-300 mx-auto mb-4">
            <CalendarIcon className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-2">
            Nenhum culto encontrado
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
            {tabMode === 'upcoming'
              ? 'Não há próximos cultos cadastrados para os filtros selecionados. Crie novos cultos ou utilize a função "Gerar Cultos do Mês".'
              : 'Nenhum histórico de cultos passados encontrado.'}
          </p>
          {isLeaderOrAdmin && tabMode === 'upcoming' && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleOpenCultosMesModal}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 min-h-[44px]"
              >
                <CalendarDays className="w-4 h-4 text-amber-500" />
                <span>Gerar Cultos do Mês</span>
              </button>
              <button
                onClick={() => handleOpenNovoCulto()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-black hover:bg-neutral-900 text-amber-400 font-bold text-xs rounded-xl border border-amber-400/30 min-h-[44px] shadow-xs"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Novo Culto</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* CLASSIC CULTOS CARDS GRID */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredCultos.map((cComE) => renderCultoCard(cComE, false))}
        </div>
      )}

      {/* --- MODAL 1: NOVO CULTO --- */}
      {isNovoCultoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-[32px] sm:rounded-3xl border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-black text-white px-6 py-4 flex items-center justify-between border-b border-neutral-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center font-bold">
                  <Tv className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-base text-white">Cadastrar Novo Culto</h3>
              </div>
              <button
                onClick={() => setIsNovoCultoModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNovoCulto} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Modelo de Culto Selector (Auto-fill) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Modelo de Culto (Auto-preenchimento)
                </label>
                <select
                  value={selectedModeloId}
                  onChange={(e) => handleSelectModelo(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-amber-400/10 border border-amber-400/30 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
                >
                  <option value="">-- Selecione um Modelo de Culto Cadastrado --</option>
                  {tiposCulto
                    .filter((m) => m.ativo !== false)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome} ({m.horario} - {m.periodo})
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ao escolher um modelo, Título, Horário e Período são preenchidos automaticamente.
                </p>
              </div>

              {/* Presets Title Chips */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Sugestões Rápidas de Título:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SERVICE_TITLE_PRESETS.map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => {
                        setNovoTitulo(preset);
                        if (preset.includes('Manhã')) {
                          setNovoPeriodo('manha');
                          setNovoHorario('09:00');
                        } else if (preset.includes('Noite')) {
                          setNovoPeriodo('noite');
                          setNovoHorario('18:00');
                        } else if (preset.includes('Quarta')) {
                          setNovoPeriodo('noite');
                          setNovoHorario('19:30');
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 min-h-[32px]"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Título */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Título do Culto <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={novoTitulo}
                  onChange={(e) => setNovoTitulo(e.target.value)}
                  placeholder="Ex: Domingo - Celebração"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
                />
              </div>

              {/* Data e Horário */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Data <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={novaData}
                    onChange={(e) => setNovaData(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Horário <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={novoHorario}
                    onChange={(e) => setNovoHorario(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
                  />
                </div>
              </div>

              {/* Período */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Período do Culto:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNovoPeriodo('manha')}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all min-h-[44px] justify-center ${
                      novoPeriodo === 'manha'
                        ? 'bg-black text-amber-400 border-amber-400 font-bold shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Manhã</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNovoPeriodo('noite')}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all min-h-[44px] justify-center ${
                      novoPeriodo === 'noite'
                        ? 'bg-black text-amber-400 border-amber-400 font-bold shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Noite</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNovoPeriodo('integral')}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all min-h-[44px] justify-center ${
                      novoPeriodo === 'integral'
                        ? 'bg-black text-amber-400 border-amber-400 font-bold shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span>Integral</span>
                  </button>
                </div>
              </div>

              {/* Observação */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observação Curta (Opcional)
                </label>
                <input
                  type="text"
                  value={novaObservacao}
                  onChange={(e) => setNovaObservacao(e.target.value)}
                  placeholder="Ex: Chegar 30 min antes para passagem de som..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNovoCultoModalOpen(false)}
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
                    <span>Criar Culto</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: GERAR CULTOS DO MÊS --- */}
      {isCultosMesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Gerar Cultos do Mês
                </h3>
              </div>
              <button
                onClick={() => setIsCultosMesModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Selecione o mês, ano e quais tipos de cultos deverão ser criados automaticamente no calendário, já com os slots de funções abertos.
            </p>

            <form onSubmit={handleGenerateCultosDoMes} className="space-y-4 pt-1 flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mês:
                  </label>
                  <select
                    value={targetMonth}
                    onChange={(e) => setTargetMonth(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value={1}>Janeiro</option>
                    <option value={2}>Fevereiro</option>
                    <option value={3}>Março</option>
                    <option value={4}>Abril</option>
                    <option value={5}>Maio</option>
                    <option value={6}>Junho</option>
                    <option value={7}>Julho</option>
                    <option value={8}>Agosto</option>
                    <option value={9}>Setembro</option>
                    <option value={10}>Outubro</option>
                    <option value={11}>Novembro</option>
                    <option value={12}>Dezembro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ano:
                  </label>
                  <select
                    value={targetYear}
                    onChange={(e) => setTargetYear(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                    <option value={2028}>2028</option>
                  </select>
                </div>
              </div>

              {/* TIPOS DE CULTO CHECKLIST */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Tipos de Culto a gerar</span>
                    <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                      ({selectedTiposCultoIds.length} selecionado{selectedTiposCultoIds.length !== 1 ? 's' : ''})
                    </span>
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={handleSelectAllTipos}
                      className="text-amber-600 dark:text-amber-400 hover:underline font-semibold"
                    >
                      Todos
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllTipos}
                      className="text-slate-500 dark:text-slate-400 hover:underline font-semibold"
                    >
                      Nenhum
                    </button>
                  </div>
                </div>

                {tiposCulto.length === 0 ? (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                      Nenhum modelo de culto cadastrado.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCultosMesModalOpen(false);
                        setIsModelosModalOpen(true);
                      }}
                      className="text-xs font-bold text-amber-500 hover:underline"
                    >
                      Configurar modelos de culto
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {tiposCulto
                      .filter((t) => t.ativo !== false)
                      .map((tipo) => {
                        const isChecked = selectedTiposCultoIds.includes(tipo.id);
                        return (
                          <div
                            key={tipo.id}
                            onClick={() => toggleTipoCulto(tipo.id)}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 select-none ${
                              isChecked
                                ? 'bg-amber-500/10 border-amber-500/30 text-slate-900 dark:text-white'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                                isChecked
                                  ? 'bg-amber-400 border-amber-400 text-slate-950 font-bold'
                                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate">
                                {tipo.nome}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                <span>{getRecorrenciaDesc(tipo)}</span>
                                <span className="inline-block px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-700 text-[10px] font-medium uppercase">
                                  {tipo.periodo}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Checkbox: Auto-preencher escalas com regra de domingo */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-1">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoPreencherEscalas}
                    onChange={(e) => setAutoPreencherEscalas(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      ⚡ Preencher escalas automaticamente
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug block">
                      Aplica revezamento inteligente e escala a <strong>mesma equipe de manhã e à noite aos domingos</strong>.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCultosMesModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || selectedTiposCultoIds.length === 0}
                  className="flex-1 py-2.5 bg-black hover:bg-neutral-900 text-amber-400 font-bold text-xs rounded-xl border border-amber-400/30 shadow-sm min-h-[44px] flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {selectedTiposCultoIds.length === 0
                          ? 'Selecione um culto'
                          : `Gerar Cultos (${selectedTiposCultoIds.length})`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: EDITOR DE ESCALA DO CULTO --- */}
      {editingCultoComEscala && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full sm:max-w-2xl rounded-t-[32px] sm:rounded-3xl border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white">
                    Montar Escala: {editingCultoComEscala.culto.titulo}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {formatDateHeader(editingCultoComEscala.culto.data)} - {editingCultoComEscala.culto.horario}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingCultoComEscala(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sister Sunday Service Highlight & Sync Banner */}
            {sisterSundayCulto && (
              <div className="p-3.5 bg-gradient-to-r from-amber-400/15 to-amber-500/5 border-b border-amber-400/30 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/25 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 dark:text-white block truncate">
                      Regra de Domingo: Equipe Única
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 block truncate">
                      Replicar para: <strong className="text-slate-800 dark:text-slate-200">{sisterSundayCulto.culto.titulo}</strong> ({sisterSundayCulto.culto.horario ? sisterSundayCulto.culto.horario.substring(0, 5) : ''})
                    </span>
                  </div>
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer shrink-0 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-amber-400/40 shadow-xs">
                  <input
                    type="checkbox"
                    checked={replicateToSundaySister}
                    onChange={(e) => setReplicateToSundaySister(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Replicar
                  </span>
                </label>
              </div>
            )}

            {/* Smart Auto-Suggest Bar */}
            <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2 shrink-0">
              <div className="text-xs text-slate-700 dark:text-slate-300">
                <span className="font-bold block">Sugestão Inteligente:</span>
                <span className="text-[11px] text-slate-500">
                  {sisterSundayCulto
                    ? 'Aos domingos, a equipe de manhã e noite é a mesma.'
                    : 'Valida ausências e prioriza voluntários com menos escalas no mês.'}
                </span>
              </div>
              <button
                onClick={handleAutoSuggest}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all touch-active shrink-0 min-h-[38px]"
              >
                <Wand2 className="w-4 h-4 fill-slate-950" />
                <span>Gerar Escala Auto</span>
              </button>
            </div>

            {/* Body: Function Slots List */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {funcoes.filter((f) => f.ativa).length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">
                  Nenhuma função ativa encontrada. Cadastre funções na aba "Voluntários".
                </p>
              ) : (
                <div className="space-y-3">
                  {funcoes
                    .filter((f) => f.ativa)
                    .map((fn) => {
                      const selectedVolId = editedItens[fn.id] || '';

                      // Warning check for current selection
                      const warning = selectedVolId
                        ? getVolunteerUnavailabilityWarning(
                            selectedVolId,
                            editingCultoComEscala.culto.data,
                            editingCultoComEscala.culto.periodo
                          )
                        : null;

                      // Eligible volunteers for this function
                      const qualifiedVols = voluntarios.filter(
                        (v) => v.ativo && (v.funcoes_ids || []).includes(fn.id)
                      );

                      return (
                        <div
                          key={fn.id}
                          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`w-3 h-3 rounded-full ${fn.cor || 'bg-blue-500'}`} />
                              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                {fn.nome}
                              </span>
                            </div>

                            {/* Warning Indicator */}
                            {warning && (
                              <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold border border-red-500/20 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                {warning}
                              </span>
                            )}
                          </div>

                          {/* Selector */}
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedVolId}
                              onChange={(e) =>
                                setEditedItens({
                                  ...editedItens,
                                  [fn.id]: e.target.value || null,
                                })
                              }
                              className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px] ${
                                warning
                                  ? 'bg-red-500/5 border-red-500/30 text-red-700 dark:text-red-300'
                                  : selectedVolId
                                  ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
                                  : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-400 italic'
                              }`}
                            >
                              <option value="">-- Vaga em aberto --</option>

                              {/* Qualified Volunteers First */}
                              <optgroup label="Aptos nesta Função">
                                {qualifiedVols.map((v) => {
                                  const indWarn = getVolunteerUnavailabilityWarning(
                                    v.id,
                                    editingCultoComEscala.culto.data,
                                    editingCultoComEscala.culto.periodo
                                  );
                                  return (
                                    <option key={v.id} value={v.id}>
                                      {v.nome} {v.sobrenome} {indWarn ? `(⚠️ ${indWarn})` : ''}
                                    </option>
                                  );
                                })}
                              </optgroup>

                              {/* Other Volunteers */}
                              <optgroup label="Outros Voluntários">
                                {voluntarios
                                  .filter((v) => v.ativo && !(v.funcoes_ids || []).includes(fn.id))
                                  .map((v) => (
                                    <option key={v.id} value={v.id}>
                                      {v.nome} {v.sobrenome} (Outra função)
                                    </option>
                                  ))}
                              </optgroup>
                            </select>

                            {selectedVolId && (
                              <button
                                type="button"
                                onClick={() => setEditedItens({ ...editedItens, [fn.id]: null })}
                                className="px-2.5 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-500 rounded-xl text-xs font-semibold min-h-[44px]"
                                title="Limpar Vaga"
                              >
                                Limpar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setEditingCultoComEscala(null)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 rounded-xl min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEscalaItems}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-black hover:bg-neutral-900 text-amber-400 font-bold text-xs sm:text-sm rounded-xl border border-amber-400/30 min-h-[44px] shadow-xs"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <span>Salvar Escala no Supabase</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 4: COMPARTILHAR ESCALA NO WHATSAPP --- */}
      {shareCultoComEscala && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                <MessageSquare className="w-5 h-5 fill-emerald-600 text-emerald-600" />
                <h3 className="text-base text-slate-900 dark:text-white">
                  Compartilhar Escala WhatsApp
                </h3>
              </div>
              <button
                onClick={() => setShareCultoComEscala(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview Area */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
              {shareText}
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md min-h-[44px]"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Abrir Diretamente no WhatsApp</span>
              </a>

              <button
                onClick={handleCopyShareText}
                className="w-full inline-flex items-center justify-center gap-2 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 min-h-[44px]"
              >
                <Copy className="w-4 h-4" />
                <span>Copiar Texto da Escala</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 0: GERENCIADOR DE MODELOS DE CULTO --- */}
      {isModelosModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <TiposCultoManager
              isModal
              onClose={() => {
                setIsModelosModalOpen(false);
                loadData();
              }}
            />
          </div>
        </div>
      )}

      {/* --- MODAL 5: PEDIR SUBSTITUIÇÃO / MOTIVO DA RECUSA --- */}
      {recusalTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-[32px] sm:rounded-3xl border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="bg-black text-white px-6 py-4 flex items-center justify-between border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white">Pedir Substituição</h3>
                  <p className="text-[11px] text-slate-400">
                    {recusalTarget.cultoTitulo} • {recusalTarget.item.funcao_nome}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRecusalTarget(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecusal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Por que você não poderá servir nesta escala?
                </label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {[
                    'Trabalho / Estudo',
                    'Viagem',
                    'Compromisso Familiar',
                    'Motivo de Saúde',
                    'Outro',
                  ].map((opcao) => (
                    <button
                      key={opcao}
                      type="button"
                      onClick={() => setRecusalMotivoOpcao(opcao)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[36px] ${
                        recusalMotivoOpcao === opcao
                          ? 'bg-red-500 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {opcao}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  value={recusalMotivoTexto}
                  onChange={(e) => setRecusalMotivoTexto(e.target.value)}
                  placeholder="Observação opcional para seu líder (ex: 'Viajando a trabalho para SP')..."
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
                />
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-amber-800 dark:text-amber-300">
                💡 Ao confirmar, o líder da mídia será notificado e a vaga da sua função ficará sinalizada em vermelho no painel para substituição imediata.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRecusalTarget(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md transition-all touch-active min-h-[44px]"
                >
                  Confirmar Recusa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONFIRMATION DIALOG: DELETE CULTO --- */}
      {deleteCultoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Excluir este Culto?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Esta ação removerá o culto e todas as atribuições de escala no Supabase.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeleteCultoId(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteCulto(deleteCultoId)}
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

      {/* FLOATING ACTION BUTTON (FAB) FOR LEADERS & ADMINS */}
      {isLeaderOrAdmin && activeMainSubTab === 'escalas' && (
        <div className="fixed bottom-18 right-4 sm:bottom-20 sm:right-6 z-40 flex flex-col items-end gap-2">
          {/* Speed dial items */}
          {isFabOpen && (
            <div className="flex flex-col items-end gap-2 mb-1 animate-fadeIn">
              <button
                onClick={() => {
                  setIsFabOpen(false);
                  setIsModelosModalOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 bg-black hover:bg-neutral-900 text-amber-400 text-xs font-bold rounded-2xl border border-amber-400/30 shadow-lg touch-active"
              >
                <span>Modelos de Culto</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </button>

              <button
                onClick={() => {
                  setIsFabOpen(false);
                  handleOpenCultosMesModal();
                }}
                className="flex items-center gap-2 px-3.5 py-2 bg-black hover:bg-neutral-900 text-amber-400 text-xs font-bold rounded-2xl border border-amber-400/30 shadow-lg touch-active"
              >
                <span>Gerar Cultos do Mês</span>
                <CalendarDays className="w-4 h-4 text-amber-400" />
              </button>

              <button
                onClick={() => {
                  setIsFabOpen(false);
                  handleOpenNovoCulto();
                }}
                className="flex items-center gap-2 px-3.5 py-2 bg-amber-400 text-slate-950 text-xs font-bold rounded-2xl shadow-lg touch-active"
              >
                <span>Novo Culto</span>
                <Plus className="w-4 h-4 text-slate-950" />
              </button>
            </div>
          )}

          {/* Main FAB Trigger */}
          <button
            onClick={() => setIsFabOpen(!isFabOpen)}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-400 text-slate-950 shadow-xl border-2 border-black flex items-center justify-center font-bold transition-all transform touch-active ${
              isFabOpen ? 'rotate-45 bg-black text-amber-400 border-amber-400' : 'hover:scale-105 active:scale-95'
            }`}
            aria-label="Ações de Escala"
            title="Ações de Escala"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}
        </>
      )}
    </div>
  );
};
