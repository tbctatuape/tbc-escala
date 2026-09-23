import React, { useEffect, useState } from 'react';
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
  UserX
} from 'lucide-react';

export const EscalasView: React.FC = () => {
  const { user } = useAuth();
  const isLeaderOrAdmin = user?.role === 'admin' || user?.role === 'leader';

  // Sub-tabs: "Próximos Cultos" vs "Histórico / Passados"
  const [tabMode, setTabMode] = useState<'upcoming' | 'past'>('upcoming');

  // Quick Filter
  const [filterType, setFilterType] = useState<'all' | 'domingo_manha' | 'domingo_noite' | 'mine'>('all');

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

  // Modal 3: Editor de Escala do Culto
  const [editingCultoComEscala, setEditingCultoComEscala] = useState<CultoComEscala | null>(null);
  const [editedItens, setEditedItens] = useState<Record<string, string | null>>({}); // funcao_id -> voluntario_id

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

  // Open Modal: Novo Culto
  const handleOpenNovoCulto = () => {
    const today = getTodayStr();
    setSelectedModeloId('');
    setNovoTitulo('Domingo - Manhã');
    setNovaData(today);
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

  // Submit: Criar Cultos do Mês
  const handleGenerateCultosDoMes = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    const activeFunctions = funcoes.filter((f) => f.ativa);
    const result = await escalaService.createCultosDoMes(targetYear, targetMonth, activeFunctions);

    setActionLoading(false);

    if (result.error) {
      showToast('error', `Erro ao gerar cultos do mês: ${result.error}`);
    } else {
      showToast('success', `${result.count} cultos criados para o mês selecionado!`);
      setIsCultosMesModalOpen(false);
      loadData();
    }
  };

  // Open Editor for Scale
  const handleOpenEditor = (cComE: CultoComEscala) => {
    setEditingCultoComEscala(cComE);

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
    showToast('info', 'Escala preenchida automaticamente de forma inteligente!');
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

    setActionLoading(false);

    if (hasError) {
      showToast('error', 'Houve um aviso ao salvar algumas vagas da escala no Supabase.');
    } else {
      showToast('success', 'Escala do culto atualizada com sucesso!');
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

  // Filtered List
  const filteredCultos = cultosComEscala.filter((item) => {
    const isPast = item.culto.data < todayStr;

    // 1. Tab filter (Upcoming vs Past)
    if (tabMode === 'upcoming' && isPast) return false;
    if (tabMode === 'past' && !isPast) return false;

    // 2. Type filter
    if (filterType === 'domingo_manha' && item.culto.periodo !== 'manha') return false;
    if (filterType === 'domingo_noite' && item.culto.periodo !== 'noite') return false;

    // 3. "Minhas Escalas" filter
    if (filterType === 'mine' && currentUserVoluntario) {
      const isUserEscalado = item.escala_itens.some(
        (es) => es.voluntario_id === currentUserVoluntario.id
      );
      if (!isUserEscalado) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
        <h1 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white tracking-tight">
          Escalas & Cultos
        </h1>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 transition-all touch-active min-h-[38px]"
          title="Atualizar dados do Supabase"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      </div>

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

      {/* TABS & FILTERS - CLEAN UNBOXED LAYOUT */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-b border-slate-200/50 dark:border-slate-800/50 pb-3">
        <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800/80 p-1 rounded-xl">
          <button
            onClick={() => setTabMode('upcoming')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[34px] ${
              tabMode === 'upcoming'
                ? 'bg-slate-900 text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Próximos Cultos
          </button>
          <button
            onClick={() => setTabMode('past')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[34px] ${
              tabMode === 'past'
                ? 'bg-slate-900 text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Histórico
          </button>
        </div>

        {/* Quick Filter Options */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors min-h-[30px] ${
              filterType === 'all'
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterType('domingo_manha')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors min-h-[30px] ${
              filterType === 'domingo_manha'
                ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Domingo Manhã
          </button>
          <button
            onClick={() => setFilterType('domingo_noite')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors min-h-[30px] ${
              filterType === 'domingo_noite'
                ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Domingo Noite
          </button>
          {currentUserVoluntario && (
            <button
              onClick={() => setFilterType('mine')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors min-h-[30px] ${
                filterType === 'mine'
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              Minhas Escalas
            </button>
          )}
        </div>
      </div>

      {/* CULTOS CARDS LIST */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto mb-3" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Carregando cultos e escalas do Supabase...
          </p>
        </div>
      ) : filteredCultos.length === 0 ? (
        /* EMPTY STATE */
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
                onClick={() => setIsCultosMesModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 min-h-[44px]"
              >
                <CalendarDays className="w-4 h-4 text-amber-500" />
                <span>Gerar Cultos do Mês</span>
              </button>
              <button
                onClick={handleOpenNovoCulto}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 dark:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl border border-amber-400/30 min-h-[44px]"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Novo Culto</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* CULTOS GRID */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredCultos.map((cComE) => {
            const culto = cComE.culto;
            const itens = cComE.escala_itens;

            // Check if current logged-in user is assigned to this service
            let myAssignedItem: EscalaItemRecord | null = null;
            if (currentUserVoluntario) {
              myAssignedItem =
                itens.find((it) => it.voluntario_id === currentUserVoluntario.id) || null;
            }

            return (
              <div
                key={culto.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl border ${
                  myAssignedItem
                    ? 'border-amber-400/80 ring-2 ring-amber-400/20 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 hover:border-amber-400/40 shadow-sm'
                } p-5 sm:p-6 transition-all space-y-4 flex flex-col justify-between`}
              >
                <div className="space-y-4">
                  {/* USER SCALED HIGHLIGHT & ACTION BANNER */}
                  {myAssignedItem && (
                    <div className="space-y-2">
                      {myAssignedItem.status_confirmacao === 'confirmado' ? (
                        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                            </div>
                            <div>
                              <div className="font-bold text-xs sm:text-sm text-emerald-700 dark:text-emerald-400">
                                Presença Confirmada!
                              </div>
                              <div className="text-[11px] text-emerald-800 dark:text-emerald-300">
                                Sua vaga na função <u className="font-bold">{myAssignedItem.funcao_nome}</u> está garantida.
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleOpenRecusalModal(myAssignedItem!, culto.titulo, culto.data)}
                            className="text-[11px] font-semibold text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:underline min-h-[36px] px-2 py-1 self-end sm:self-auto"
                          >
                            Pedir substituição / recusal
                          </button>
                        </div>
                      ) : myAssignedItem.status_confirmacao === 'recusado' ? (
                        <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-900 dark:text-red-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-start gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-500 flex items-center justify-center shrink-0 mt-0.5">
                              <XCircle className="w-5 h-5 stroke-[2.5] animate-pulse" />
                            </div>
                            <div>
                              <div className="font-bold text-xs sm:text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                                <span>Escala Recusada</span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-red-500/20 text-red-600 font-bold border border-red-500/30">
                                  Líder Notificado
                                </span>
                              </div>
                              <div className="text-[11px] text-red-800 dark:text-red-300 italic mt-0.5">
                                Motivo: "{myAssignedItem.motivo_recusa || 'Não informado'}"
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleConfirmarPresenca(myAssignedItem!)}
                            className="text-[11px] font-bold px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all min-h-[38px] self-end sm:self-auto"
                          >
                            Confirmar Presença
                          </button>
                        </div>
                      ) : (
                        /* PENDING CONFIRMATION - PROMINENT ACTION BUTTONS */
                        <div className="p-4 bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-transparent border-2 border-amber-400/60 rounded-2xl space-y-3 shadow-sm">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                Você foi escalado para <u className="underline decoration-amber-500">{myAssignedItem.funcao_nome}</u>!
                              </span>
                            </div>
                            <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] rounded uppercase shrink-0">
                              Resposta Pendente
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            <button
                              onClick={() => handleConfirmarPresenca(myAssignedItem!)}
                              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all touch-active min-h-[44px]"
                            >
                              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                              <span>Confirmar Presença</span>
                            </button>

                            <button
                              onClick={() => handleOpenRecusalModal(myAssignedItem!, culto.titulo, culto.data)}
                              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs sm:text-sm rounded-xl border border-red-500/30 transition-all touch-active min-h-[44px]"
                            >
                              <XCircle className="w-4 h-4 stroke-[2.5]" />
                              <span>Pedir Substituição / Recusar</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Culto Title & Period Badge */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
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

                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          {culto.horario}
                        </span>
                      </div>

                      <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white mt-1.5">
                        {culto.titulo}
                      </h3>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        {formatDateHeader(culto.data)}
                      </p>
                    </div>

                    {/* Leader Controls */}
                    {isLeaderOrAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditor(cComE)}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
                          title="Editar Escala"
                        >
                          <Edit3 className="w-4 h-4 text-amber-500" />
                        </button>
                        <button
                          onClick={() => setDeleteCultoId(culto.id)}
                          className="p-2 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
                          title="Excluir Culto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* OBSERVAÇÃO DO CULTO */}
                  {culto.observacao && (
                    <p className="text-xs italic text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      "{culto.observacao}"
                    </p>
                  )}

                  {/* ESCALA SLOTS LIST */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Equipe Escalada:</span>
                      <span>
                        {itens.filter((i) => i.voluntario_id).length} de {funcoes.length} preenchidas
                      </span>
                    </div>

                    {itens.length === 0 ? (
                      <div className="p-3 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-400 italic">
                        Nenhuma vaga de função aberta ainda. Clique em Editar para montar a escala.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {itens.map((item, idx) => {
                          const isAssigned = Boolean(item.voluntario_id);
                          const isCurrentUser =
                            currentUserVoluntario &&
                            item.voluntario_id === currentUserVoluntario.id;

                          const st = item.status_confirmacao || item.status || 'pendente';

                          // Check conflict
                          const conflictWarning = item.voluntario_id
                            ? getVolunteerUnavailabilityWarning(
                                item.voluntario_id,
                                culto.data,
                                culto.periodo
                              )
                            : null;

                          return (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-all ${
                                st === 'recusado'
                                  ? 'bg-red-500/10 border-red-500/40 text-red-900 dark:text-red-200'
                                  : st === 'confirmado'
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100'
                                  : isCurrentUser
                                  ? 'bg-amber-400/10 border-amber-400/40 text-amber-900 dark:text-amber-200'
                                  : isAssigned
                                  ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100'
                                  : 'bg-slate-100/50 dark:bg-slate-800/30 border-dashed border-slate-300 dark:border-slate-700 text-slate-400'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    item.funcao_cor || 'bg-blue-500'
                                  } shrink-0`}
                                />
                                <span className="font-bold text-slate-700 dark:text-slate-300 truncate">
                                  {item.funcao_nome}:
                                </span>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 min-w-0">
                                {isAssigned ? (
                                  <div className="flex flex-col items-start sm:items-end min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[130px]">
                                        {item.voluntario_nome} {item.voluntario_sobrenome}
                                      </span>

                                      {/* Status Indicator */}
                                      {st === 'confirmado' ? (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                          <span>Confirmado</span>
                                        </span>
                                      ) : st === 'recusado' ? (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 animate-pulse">
                                          <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                                          <span>Recusado</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/30">
                                          <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                                          <span>Pendente</span>
                                        </span>
                                      )}
                                    </div>

                                    {st === 'recusado' && item.motivo_recusa && (
                                      <div className="text-[10px] text-red-600 dark:text-red-400 font-medium italic mt-0.5 text-left sm:text-right max-w-[200px]">
                                        🚨 Motivo: "{item.motivo_recusa}"
                                      </div>
                                    )}

                                    {conflictWarning && (
                                      <span className="text-[10px] font-bold text-red-500 flex items-center gap-0.5 mt-0.5">
                                        <AlertTriangle className="w-3 h-3" />
                                        {conflictWarning}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[11px] font-medium text-slate-400 italic">
                                    Vaga em aberto
                                  </span>
                                )}

                                {/* Quick Substitute CTA for Leader */}
                                {isLeaderOrAdmin && isAssigned && (
                                  <button
                                    onClick={() => handleLeaderSubstituir(cComE, item)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shrink-0 ${
                                      st === 'recusado'
                                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs animate-bounce'
                                        : 'bg-slate-200 dark:bg-slate-700 hover:bg-amber-400 hover:text-slate-950 text-slate-700 dark:text-slate-300'
                                    }`}
                                    title="Trocar voluntário e resetar confirmação para Pendente"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                    <span>Substituir</span>
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

                {/* SHARE WHATSAPP BUTTON FOOTER */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenShare(cComE)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all touch-active min-h-[42px]"
                  >
                    <MessageSquare className="w-4 h-4 fill-white text-emerald-600" />
                    <span>Compartilhar no WhatsApp</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- MODAL 1: NOVO CULTO --- */}
      {isNovoCultoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-[32px] sm:rounded-3xl border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
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
                        ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-400 font-bold'
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
                        ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-400 font-bold'
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
                        ? 'bg-amber-400/20 text-amber-700 dark:text-amber-300 border-amber-400 font-bold'
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
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-slate-800 text-amber-400 font-bold text-xs sm:text-sm rounded-xl border border-amber-400/30 hover:bg-slate-800 min-h-[44px]"
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
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Gerar Cultos do Mês
                </h3>
              </div>
              <button
                onClick={() => setIsCultosMesModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Esta ação criará automaticamente todos os cultos de <strong>Domingo - Manhã (09h)</strong> e <strong>Domingo - Noite (18h)</strong> para o mês selecionado, já com os slots de funções abertos.
            </p>

            <form onSubmit={handleGenerateCultosDoMes} className="space-y-4 pt-2">
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
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCultosMesModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-slate-900 text-amber-400 font-bold text-xs rounded-xl border border-amber-400/30 shadow-sm min-h-[44px] flex items-center justify-center gap-1.5"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Gerar Domingos</span>
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

            {/* Smart Auto-Suggest Bar */}
            <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2 shrink-0">
              <div className="text-xs text-slate-700 dark:text-slate-300">
                <span className="font-bold block">Sugestão Inteligente:</span>
                <span className="text-[11px] text-slate-500">
                  Valida ausências e prioriza voluntários com menos escalas no mês.
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
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-slate-800 text-amber-400 font-bold text-xs sm:text-sm rounded-xl border border-amber-400/30 hover:bg-slate-800 min-h-[44px]"
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
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
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
      {isLeaderOrAdmin && (
        <div className="fixed bottom-18 right-4 sm:bottom-20 sm:right-6 z-40 flex flex-col items-end gap-2">
          {/* Speed dial items */}
          {isFabOpen && (
            <div className="flex flex-col items-end gap-2 mb-1 animate-fadeIn">
              <button
                onClick={() => {
                  setIsFabOpen(false);
                  setIsModelosModalOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 dark:bg-slate-800 text-amber-400 text-xs font-bold rounded-2xl border border-amber-400/30 shadow-lg touch-active"
              >
                <span>Modelos de Culto</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </button>

              <button
                onClick={() => {
                  setIsFabOpen(false);
                  setIsCultosMesModalOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 dark:bg-slate-800 text-amber-400 text-xs font-bold rounded-2xl border border-amber-400/30 shadow-lg touch-active"
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
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-400 text-slate-950 shadow-xl border-2 border-slate-900 flex items-center justify-center font-bold transition-all transform touch-active ${
              isFabOpen ? 'rotate-45 bg-slate-900 text-amber-400 border-amber-400' : 'hover:scale-105 active:scale-95'
            }`}
            aria-label="Ações de Escala"
            title="Ações de Escala"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};
