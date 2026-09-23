import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FuncaoRecord, PerfilSimple, VoluntarioRecord } from '../../types';
import { AvatarUpload } from '../common/AvatarUpload';
import { 
  mediaService, 
  formatPhoneBR, 
  getWhatsAppUrl, 
  DEFAULT_FUNCOES 
} from '../../services/mediaService';
import { 
  Users, 
  UserPlus, 
  Search, 
  Sliders, 
  Plus, 
  X,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Pencil,
  Trash2,
  Tv,
  RefreshCw,
  Sparkles,
  Filter,
  UserCheck,
  Link2,
  Loader2,
  Check,
  ExternalLink,
  Power
} from 'lucide-react';

const TAG_COLOR_OPTIONS = [
  { label: 'Azul', value: 'bg-blue-500' },
  { label: 'Roxo', value: 'bg-purple-500' },
  { label: 'Amarelo', value: 'bg-amber-500' },
  { label: 'Verde', value: 'bg-emerald-500' },
  { label: 'Rosa', value: 'bg-rose-500' },
  { label: 'Ciano', value: 'bg-cyan-500' },
  { label: 'Laranja', value: 'bg-orange-500' },
  { label: 'Índigo', value: 'bg-indigo-500' },
];

export const VoluntariosView: React.FC = () => {
  const { user } = useAuth();
  const isLeaderOrAdmin = user?.role === 'admin' || user?.role === 'leader';

  const [activeSubTab, setActiveSubTab] = useState<'voluntarios' | 'funcoes'>('voluntarios');

  // Data states from Supabase
  const [funcoes, setFuncoes] = useState<FuncaoRecord[]>([]);
  const [voluntarios, setVoluntarios] = useState<VoluntarioRecord[]>([]);
  const [perfisList, setPerfisList] = useState<PerfilSimple[]>([]);

  // Loading and feedback states
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Filter states (default: 'active' as requested)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [functionFilter, setFunctionFilter] = useState<string>('all');

  // Filter states for Funções da Mídia
  const [funcoesSearchQuery, setFuncoesSearchQuery] = useState('');
  const [funcoesStatusFilter, setFuncoesStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');

  // Modal / Bottom-Sheet states for Voluntário
  const [isVoluntarioModalOpen, setIsVoluntarioModalOpen] = useState(false);
  const [editingVoluntario, setEditingVoluntario] = useState<VoluntarioRecord | null>(null);
  
  // Volunteer Form fields
  const [volNome, setVolNome] = useState('');
  const [volSobrenome, setVolSobrenome] = useState('');
  const [volEmail, setVolEmail] = useState('');
  const [volCelular, setVolCelular] = useState('');
  const [volSelectedFuncoes, setVolSelectedFuncoes] = useState<string[]>([]);
  const [volUserId, setVolUserId] = useState<string>('');
  const [volAtivo, setVolAtivo] = useState(true);

  // Modal / Bottom-Sheet states for Função
  const [isFuncaoModalOpen, setIsFuncaoModalOpen] = useState(false);
  const [editingFuncao, setEditingFuncao] = useState<FuncaoRecord | null>(null);

  // Function Form fields
  const [funcNome, setFuncNome] = useState('');
  const [funcDescricao, setFuncDescricao] = useState('');
  const [funcCor, setFuncCor] = useState('bg-blue-500');
  const [funcAtiva, setFuncAtiva] = useState(true);

  // Initial load
  const loadData = async () => {
    setLoading(true);
    setNotice(null);

    const [funcoesRes, volsRes, perfisRes] = await Promise.all([
      mediaService.getFuncoes(),
      mediaService.getVoluntarios(),
      mediaService.getPerfisSimple(),
    ]);

    let loadedFuncoes = funcoesRes.data;

    // Seed default funcoes if none exist and no query error
    if (!funcoesRes.error && loadedFuncoes.length === 0) {
      await mediaService.seedDefaultFuncoes();
      const reFetchFuncoes = await mediaService.getFuncoes();
      loadedFuncoes = reFetchFuncoes.data;
    }

    setFuncoes(loadedFuncoes);
    setVoluntarios(volsRes.data);
    setPerfisList(perfisRes.data);

    if (funcoesRes.error || volsRes.error) {
      const errText = funcoesRes.error || volsRes.error;
      setNotice({
        type: 'error',
        text: `Aviso Supabase: ${errText}. Se as tabelas 'funcoes' ou 'voluntarios' não existirem ainda no seu projeto Supabase, você pode criá-las.`,
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setNotice({ type, text });
    setTimeout(() => {
      setNotice(null);
    }, 4000);
  };

  // --- VOLUNTEER HANDLERS ---
  const handleOpenNewVoluntario = () => {
    setEditingVoluntario(null);
    setVolNome('');
    setVolSobrenome('');
    setVolEmail('');
    setVolCelular('');
    setVolSelectedFuncoes([]);
    setVolUserId('');
    setVolAtivo(true);
    setIsVoluntarioModalOpen(true);
  };

  const handleOpenEditVoluntario = (vol: VoluntarioRecord) => {
    setEditingVoluntario(vol);
    setVolNome(vol.nome);
    setVolSobrenome(vol.sobrenome || '');
    setVolEmail(vol.email || '');
    setVolCelular(vol.celular || '');
    setVolSelectedFuncoes(vol.funcoes_ids || []);
    setVolUserId(vol.user_id || '');
    setVolAtivo(vol.ativo);
    setIsVoluntarioModalOpen(true);
  };

  const toggleVoluntarioFuncaoSelection = (funcaoId: string) => {
    if (volSelectedFuncoes.includes(funcaoId)) {
      setVolSelectedFuncoes(volSelectedFuncoes.filter((id) => id !== funcaoId));
    } else {
      setVolSelectedFuncoes([...volSelectedFuncoes, funcaoId]);
    }
  };

  const handleSaveVoluntario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!volNome.trim()) {
      showToast('error', 'O nome do voluntário é obrigatório.');
      return;
    }

    setActionLoading(true);

    const volPayload: Partial<VoluntarioRecord> = {
      id: editingVoluntario?.id,
      nome: volNome.trim(),
      sobrenome: volSobrenome.trim(),
      email: volEmail.trim() || undefined,
      celular: volCelular.trim(),
      ativo: volAtivo,
      user_id: volUserId || null,
    };

    const result = await mediaService.saveVoluntario(volPayload, volSelectedFuncoes);

    setActionLoading(false);

    if (result.error) {
      showToast('error', `Erro ao salvar voluntário: ${result.error}`);
    } else {
      showToast(
        'success',
        editingVoluntario
          ? `Voluntário ${volNome} atualizado com sucesso!`
          : `Voluntário ${volNome} cadastrado com sucesso!`
      );
      setIsVoluntarioModalOpen(false);
      loadData();
    }
  };

  const handleToggleVoluntarioStatus = async (vol: VoluntarioRecord) => {
    setActionLoading(true);
    const result = await mediaService.toggleVoluntarioStatus(vol.id, vol.ativo);
    setActionLoading(false);

    if (result.error) {
      showToast('error', `Erro ao alterar status: ${result.error}`);
    } else {
      showToast('success', `Status de ${vol.nome} alterado para ${!vol.ativo ? 'Ativo' : 'Inativo'}.`);
      loadData();
    }
  };

  const handleDeleteVoluntario = async (vol: VoluntarioRecord) => {
    if (!window.confirm(`Tem certeza que deseja excluir o voluntário "${vol.nome} ${vol.sobrenome}"?`)) {
      return;
    }
    setActionLoading(true);
    const result = await mediaService.deleteVoluntario(vol.id);
    setActionLoading(false);

    if (result.error) {
      showToast('error', `Erro ao excluir voluntário: ${result.error}`);
    } else {
      showToast('success', `Voluntário ${vol.nome} excluído com sucesso!`);
      loadData();
    }
  };

  // --- FUNÇÃO HANDLERS ---
  const handleOpenNewFuncao = () => {
    setEditingFuncao(null);
    setFuncNome('');
    setFuncDescricao('');
    setFuncCor('bg-blue-500');
    setFuncAtiva(true);
    setIsFuncaoModalOpen(true);
  };

  const handleOpenEditFuncao = (func: FuncaoRecord) => {
    setEditingFuncao(func);
    setFuncNome(func.nome);
    setFuncDescricao(func.descricao);
    setFuncCor(func.cor || 'bg-blue-500');
    setFuncAtiva(func.ativa);
    setIsFuncaoModalOpen(true);
  };

  const handleSaveFuncao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!funcNome.trim()) {
      showToast('error', 'Nome da função é obrigatório.');
      return;
    }

    setActionLoading(true);

    const funcPayload: Partial<FuncaoRecord> = {
      id: editingFuncao?.id,
      nome: funcNome.trim(),
      descricao: funcDescricao.trim(),
      cor: funcCor,
      ativa: funcAtiva,
    };

    const result = await mediaService.saveFuncao(funcPayload);

    setActionLoading(false);

    if (result.error) {
      showToast('error', `Erro ao salvar função: ${result.error}`);
    } else {
      showToast('success', editingFuncao ? 'Função atualizada!' : 'Nova função criada!');
      setIsFuncaoModalOpen(false);
      loadData();
    }
  };

  const handleToggleFuncaoStatus = async (func: FuncaoRecord) => {
    setActionLoading(true);
    const result = await mediaService.toggleFuncaoStatus(func.id, func.ativa);
    setActionLoading(false);

    if (result.error) {
      showToast('error', `Erro ao alterar status: ${result.error}`);
    } else {
      showToast('success', `Função ${func.nome} agora está ${!func.ativa ? 'Ativa' : 'Inativa'}.`);
      loadData();
    }
  };

  // --- FILTERED VOLUNTÁRIOS ---
  const filteredVoluntarios = voluntarios.filter((vol) => {
    // 1. Text Search
    const term = searchQuery.toLowerCase().trim();
    const fullName = `${vol.nome} ${vol.sobrenome}`.toLowerCase();
    const email = (vol.email || '').toLowerCase();
    const funcNames = (vol.funcoes_names || []).join(' ').toLowerCase();

    const matchesSearch =
      !term ||
      fullName.includes(term) ||
      email.includes(term) ||
      funcNames.includes(term);

    // 2. Status Filter
    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = vol.ativo === true;
    if (statusFilter === 'inactive') matchesStatus = vol.ativo === false;

    // 3. Function Filter
    let matchesFunction = true;
    if (functionFilter !== 'all') {
      matchesFunction = (vol.funcoes_ids || []).includes(functionFilter);
    }

    return matchesSearch && matchesStatus && matchesFunction;
  });

  // Filtered Funções da Mídia
  const filteredFuncoes = funcoes.filter((func) => {
    // 1. Text Search
    const term = funcoesSearchQuery.toLowerCase().trim();
    const nome = func.nome.toLowerCase();
    const descricao = (func.descricao || '').toLowerCase();

    const matchesSearch =
      !term ||
      nome.includes(term) ||
      descricao.includes(term);

    // 2. Status Filter
    let matchesStatus = true;
    if (funcoesStatusFilter === 'active') matchesStatus = func.ativa === true;
    if (funcoesStatusFilter === 'inactive') matchesStatus = func.ativa === false;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* HEADER BANNER */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
        <h1 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white tracking-tight">
          Gestão de Voluntários & Funções
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

      {/* NOTICE TOAST / ALERT */}
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

      {/* SUB-TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('voluntarios')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] ${
            activeSubTab === 'voluntarios'
              ? 'bg-black text-amber-400 border border-amber-400/30 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Voluntários ({voluntarios.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('funcoes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] ${
            activeSubTab === 'funcoes'
              ? 'bg-black text-amber-400 border border-amber-400/30 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Funções da Mídia ({funcoes.length})</span>
        </button>
      </div>

      {/* SUB-TAB 1: VOLUNTÁRIOS */}
      {activeSubTab === 'voluntarios' && (
        <div className="space-y-5">
          {/* FILTER TOOLBAR */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, e-mail ou função..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[40px]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'active'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Ativos
              </button>
              <button
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'inactive'
                    ? 'bg-slate-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Inativos
              </button>
            </div>

            {/* Function Filter Select */}
            {funcoes.length > 0 && (
              <div className="relative shrink-0 sm:w-48">
                <select
                  value={functionFilter}
                  onChange={(e) => setFunctionFilter(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[40px] appearance-none"
                >
                  <option value="all">Todas as Funções</option>
                  {funcoes.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
                <Filter className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>

          {/* LOADING STATE */}
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto mb-3" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Carregando voluntários do Supabase...
              </p>
            </div>
          ) : filteredVoluntarios.length === 0 ? (
            /* EMPTY STATE */
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center shadow-sm max-w-xl mx-auto my-6">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-300 mx-auto mb-4">
                <Users className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-2">
                {searchQuery || statusFilter !== 'all' || functionFilter !== 'all'
                  ? 'Nenhum voluntário encontrado com estes filtros'
                  : 'Nenhum voluntário cadastrado'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                {searchQuery || statusFilter !== 'all' || functionFilter !== 'all'
                  ? 'Tente ajustar sua busca ou limpar os filtros de status e função.'
                  : 'Cadastre os membros da equipe de mídia para poder vinculá-los às escalas dos cultos.'}
              </p>
              {searchQuery || statusFilter !== 'all' || functionFilter !== 'all' ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setFunctionFilter('all');
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl hover:bg-slate-200"
                >
                  Limpar Filtros
                </button>
              ) : isLeaderOrAdmin ? (
                <button
                  onClick={handleOpenNewVoluntario}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-black hover:bg-neutral-900 text-amber-400 font-bold text-xs rounded-xl border border-amber-400/30 shadow-xs"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Cadastrar Primeiro Voluntário</span>
                </button>
              ) : null}
            </div>
          ) : (
            /* VOLUNTEER DATA TABLE */
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900">
              <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4">Voluntário</th>
                    <th className="py-3 px-4">Função / Papel</th>
                    <th className="py-3 px-4">Contacto</th>
                    <th className="py-3 px-4">Status</th>
                    {isLeaderOrAdmin && <th className="py-3 px-4 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredVoluntarios.map((vol) => {
                    const whatsAppUrl = getWhatsAppUrl(vol.celular);
                    const hasPhone = Boolean(vol.celular && vol.celular.trim());

                    return (
                      <tr
                        key={vol.id}
                        className={`transition-colors ${
                          vol.ativo
                            ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            : 'bg-slate-50/40 dark:bg-slate-900/40 opacity-75 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        {/* Voluntário */}
                        <td className="py-3.5 px-4 align-middle">
                          <div className="flex items-center gap-3">
                            <AvatarUpload
                              userId={vol.user_id || vol.id}
                              currentAvatarUrl={vol.avatar_url}
                              userName={vol.nome}
                              size="sm"
                              readOnly
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-white text-xs">
                                  {vol.nome} {vol.sobrenome}
                                </span>
                              </div>
                              {vol.user_id ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                  <Link2 className="w-3 h-3" /> Conta Vinculada
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 mt-0.5 block">
                                  Sem Conta de Sistema
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Função / Papel */}
                        <td className="py-3.5 px-4 align-middle">
                          {vol.funcoes_names && vol.funcoes_names.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {vol.funcoes_names.map((name, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80"
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Nenhuma função associada
                            </span>
                          )}
                        </td>

                        {/* Contacto */}
                        <td className="py-3.5 px-4 align-middle">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                              <Phone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span>{vol.celular ? formatPhoneBR(vol.celular) : 'Não informado'}</span>
                              {hasPhone && (
                                <a
                                  href={whatsAppUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                  title="Conversar no WhatsApp"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                            {vol.email ? (
                              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] truncate max-w-[200px]">
                                <Mail className="w-3 h-3 shrink-0 text-slate-400" />
                                <span className="truncate">{vol.email}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] italic">
                                <Mail className="w-3 h-3 shrink-0 text-slate-300 dark:text-slate-600" />
                                <span>Sem e-mail cadastrado</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 align-middle">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              vol.ativo
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${vol.ativo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {vol.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>

                        {/* Ações */}
                        {isLeaderOrAdmin && (
                          <td className="py-3.5 px-4 align-middle text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Power / Toggle status button */}
                              <button
                                onClick={() => handleToggleVoluntarioStatus(vol)}
                                disabled={actionLoading}
                                className={`p-2 rounded-xl border transition-all touch-active ${
                                  vol.ativo
                                    ? 'text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 border-slate-200 dark:border-slate-800'
                                    : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20'
                                }`}
                                title={vol.ativo ? 'Desativar Voluntário' : 'Ativar Voluntário'}
                              >
                                <Power className="w-4 h-4" />
                              </button>

                              {/* Edit button */}
                              <button
                                onClick={() => handleOpenEditVoluntario(vol)}
                                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-amber-500 hover:bg-amber-500/10 border border-slate-200 dark:border-slate-800 transition-all touch-active"
                                title="Editar Voluntário"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>

                              {/* Delete button */}
                              <button
                                onClick={() => handleDeleteVoluntario(vol)}
                                disabled={actionLoading}
                                className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 border border-slate-200 dark:border-slate-800 transition-all touch-active"
                                title="Excluir Voluntário"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: FUNÇÕES DA MÍDIA */}
      {activeSubTab === 'funcoes' && (
        <div className="space-y-5">
          {/* FILTER TOOLBAR - Identical to Voluntários */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={funcoesSearchQuery}
                onChange={(e) => setFuncoesSearchQuery(e.target.value)}
                placeholder="Buscar função por nome ou descrição..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[40px]"
              />
              {funcoesSearchQuery && (
                <button
                  onClick={() => setFuncoesSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setFuncoesStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  funcoesStatusFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFuncoesStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  funcoesStatusFilter === 'active'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Ativos
              </button>
              <button
                onClick={() => setFuncoesStatusFilter('inactive')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  funcoesStatusFilter === 'inactive'
                    ? 'bg-slate-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Desativados
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto mb-3" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Carregando funções do Supabase...
              </p>
            </div>
          ) : funcoes.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center shadow-sm max-w-md mx-auto my-6">
              <Sliders className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">
                Nenhuma função cadastrada
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Crie as funções de mídia (ex: Transmissão, Câmeras, Som, Projeção).
              </p>
              {isLeaderOrAdmin && (
                <button
                  onClick={handleOpenNewFuncao}
                  className="px-4 py-2.5 bg-black hover:bg-neutral-900 text-amber-400 font-bold text-xs rounded-xl border border-amber-400/30 shadow-xs"
                >
                  Criar Primeira Função
                </button>
              )}
            </div>
          ) : filteredFuncoes.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center shadow-sm max-w-md mx-auto my-6">
              <Sliders className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">
                Nenhuma função encontrada com estes filtros
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Tente ajustar sua busca por nome ou alterar o filtro de status.
              </p>
              <button
                onClick={() => {
                  setFuncoesSearchQuery('');
                  setFuncoesStatusFilter('all');
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl hover:bg-slate-200"
              >
                Limpar Filtros (Ver Todas)
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900">
              <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4">Função</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Voluntários Aptos</th>
                    <th className="py-3 px-4">Status</th>
                    {isLeaderOrAdmin && <th className="py-3 px-4 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredFuncoes.map((func) => (
                    <tr
                      key={func.id}
                      className={`transition-colors ${
                        func.ativa
                          ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          : 'bg-slate-50/40 dark:bg-slate-900/40 opacity-75 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <td className="py-3.5 px-4 align-middle font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg ${func.cor || 'bg-blue-500'} text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0`}
                          >
                            <Tv className="w-4 h-4" />
                          </div>
                          <span>{func.nome}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-middle text-slate-600 dark:text-slate-400 max-w-xs">
                        {func.descricao || 'Sem descrição cadastrada.'}
                      </td>
                      <td className="py-3.5 px-4 align-middle">
                        <span className="font-bold text-slate-900 dark:text-amber-400 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-amber-500" />
                          {func.voluntarios_count || 0} membros
                        </span>
                      </td>
                      <td className="py-3.5 px-4 align-middle">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            func.ativa
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${func.ativa ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {func.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      {isLeaderOrAdmin && (
                        <td className="py-3.5 px-4 align-middle text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleFuncaoStatus(func)}
                              disabled={actionLoading}
                              className={`p-2 rounded-xl border transition-all touch-active ${
                                func.ativa
                                  ? 'text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 border-slate-200 dark:border-slate-800'
                                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20'
                              }`}
                              title={func.ativa ? 'Desativar Função' : 'Ativar Função'}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditFuncao(func)}
                              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-amber-500 hover:bg-amber-500/10 border border-slate-200 dark:border-slate-800 transition-all touch-active"
                              title="Editar Função"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- MODAL / BOTTOM-SHEET: VOLUNTÁRIO FORM --- */}
      {isVoluntarioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          {/* Container: Bottom Sheet on Mobile, Centered Modal on Desktop */}
          <div className="bg-white dark:bg-slate-900 w-full sm:max-w-xl rounded-t-[32px] sm:rounded-3xl border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-black text-white px-6 py-4 flex items-center justify-between border-b border-neutral-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white">
                    {editingVoluntario ? 'Editar Voluntário' : 'Novo Voluntário'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Sincronização direta com a tabela public.voluntarios
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsVoluntarioModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveVoluntario} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nome */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={volNome}
                    onChange={(e) => setVolNome(e.target.value)}
                    placeholder="Ex: Gabriel"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
                  />
                </div>

                {/* Sobrenome */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sobrenome
                  </label>
                  <input
                    type="text"
                    value={volSobrenome}
                    onChange={(e) => setVolSobrenome(e.target.value)}
                    placeholder="Ex: Silva"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
                  />
                </div>
              </div>

              {/* Email (Opcional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={volEmail}
                    onChange={(e) => setVolEmail(e.target.value)}
                    placeholder="voluntario@exemplo.com (opcional)"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
                  />
                </div>
              </div>

              {/* Celular with Brazilian formatting */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Celular / WhatsApp (Formatação Automática)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={volCelular}
                    onChange={(e) => setVolCelular(formatPhoneBR(e.target.value))}
                    placeholder="(11) 98765-4321"
                    maxLength={15}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
                  />
                </div>
              </div>

              {/* Multi-select Funções Chips */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Funções que o Voluntário Domina/Exerce:
                </label>
                {funcoes.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    Nenhuma função cadastrada. Crie funções na aba "Funções da Mídia".
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                    {funcoes.map((fn) => {
                      const isSelected = volSelectedFuncoes.includes(fn.id);
                      return (
                        <button
                          type="button"
                          key={fn.id}
                          onClick={() => toggleVoluntarioFuncaoSelection(fn.id)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border min-h-[38px] ${
                            isSelected
                              ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          <span>{fn.nome}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Link to System Profile (public.perfis) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vincular a Usuário Cadastrado no Sistema (Opcional):
                </label>
                <select
                  value={volUserId}
                  onChange={(e) => setVolUserId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
                >
                  <option value="">Sem Vínculo (user_id = null)</option>
                  {perfisList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} {p.sobrenome} ({p.nivel_acesso})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Associa o voluntário a uma conta ativa na tabela public.perfis.
                </p>
              </div>

              {/* Status Toggle */}
              <div className="pt-2 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Status do Voluntário
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Voluntários inativos não aparecem na criação de novas escalas
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setVolAtivo(!volAtivo)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    volAtivo
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-500/10 text-slate-500 border-slate-500/30'
                  }`}
                >
                  {volAtivo ? 'Ativo' : 'Inativo'}
                </button>
              </div>

              {/* Form Actions Footer */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsVoluntarioModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl min-h-[44px]"
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
                    <span>Salvar Voluntário</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL / BOTTOM-SHEET: FUNÇÃO FORM --- */}
      {isFuncaoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-[32px] sm:rounded-3xl border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="bg-black text-white px-6 py-4 flex items-center justify-between border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center font-bold">
                  <Sliders className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-base text-white">
                  {editingFuncao ? 'Editar Função' : 'Nova Função'}
                </h3>
              </div>
              <button
                onClick={() => setIsFuncaoModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFuncao} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Função <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={funcNome}
                  onChange={(e) => setFuncNome(e.target.value)}
                  placeholder="Ex: Operador de Câmera 1"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Descrição Curta
                </label>
                <textarea
                  rows={2}
                  value={funcDescricao}
                  onChange={(e) => setFuncDescricao(e.target.value)}
                  placeholder="Descrição da atribuição ou requisitos mínimos..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* Tag Color Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Cor de Identificação da Tag:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {TAG_COLOR_OPTIONS.map((c) => {
                    const isSelected = funcCor === c.value;
                    return (
                      <button
                        type="button"
                        key={c.value}
                        onClick={() => setFuncCor(c.value)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all min-h-[44px] ${
                          isSelected
                            ? 'border-amber-400 bg-amber-400/10 font-bold'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full ${c.value}`} />
                        <span className="text-[10px] text-slate-600 dark:text-slate-300">
                          {c.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Status Inicial
                </span>
                <button
                  type="button"
                  onClick={() => setFuncAtiva(!funcAtiva)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    funcAtiva
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-500/10 text-slate-500 border-slate-500/30'
                  }`}
                >
                  {funcAtiva ? 'Ativa' : 'Inativa'}
                </button>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFuncaoModalOpen(false)}
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
                    <span>Salvar Função</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLOATING ACTION BUTTON (FAB) FOR LEADERS & ADMINS */}
      {isLeaderOrAdmin && (
        <div className="fixed bottom-18 right-4 sm:bottom-20 sm:right-6 z-40">
          <button
            onClick={activeSubTab === 'voluntarios' ? handleOpenNewVoluntario : handleOpenNewFuncao}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-400 text-slate-950 shadow-xl border-2 border-slate-900 flex items-center justify-center font-bold hover:scale-105 active:scale-95 transition-all touch-active"
            aria-label={activeSubTab === 'voluntarios' ? 'Novo Voluntário' : 'Nova Função'}
            title={activeSubTab === 'voluntarios' ? 'Novo Voluntário' : 'Nova Função'}
          >
            <Plus className="w-6 h-6 text-slate-950" />
          </button>
        </div>
      )}
    </div>
  );
};
