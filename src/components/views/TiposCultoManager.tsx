import React, { useEffect, useState } from 'react';
import { TipoCultoRecord } from '../../types';
import { tipoCultoService } from '../../services/tipoCultoService';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X, 
  Sparkles,
  Repeat,
  Check,
  Power
} from 'lucide-react';

const DIAS_SEMANA_LABELS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

interface TiposCultoManagerProps {
  onClose?: () => void;
  isModal?: boolean;
}

export const TiposCultoManager: React.FC<TiposCultoManagerProps> = ({ onClose, isModal = false }) => {
  const [modelos, setModelos] = useState<TipoCultoRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Notice toast
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Form Fields
  const [nome, setNome] = useState('');
  const [diaSemana, setDiaSemana] = useState<number>(0); // 0 = Domingo
  const [semanaMes, setSemanaMes] = useState<number | null>(null); // null = Todos
  const [mesesIntervalo, setMesesIntervalo] = useState<number>(1); // 1 = Mensal
  const [horario, setHorario] = useState('10:00');
  const [periodo, setPeriodo] = useState('Manhã');
  const [ativo, setAtivo] = useState(true);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  };

  const loadModelos = async () => {
    setIsLoading(true);
    const res = await tipoCultoService.getTiposCulto();
    if (res.error) {
      showToast('error', `Aviso ao carregar modelos: ${res.error}`);
    } else {
      setModelos(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadModelos();
  }, []);

  const resetForm = () => {
    setNome('');
    setDiaSemana(0);
    setSemanaMes(null);
    setMesesIntervalo(1);
    setHorario('10:00');
    setPeriodo('Manhã');
    setAtivo(true);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (modelo: TipoCultoRecord) => {
    setEditingId(modelo.id);
    setNome(modelo.nome);
    setDiaSemana(modelo.dia_semana);
    setSemanaMes(modelo.semana_mes);
    setMesesIntervalo(modelo.meses_intervalo || 1);
    setHorario(modelo.horario || '10:00');
    setPeriodo(modelo.periodo || 'Manhã');
    setAtivo(modelo.ativo !== false);
    setShowForm(true);
  };

  const handleToggleAtivo = async (modelo: TipoCultoRecord) => {
    const newAtivo = !(modelo.ativo !== false);
    const res = await tipoCultoService.updateTipoCulto(modelo.id, { ativo: newAtivo });
    if (res.error) {
      showToast('error', `Erro ao alterar status: ${res.error}`);
    } else {
      showToast('success', `Modelo "${modelo.nome}" ${newAtivo ? 'ativado' : 'desativado'} com sucesso!`);
      loadModelos();
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Deseja realmente excluir o modelo "${nome}"?`)) return;
    const res = await tipoCultoService.deleteTipoCulto(id);
    if (res.error) {
      showToast('error', `Erro ao excluir: ${res.error}`);
    } else {
      showToast('success', `Modelo "${nome}" excluído com sucesso!`);
      loadModelos();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      showToast('error', 'Por favor, informe o nome do modelo de culto.');
      return;
    }

    setIsSaving(true);

    if (editingId) {
      // Update
      const res = await tipoCultoService.updateTipoCulto(editingId, {
        nome: nome.trim(),
        dia_semana: diaSemana,
        semana_mes: semanaMes,
        meses_intervalo: mesesIntervalo,
        horario,
        periodo,
        ativo,
      });

      if (res.error) {
        showToast('error', `Erro ao salvar modelo: ${res.error}`);
      } else {
        showToast('success', `Modelo "${nome}" atualizado com sucesso!`);
        resetForm();
        loadModelos();
      }
    } else {
      // Create
      const res = await tipoCultoService.createTipoCulto({
        nome: nome.trim(),
        dia_semana: diaSemana,
        semana_mes: semanaMes,
        meses_intervalo: mesesIntervalo,
        horario,
        periodo,
        ativo,
      });

      if (res.error) {
        showToast('error', `Erro ao criar modelo: ${res.error}`);
      } else {
        showToast('success', `Modelo "${nome}" criado com sucesso!`);
        resetForm();
        loadModelos();
      }
    }

    setIsSaving(false);
  };

  return (
    <div className={`space-y-6 ${isModal ? 'p-2' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
        <h2 className="font-display font-bold text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
          Modelos de Culto & Recorrência
        </h2>

        <div className="flex items-center gap-2">
          {!showForm && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-black hover:bg-neutral-900 text-amber-400 font-bold text-xs rounded-xl border border-amber-400/30 transition-all touch-active shadow-sm min-h-[42px]"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Novo Modelo</span>
            </button>
          )}

          {isModal && onClose && (
            <button
              onClick={onClose}
              className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl bg-slate-100 dark:bg-slate-800 min-h-[42px]"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Notice Toast */}
      {notice && (
        <div
          className={`p-4 text-xs font-medium rounded-2xl border flex items-start gap-2.5 shadow-sm animate-fadeIn ${
            notice.type === 'error'
              ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
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

      {/* FORM: CREATE / EDIT MODELO */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-slate-50 dark:bg-slate-800/80 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-sm space-y-4 animate-fadeIn"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Repeat className="w-4 h-4 text-amber-500" />
              {editingId ? 'Editar Modelo de Culto' : 'Cadastrar Novo Modelo de Culto'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nome do Culto */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nome do Culto <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Santa Ceia, Culto de Mulheres, Ensaio Geral"
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
              />
            </div>

            {/* Dia da Semana */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Dia da Semana
              </label>
              <select
                value={diaSemana}
                onChange={(e) => setDiaSemana(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
              >
                {DIAS_SEMANA_LABELS.map((label, idx) => (
                  <option key={idx} value={idx}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Ocorrência no Mês (semana_mes) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ocorrência no Mês (semana_mes)
              </label>
              <select
                value={semanaMes === null ? 'all' : semanaMes}
                onChange={(e) => {
                  const val = e.target.value;
                  setSemanaMes(val === 'all' ? null : Number(val));
                }}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
              >
                <option value="all">Todos os dias da semana no mês</option>
                <option value="1">1º ocorrência do mês (ex: 1º Domingo)</option>
                <option value="2">2º ocorrência do mês (ex: 2º Sábado)</option>
                <option value="3">3º ocorrência do mês (ex: 3º Domingo)</option>
                <option value="4">4º ocorrência do mês (ex: 4º Sábado)</option>
              </select>
            </div>

            {/* Frequência / Intervalo de Meses */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Frequência de Meses
              </label>
              <select
                value={mesesIntervalo}
                onChange={(e) => setMesesIntervalo(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
              >
                <option value={1}>Todos os meses (Mensal)</option>
                <option value={2}>A cada 2 meses (Bimestral)</option>
                <option value={3}>A cada 3 meses (Trimestral)</option>
              </select>
            </div>

            {/* Horário */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Horário do Culto
              </label>
              <input
                type="time"
                required
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
              />
            </div>

            {/* Período */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Período
              </label>
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
              >
                <option value="Manhã">Manhã</option>
                <option value="Tarde">Tarde</option>
                <option value="Noite">Noite</option>
              </select>
            </div>

            {/* Ativo Checkbox */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="modeloAtivo"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300"
              />
              <label htmlFor="modeloAtivo" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                Modelo Ativo no Motor de Recorrência
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-black hover:bg-neutral-900 text-amber-400 font-bold text-xs rounded-xl border border-amber-400/30 flex items-center gap-2 touch-active min-h-[42px] shadow-xs"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              ) : (
                <>
                  <Check className="w-4 h-4 text-amber-400" />
                  <span>{editingId ? 'Salvar Alterações' : 'Cadastrar Modelo'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* LIST OF MODELOS (RESPONSIVE DATA TABLE) */}
      {isLoading ? (
        <div className="py-12 text-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto" />
          <p className="text-xs text-slate-400">Carregando modelos de culto do Supabase...</p>
        </div>
      ) : modelos.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
          <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
            Nenhum modelo de culto cadastrado
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Cadastre modelos de culto com regras de dia, semana e intervalo para gerar a escala do mês automaticamente.
          </p>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="px-4 py-2 bg-black hover:bg-neutral-900 text-amber-400 text-xs font-bold rounded-xl border border-amber-400/30 shadow-xs"
          >
            Cadastrar Primeiro Modelo
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <table className="w-full text-left text-xs border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4 font-bold">Nome do Culto</th>
                <th className="py-3.5 px-4 font-bold">Dia da Semana</th>
                <th className="py-3.5 px-4 font-bold">Ocorrência no Mês</th>
                <th className="py-3.5 px-4 font-bold">Frequência de Meses</th>
                <th className="py-3.5 px-4 font-bold">Horário</th>
                <th className="py-3.5 px-4 font-bold">Período</th>
                <th className="py-3.5 px-4 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {modelos.map((m) => {
                const isAtivo = m.ativo !== false;
                const ocorrenciaText =
                  m.semana_mes === null ? 'Todos' : `${m.semana_mes}ª ocorrência`;

                const frequenciaText =
                  m.meses_intervalo > 1 ? `A cada ${m.meses_intervalo} meses` : 'Todos os meses';

                return (
                  <tr
                    key={m.id}
                    className={`transition-colors ${
                      isAtivo
                        ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        : 'bg-slate-50/50 dark:bg-slate-800/20 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {/* Nome do Culto */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          {m.nome}
                        </span>
                        {!isAtivo && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-500 uppercase">
                            Inativo
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Dia da Semana */}
                    <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {DIAS_SEMANA_LABELS[m.dia_semana]}
                      </span>
                    </td>

                    {/* Ocorrência no Mês */}
                    <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400/10 text-amber-700 dark:text-amber-400 font-semibold text-[11px] border border-amber-400/20">
                        <Calendar className="w-3 h-3" />
                        <span>{ocorrenciaText}</span>
                      </span>
                    </td>

                    {/* Frequência de Meses */}
                    <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-[11px] border border-blue-500/20">
                        <Repeat className="w-3 h-3" />
                        <span>{frequenciaText}</span>
                      </span>
                    </td>

                    {/* Horário do Culto */}
                    <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {m.horario}
                      </span>
                    </td>

                    {/* Período */}
                    <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                      <span className="font-medium text-slate-600 dark:text-slate-400">
                        {m.periodo || 'N/I'}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleToggleAtivo(m)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isAtivo
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400 hover:text-slate-600'
                          }`}
                          title={isAtivo ? 'Desativar modelo' : 'Ativar modelo'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleEdit(m)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors touch-active cursor-pointer"
                          title="Editar modelo"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(m.id, m.nome)}
                          className="p-1.5 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors touch-active cursor-pointer"
                          title="Excluir modelo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
