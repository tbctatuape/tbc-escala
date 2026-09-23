import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CultoComEscala, EscalaItemRecord, VoluntarioRecord } from '../../types';
import { escalaService } from '../../services/escalaService';
import { unavailabilityService } from '../../services/unavailabilityService';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  XCircle,
  X,
  MessageSquare,
  ArrowRight,
  Loader2,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import { PWAInstallCard } from '../pwa/PWAInstallCard';

interface InicioViewProps {
  onNavigateToEscalas: () => void;
}

export const InicioView: React.FC<InicioViewProps> = ({ onNavigateToEscalas }) => {
  const { user } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [currentUserVoluntario, setCurrentUserVoluntario] = useState<VoluntarioRecord | null>(null);
  const [cultosComEscala, setCultosComEscala] = useState<CultoComEscala[]>([]);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Modal: Pedir Substituição / Recusar
  const [recusalTarget, setRecusalTarget] = useState<{
    item: EscalaItemRecord;
    cultoTitulo: string;
    cultoData: string;
  } | null>(null);
  const [recusalMotivoOpcao, setRecusalMotivoOpcao] = useState<string>('Trabalho / Estudo');
  const [recusalMotivoTexto, setRecusalMotivoTexto] = useState<string>('');
  const [savingRecusal, setSavingRecusal] = useState<boolean>(false);

  const getTodayStr = () => {
    return new Date().toISOString().split('T')[0];
  };

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setNotice({ type, text });
    setTimeout(() => {
      setNotice(null);
    }, 4000);
  };

  const loadData = async () => {
    setLoading(true);
    setNotice(null);

    const todayStr = getTodayStr();

    // 1. Get Cultos
    const cultosRes = await escalaService.getCultosComEscalas();
    setCultosComEscala(cultosRes.data);

    // 2. Identify Current User Voluntario
    if (user) {
      const userVolRes = await unavailabilityService.getVoluntarioForCurrentUser(user.id, user.email);
      setCurrentUserVoluntario(userVolRes.voluntario);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

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
      showToast('error', `Erro ao atualizar no banco: ${res.error}`);
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

    setSavingRecusal(true);

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
    setSavingRecusal(false);
    showToast('error', 'Escala recusada. O líder foi notificado para providenciar substituto.');

    const res = await escalaService.responderConfirmacao(itemId, 'recusado', fullMotivo);
    if (res.error) {
      showToast('error', `Erro ao salvar recusa: ${res.error}`);
      loadData(); // Revert
    }
  };

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

  const todayStr = getTodayStr();

  // Filter items where current logged-in volunteer is scheduled in upcoming services
  const myUpcomingCultos = cultosComEscala
    .filter((c) => c.culto.data >= todayStr)
    .filter((c) =>
      currentUserVoluntario
        ? c.escala_itens.some((it) => it.voluntario_id === currentUserVoluntario.id)
        : false
    );

  // Calculate Metrics
  const myUpcomingItems = cultosComEscala
    .filter((c) => c.culto.data >= todayStr)
    .flatMap((c) =>
      c.escala_itens
        .filter((it) => currentUserVoluntario && it.voluntario_id === currentUserVoluntario.id)
        .map((it) => ({ ...it, culto: c.culto }))
    );

  const countTotal = myUpcomingItems.length;
  const countConfirmed = myUpcomingItems.filter((i) => i.status_confirmacao === 'confirmado').length;
  const countPending = myUpcomingItems.filter((i) => !i.status_confirmacao || i.status_confirmacao === 'pendente').length;
  const countDeclined = myUpcomingItems.filter((i) => i.status_confirmacao === 'recusado').length;

  const userDisplayName = currentUserVoluntario
    ? `${currentUserVoluntario.nome}`
    : user?.fullName
    ? user.fullName.split(' ')[0]
    : 'Voluntário';

  return (
    <div className="space-y-5 animate-fadeIn pb-12">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-sm font-display shadow-xs">
            {userDisplayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white tracking-tight">
              Olá, {userDisplayName}!
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Seu Painel Pessoal de Escalas
            </p>
          </div>
        </div>

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

      {/* PWA INSTALL NOTIFICATION & TUTORIALS */}
      <PWAInstallCard />

      {/* MINIMALIST 2x2 METRIC CARDS LADO A LADO */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
        <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
          <div>
            <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium block">
              Próximas Escalas
            </span>
            <span className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 block">
              {countTotal}
            </span>
          </div>
          <CalendarIcon className="w-5 h-5 text-amber-500 opacity-80" />
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold block text-emerald-700 dark:text-emerald-400">
              Confirmadas
            </span>
            <span className="text-xl font-bold text-emerald-800 dark:text-emerald-200 mt-0.5 block">
              {countConfirmed}
            </span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold block text-amber-700 dark:text-amber-400">
              Pendentes
            </span>
            <span className="text-xl font-bold text-amber-900 dark:text-amber-200 mt-0.5 block">
              {countPending}
            </span>
          </div>
          <Clock className="w-5 h-5 text-amber-500" />
        </div>

        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-800 dark:text-red-300 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold block text-red-700 dark:text-red-400">
              Recusadas
            </span>
            <span className="text-xl font-bold text-red-800 dark:text-red-200 mt-0.5 block">
              {countDeclined}
            </span>
          </div>
          <AlertTriangle className="w-5 h-5 text-red-500" />
        </div>
      </div>

      {/* SECTION TITLE: "QUANDO EU TOCO?" */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-amber-500" />
          <span>Quando eu toco? (Minhas Escalas)</span>
        </h2>

        <button
          onClick={onNavigateToEscalas}
          className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 min-h-[32px]"
        >
          <span>Ver todos os cultos</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* SCHEDULED SERVICES LIST */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto mb-3" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Carregando suas escalas...
          </p>
        </div>
      ) : myUpcomingCultos.length === 0 ? (
        /* EMPTY STATE FOR VOLUNTEER HAS NO UPCOMING SERVICES */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center shadow-xs max-w-lg mx-auto my-4 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-amber-500 mx-auto">
            <CalendarIcon className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white mb-1">
              Nenhuma escala agendada no momento
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Você não está escalado para nenhum dos próximos cultos cadastrados. Aproveite para descansar ou veja a programação completa.
            </p>
          </div>
          <button
            onClick={onNavigateToEscalas}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-black hover:bg-neutral-900 text-amber-400 font-bold text-xs rounded-xl border border-amber-400/30 transition-all touch-active min-h-[44px] shadow-xs"
          >
            <span>Ver Programação de Cultos</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* UPCOMING MY ESCALAS CARDS */
        <div className="space-y-4">
          {myUpcomingCultos.map((cComE) => {
            const culto = cComE.culto;
            const myAssignedItem = currentUserVoluntario
              ? cComE.escala_itens.find((it) => it.voluntario_id === currentUserVoluntario.id)
              : null;

            if (!myAssignedItem) return null;

            const st = myAssignedItem.status_confirmacao || 'pendente';

            return (
              <div
                key={culto.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-amber-400/60 ring-1 ring-amber-400/20 p-5 shadow-xs space-y-4 transition-all"
              >
                {/* Culto Title & Time Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
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
                        {culto.periodo === 'manha' ? 'Manhã' : culto.periodo === 'noite' ? 'Noite' : 'Integral'}
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

                  {/* Function Badge */}
                  <div className="shrink-0 text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Sua Função
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-black text-amber-400 border border-amber-400/30 text-xs font-bold inline-block shadow-xs">
                      {myAssignedItem.funcao_nome}
                    </span>
                  </div>
                </div>

                {/* CONFIRMATION / ACTION BOX */}
                {st === 'confirmado' ? (
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
                      onClick={() => handleOpenRecusalModal(myAssignedItem, culto.titulo, culto.data)}
                      className="text-[11px] font-semibold text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:underline min-h-[36px] px-2 py-1 self-end sm:self-auto"
                    >
                      Pedir substituição / recusal
                    </button>
                  </div>
                ) : st === 'recusado' ? (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-900 dark:text-red-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
                      onClick={() => handleConfirmarPresenca(myAssignedItem)}
                      className="text-[11px] font-bold px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all min-h-[38px] self-end sm:self-auto"
                    >
                      Mudei de ideia: Confirmar
                    </button>
                  </div>
                ) : (
                  /* PENDING ACTION CALLOUT */
                  <div className="p-4 bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-transparent border-2 border-amber-400/60 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          Por favor, confirme sua presença nesta escala
                        </span>
                      </div>
                      <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] rounded uppercase shrink-0">
                        Resposta Pendente
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleConfirmarPresenca(myAssignedItem)}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all touch-active min-h-[44px]"
                      >
                        <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                        <span>Confirmar Presença</span>
                      </button>

                      <button
                        onClick={() => handleOpenRecusalModal(myAssignedItem, culto.titulo, culto.data)}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs sm:text-sm rounded-xl border border-red-500/30 transition-all touch-active min-h-[44px]"
                      >
                        <XCircle className="w-4 h-4 stroke-[2.5]" />
                        <span>Pedir Substituição / Recusar</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TEAM MEMBERS SUMMARY */}
                <div className="pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Equipe Escalada com você:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {cComE.escala_itens.map((it, idx) => (
                      <span
                        key={idx}
                        className={`px-2 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1 ${
                          it.voluntario_id === currentUserVoluntario?.id
                            ? 'bg-amber-400/20 text-amber-900 dark:text-amber-200 border-amber-400/30 font-bold'
                            : it.voluntario_id
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            : 'bg-slate-50 dark:bg-slate-800/40 text-slate-400 border-dashed border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${it.funcao_cor || 'bg-blue-500'}`} />
                        <span className="font-semibold">{it.funcao_nome}:</span>
                        <span>{it.voluntario_nome || 'Vago'}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- BOTTOM-SHEET / MODAL: RECUSAR / PEDIR SUBSTITUIÇÃO --- */}
      {recusalTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-[32px] sm:rounded-3xl border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="bg-black text-white px-6 py-4 flex items-center justify-between border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center font-bold">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white">
                    Pedir Substituição
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {recusalTarget.cultoTitulo} • {formatDateHeader(recusalTarget.cultoData)}
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Por que você não poderá servir nesta data?
                </label>
                <select
                  value={recusalMotivoOpcao}
                  onChange={(e) => setRecusalMotivoOpcao(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
                >
                  <option value="Trabalho / Estudo">Trabalho / Estudo</option>
                  <option value="Viagem / Ausente da Cidade">Viagem / Ausente da Cidade</option>
                  <option value="Motivo de Saúde / Família">Motivo de Saúde / Família</option>
                  <option value="Imprevisto Pessoal">Imprevisto Pessoal</option>
                  <option value="Outro Motivo">Outro Motivo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Detalhes / Observação para a Liderança (Opcional):
                </label>
                <textarea
                  rows={2}
                  value={recusalMotivoTexto}
                  onChange={(e) => setRecusalMotivoTexto(e.target.value)}
                  placeholder="Informe qualquer detalhe adicional para ajudar na substituição..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRecusalTarget(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingRecusal}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs min-h-[44px]"
                >
                  {savingRecusal ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <span>Confirmar Pedido de Substituição</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
