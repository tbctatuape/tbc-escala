import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { NivelAcesso, PerfilRecord, VoluntarioRecord } from '../../types';
import { userService, UserWithVolunteerLink } from '../../services/userService';
import { TiposCultoManager } from './TiposCultoManager';
import { AvatarUpload } from '../common/AvatarUpload';
import { 
  Database, 
  ShieldCheck, 
  Sun, 
  Moon, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Save, 
  Link as LinkIcon,
  RefreshCw,
  Phone,
  Mail,
  Shield,
  ShieldAlert,
  Users,
  UserCheck,
  UserPlus,
  Loader2,
  Check,
  X,
  Crown,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Trash2,
  Pencil
} from 'lucide-react';

export const ConfiguracoesView: React.FC = () => {
  const { user, supabaseConfig, updateSupabaseConfig, refreshUserProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [url, setUrl] = useState(supabaseConfig.url || '');
  const [anonKey, setAnonKey] = useState(supabaseConfig.anonKey || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSupabaseConfigOpen, setIsSupabaseConfigOpen] = useState(false);

  // User Management State (Admin only)
  const [usersList, setUsersList] = useState<UserWithVolunteerLink[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Create User Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newSobrenome, setNewSobrenome] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newSenha, setNewSenha] = useState('');
  const [newNivel, setNewNivel] = useState<NivelAcesso>('voluntario');
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [isSubmittingNewUser, setIsSubmittingNewUser] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);

  // Delete User Modal State
  const [userToDelete, setUserToDelete] = useState<PerfilRecord | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Edit User Modal State
  const [userToEdit, setUserToEdit] = useState<PerfilRecord | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editSobrenome, setEditSobrenome] = useState('');
  const [editNivel, setEditNivel] = useState<NivelAcesso>('voluntario');
  const [selectedVoluntarioId, setSelectedVoluntarioId] = useState<string>('');
  const [voluntariosOptions, setVoluntariosOptions] = useState<VoluntarioRecord[]>([]);
  const [isLoadingVoluntarios, setIsLoadingVoluntarios] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editUserError, setEditUserError] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError(null);

    if (!newNome.trim() || !newEmail.trim() || !newSenha.trim()) {
      setCreateUserError('Preencha todos os campos obrigatórios.');
      return;
    }

    if (newSenha.length < 6) {
      setCreateUserError('A senha temporária deve conter no mínimo 6 caracteres.');
      return;
    }

    setIsSubmittingNewUser(true);
    const res = await userService.criarUsuarioAdmin({
      nome: newNome,
      sobrenome: newSobrenome,
      email: newEmail,
      senha: newSenha,
      nivel: newNivel,
    });
    setIsSubmittingNewUser(false);

    if (res.error) {
      setCreateUserError(res.error);
    } else {
      showToast('success', `Acesso criado com sucesso para ${newNome} ${newSobrenome}!`);
      setIsCreateModalOpen(false);
      setNewNome('');
      setNewSobrenome('');
      setNewEmail('');
      setNewSenha('');
      setNewNivel('voluntario');
      loadUsers();
    }
  };

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setNotice({ type, text });
    setTimeout(() => {
      setNotice(null);
    }, 4000);
  };

  // Load Users from public.perfis
  const loadUsers = async () => {
    if (!isAdmin) return;
    setUsersLoading(true);
    const result = await userService.getPerfisComVoluntario();
    if (result.error) {
      showToast('error', `Aviso ao carregar usuários: ${result.error}`);
    } else {
      setUsersList(result.data);
    }
    setUsersLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, [user]);

  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    updateSupabaseConfig(url, anonKey);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleRefreshProfile = async () => {
    setIsRefreshing(true);
    await refreshUserProfile();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Change user role (RBAC)
  const handleChangeRole = async (perfil: PerfilRecord, newRole: NivelAcesso) => {
    // Security check: Don't allow currently logged-in admin to demote themselves
    if (perfil.id === user?.id && newRole !== 'admin') {
      showToast('error', 'Por motivos de segurança, você não pode rebaixar seu próprio nível de administrador.');
      return;
    }

    setActionLoadingId(perfil.id);
    const res = await userService.updateNivelAcesso(perfil.id, newRole);
    setActionLoadingId(null);

    if (res.error) {
      showToast('error', `Erro ao atualizar nível de acesso: ${res.error}`);
    } else {
      showToast('success', `Nível de acesso de ${perfil.nome} alterado para ${newRole.toUpperCase()}!`);
      loadUsers();
    }
  };

  // Link / Create Volunteer
  const handleVincularVoluntario = async (item: UserWithVolunteerLink) => {
    setActionLoadingId(item.perfil.id);
    const res = await userService.vincularOuCriarVoluntario(item.perfil);
    setActionLoadingId(null);

    if (res.error) {
      showToast('error', `Erro ao vincular voluntário: ${res.error}`);
    } else {
      showToast('success', `Registro de voluntário vinculado com sucesso para ${item.perfil.nome}!`);
      loadUsers();
    }
  };

  // Delete User via RPC
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    const res = await userService.deletarUsuarioAdmin(userToDelete.id);
    setIsDeletingUser(false);

    if (res.error) {
      showToast('error', `Erro ao excluir usuário: ${res.error}`);
    } else {
      showToast('success', `Usuário ${userToDelete.nome} excluído com sucesso!`);
      setUserToDelete(null);
      loadUsers();
    }
  };

  // Open Edit User Modal
  const handleOpenEditModal = async (item: UserWithVolunteerLink) => {
    const p = item.perfil;
    setUserToEdit(p);
    setEditNome(p.nome || '');
    setEditSobrenome(p.sobrenome || '');
    setEditNivel(p.nivel_acesso || 'voluntario');
    setSelectedVoluntarioId(item.voluntario?.id || '');
    setEditUserError(null);

    setIsLoadingVoluntarios(true);
    const res = await userService.getTodosVoluntarios();
    setIsLoadingVoluntarios(false);
    if (res.data) {
      setVoluntariosOptions(res.data);
    }
  };

  // Save User Edit (Name, Surname, Level, Volunteer Link)
  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;
    setEditUserError(null);

    if (!editNome.trim()) {
      setEditUserError('O campo Nome é obrigatório.');
      return;
    }

    setIsSavingEdit(true);
    const res = await userService.updatePerfilCompleto({
      userId: userToEdit.id,
      nome: editNome,
      sobrenome: editSobrenome,
      nivel_acesso: editNivel,
      voluntarioId: selectedVoluntarioId ? selectedVoluntarioId : null,
    });
    setIsSavingEdit(false);

    if (res.error) {
      setEditUserError(`Erro ao atualizar perfil: ${res.error}`);
      showToast('error', `Erro ao atualizar perfil: ${res.error}`);
    } else {
      showToast('success', `Perfil de ${editNome.trim()} atualizado com sucesso!`);
      if (userToEdit.id === user?.id) {
        refreshUserProfile();
      }
      setUserToEdit(null);
      loadUsers();
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
        <h1 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white tracking-tight">
          Configurações & Acessos
        </h1>
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

      {/* SECTION 1: PERFIL DO USUÁRIO LOGADO */}
      {user && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <AvatarUpload
                userId={user.id}
                currentAvatarUrl={user.avatarUrl}
                userName={user.fullName}
                size="lg"
                onSuccess={async () => {
                  await refreshUserProfile();
                  loadUsers();
                  showToast('success', 'Foto de perfil atualizada com sucesso!');
                }}
                onError={(err) => showToast('error', err)}
              />
              <div>
                <h3 className="font-display font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                  {user.fullName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5" /> {user.email}
                </p>
                <p className="text-[11px] text-amber-500 font-medium mt-1">
                  Clique na foto para alterar sua imagem de perfil
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                user.role === 'admin'
                  ? 'bg-amber-400/10 text-amber-600 dark:text-amber-400 border-amber-400/20'
                  : user.role === 'leader'
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
              }`}>
                Nível: {user.role === 'admin' ? 'Administrador' : user.role === 'leader' ? 'Líder' : 'Voluntário'}
              </span>
              <button
                onClick={handleRefreshProfile}
                disabled={isRefreshing}
                className="p-2 rounded-xl text-slate-400 hover:text-amber-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all touch-active min-h-[38px] min-w-[38px] flex items-center justify-center"
                title="Sincronizar com public.perfis"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <span className="text-slate-400 font-medium block mb-1">Telefone / Celular:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-500" />
                {user.phone || 'Não informado no cadastro'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <span className="text-slate-400 font-medium block mb-1">Status da Conta:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Conta Ativa e Verificada
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: PAINEL DE GESTÃO DE USUÁRIOS DO SISTEMA (ADMIN ONLY) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/10 text-amber-500 border border-amber-400/20 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-900 dark:text-white text-base">
                Gestão de Usuários & Níveis de Acesso
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gerencie permissões e níveis de acesso dos membros em tempo real
              </p>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCreateUserError(null);
                  setIsCreateModalOpen(true);
                }}
                className="px-3.5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 touch-active min-h-[42px]"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Novo Acesso</span>
              </button>

              <button
                onClick={loadUsers}
                disabled={usersLoading}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all min-h-[42px] flex items-center justify-center gap-1 text-xs font-semibold"
                title="Atualizar lista de usuários"
              >
                <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin text-amber-400' : ''}`} />
                <span className="hidden sm:inline">Atualizar Lista</span>
              </button>
            </div>
          )}
        </div>

        {!isAdmin ? (
          /* RESTRICTED NOTICE FOR NON-ADMINS */
          <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-center space-y-2">
            <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto" />
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              Acesso Restrito a Administradores
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              A gestão e alteração de níveis de acesso de usuários do sistema é exclusiva para administradores.
            </p>
          </div>
        ) : usersLoading ? (
          /* LOADING SKELETON */
          <div className="py-8 text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto" />
            <p className="text-xs text-slate-400">Buscando usuários cadastrados no Supabase...</p>
          </div>
        ) : usersList.length === 0 ? (
          /* EMPTY STATE */
          <div className="p-6 text-center text-xs text-slate-400 italic">
            Nenhum registro de usuário encontrado na tabela public.perfis.
          </div>
        ) : (
          /* USERS LIST (RESPONSIVE DATA TABLE) */
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-bold">Nome</th>
                  <th className="py-3.5 px-4 font-bold">Nível de Acesso</th>
                  <th className="py-3.5 px-4 font-bold">Voluntário Vinculado</th>
                  <th className="py-3.5 px-4 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {usersList.map((item) => {
                  const p = item.perfil;
                  const isCurrentUser = p.id === user?.id;
                  const isActionLoading = actionLoadingId === p.id;

                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${
                        isCurrentUser
                          ? 'bg-amber-400/5 hover:bg-amber-400/10'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Nome */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-3">
                          <AvatarUpload
                            userId={p.id}
                            currentAvatarUrl={p.avatar_url}
                            userName={p.nome}
                            size="sm"
                            readOnly
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white text-xs">
                                {p.nome} {p.sobrenome}
                              </span>
                              {isCurrentUser && (
                                <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-amber-400 text-slate-950 uppercase tracking-tight">
                                  Sua Conta
                                </span>
                              )}
                            </div>
                            {p.celular && (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-amber-500" /> {p.celular}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Nível de Acesso */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        {p.nivel_acesso === 'admin' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-extrabold text-[11px] uppercase tracking-wider shadow-2xs">
                            <Crown className="w-3.5 h-3.5 text-slate-950" />
                            <span>Admin</span>
                          </span>
                        ) : p.nivel_acesso === 'lider' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[11px] shadow-2xs">
                            <Shield className="w-3.5 h-3.5 text-blue-200" />
                            <span>Líder de Mídia</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-semibold text-[11px]">
                            <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                            <span>Voluntário</span>
                          </span>
                        )}
                      </td>

                      {/* Voluntário Vinculado */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        {item.linked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold border border-emerald-500/20">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Vinculado</span>
                            {item.voluntario?.nome ? (
                              <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-normal">
                                ({item.voluntario.nome})
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-medium border border-slate-200 dark:border-slate-700">
                            <span>Sem vínculo</span>
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            disabled={isActionLoading}
                            title={`Editar dados de ${p.nome}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors touch-active cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {!isCurrentUser && (
                            <button
                              onClick={() => setUserToDelete(p)}
                              disabled={isActionLoading}
                              title={`Excluir usuário ${p.nome}`}
                              className="p-1.5 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors touch-active cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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

      {/* SECTION 2.5: MODELOS DE CULTO & RECORRÊNCIA (ADMIN & LEADER) */}
      {(isAdmin || user?.role === 'leader') && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
          <TiposCultoManager />
        </div>
      )}

      {/* SECTION 4: ACCESS LEVELS MATRIX (RBAC SUMMARY) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-2xl bg-amber-400/10 text-amber-500 border border-amber-400/20 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-slate-900 dark:text-white text-base">
              Níveis de Acesso e Permissões (RBAC)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Regras de visibilidade e gestão controladas na coluna nivel_acesso
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-500" /> Admin ('admin')
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/10 text-amber-600 dark:text-amber-400">
                Acesso Total
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Criar e editar escalas; gerenciar voluntários e funções; alterar usuários e permissões do sistema.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900 dark:text-white">
                Líder de Mídia ('lider')
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                Gestão de Equipe
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Montar e publicar escalas de cultos; consultar indisponibilidades da equipe; gerenciar voluntários.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900 dark:text-white">
                Voluntário ('voluntario')
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Minhas Escalas
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Visualizar próprias escalas de cultos; confirmar escalação; cadastrar indisponibilidades do período.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 5: APARÊNCIA E TEMA */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-800 text-amber-400 border border-slate-700 flex items-center justify-center font-bold">
              {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-900 dark:text-white text-base">
                Tema da Aplicação
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Alternar entre Modo Claro (Light Mode) e Modo Escuro (Dark Mode)
              </p>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl border border-amber-400/30 flex items-center gap-2 touch-active min-h-[44px]"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>
        </div>
      </div>

      {/* SECTION: CONFIGURAÇÕES DE CONEXÃO (AVANÇADO - EXPANSÍVEL) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => setIsSupabaseConfigOpen(!isSupabaseConfigOpen)}
          className="w-full p-6 sm:p-8 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors focus:outline-none cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center font-bold shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-display font-bold text-slate-900 dark:text-white text-base">
                  Configurações de Conexão (Avançado)
                </h3>
                {/* Visual Status Indicator */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold">
                  <span className="relative flex h-2 w-2">
                    {supabaseConfig.isConfigured && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${
                      supabaseConfig.isConfigured ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}></span>
                  </span>
                  <span className={supabaseConfig.isConfigured ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                    {supabaseConfig.isConfigured ? 'Ativo' : 'Pendente'}
                  </span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Chaves de API e URL do projeto backend
              </p>
            </div>
          </div>

          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0 ml-2">
            {isSupabaseConfigOpen ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </div>
        </button>

        {isSupabaseConfigOpen && (
          <div className="p-6 sm:p-8 pt-0 border-t border-slate-100 dark:border-slate-800/80 space-y-5 animate-fadeIn">
            {saveSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Credenciais do Supabase salvas e ativas com sucesso!
              </div>
            )}

            <form onSubmit={handleSaveSupabase} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Supabase Project URL
                </label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://seu-projeto.supabase.co"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Supabase Anon Key
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-amber-400 font-bold text-xs sm:text-sm rounded-xl border border-amber-400/30 transition-all touch-active shadow-xs min-h-[44px]"
                >
                  <Save className="w-4 h-4 text-amber-400" />
                  <span>Salvar Conexão</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* MODAL: CRIAR NOVO ACESSO (ADMIN ONLY) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-950 text-white p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-white">
                    Criar Novo Acesso de Usuário
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Criação de nova conta de acesso para o sistema
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleCreateUserSubmit} className="p-6 space-y-4">
              {createUserError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span className="leading-relaxed">{createUserError}</span>
                </div>
              )}

              {/* Nome & Sobrenome */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newNome}
                    onChange={(e) => setNewNome(e.target.value)}
                    placeholder="Ex: João"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sobrenome <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newSobrenome}
                    onChange={(e) => setNewSobrenome(e.target.value)}
                    placeholder="Ex: Silva"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail de Acesso <span className="text-amber-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="usuario@exemplo.com"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* Senha Temporária */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Senha Temporária <span className="text-amber-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showTempPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newSenha}
                    onChange={(e) => setNewSenha(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTempPassword(!showTempPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                  >
                    {showTempPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Nível de Acesso */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nível de Acesso (RBAC) <span className="text-amber-500">*</span>
                </label>
                <select
                  value={newNivel}
                  onChange={(e) => setNewNivel(e.target.value as NivelAcesso)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                >
                  <option value="voluntario">Voluntário (Apenas Minhas Escalas)</option>
                  <option value="lider">Líder (Gestão de Escalas & Voluntários)</option>
                  <option value="admin">Administrador (Gestão Geral & Permissões)</option>
                </select>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingNewUser}
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 touch-active"
                >
                  {isSubmittingNewUser ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Criando Acesso...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Criar Acesso</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: EDITAR USUÁRIO */}
      {userToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-950 text-white p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center justify-center font-bold">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-white">
                    Editar Usuário
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Atualização de nome e sobrenome do perfil
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setUserToEdit(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveUserEdit} className="p-6 space-y-4">
              {/* Profile Avatar Upload Header */}
              <div className="flex flex-col items-center justify-center pt-1 pb-3 border-b border-slate-100 dark:border-slate-800 gap-1.5 text-center">
                <AvatarUpload
                  userId={userToEdit.id}
                  currentAvatarUrl={userToEdit.avatar_url}
                  userName={userToEdit.nome}
                  size="lg"
                  onSuccess={async (newUrl) => {
                    setUserToEdit((prev) => (prev ? { ...prev, avatar_url: newUrl } : null));
                    if (userToEdit.id === user?.id) {
                      await refreshUserProfile();
                    }
                    loadUsers();
                    showToast('success', `Foto de perfil de ${userToEdit.nome} atualizada com sucesso!`);
                  }}
                  onError={(msg) => showToast('error', msg)}
                />
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Clique na foto para alterar o avatar do perfil
                </span>
              </div>

              {editUserError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editUserError}</span>
                </div>
              )}

              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  placeholder="Nome do usuário"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                />
              </div>

              {/* Sobrenome */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Sobrenome
                </label>
                <input
                  type="text"
                  value={editSobrenome}
                  onChange={(e) => setEditSobrenome(e.target.value)}
                  placeholder="Sobrenome do usuário"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                />
              </div>

              {/* Nível de Acesso (RBAC) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nível de Acesso (RBAC) <span className="text-amber-500">*</span>
                </label>
                <select
                  value={editNivel}
                  onChange={(e) => setEditNivel(e.target.value as NivelAcesso)}
                  disabled={userToEdit?.id === user?.id && userToEdit?.nivel_acesso === 'admin'}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                >
                  <option value="voluntario">Voluntário (Apenas Minhas Escalas)</option>
                  <option value="lider">Líder de Mídia (Gestão de Escalas)</option>
                  <option value="admin">Administrador (Gestão Geral & Permissões)</option>
                </select>
                {userToEdit?.id === user?.id && userToEdit?.nivel_acesso === 'admin' && (
                  <p className="text-[11px] text-amber-500 mt-1 font-medium">
                    Você não pode alterar seu próprio nível de administrador.
                  </p>
                )}
              </div>

              {/* Vínculo com Voluntário */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Vínculo de Voluntário</span>
                  {isLoadingVoluntarios && (
                    <span className="text-[10px] text-amber-500 flex items-center gap-1 font-normal">
                      <Loader2 className="w-3 h-3 animate-spin" /> Carregando...
                    </span>
                  )}
                </label>
                <select
                  value={selectedVoluntarioId}
                  onChange={(e) => setSelectedVoluntarioId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                >
                  <option value="">Nenhum / Desvincular</option>
                  <option value="CREATE_NEW">✨ + Criar Nova Ficha de Voluntário para este perfil</option>
                  {voluntariosOptions.map((v) => {
                    const isLinkedToAnother = v.user_id && v.user_id !== userToEdit?.id;
                    return (
                      <option key={v.id} value={v.id}>
                        {v.nome} {v.sobrenome || ''} {v.celular ? `(${v.celular})` : ''} {isLinkedToAnother ? '⚠️ [Já vinculado]' : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Associe o perfil a uma ficha em public.voluntarios para inclusão em escalas.
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setUserToEdit(null)}
                  disabled={isSavingEdit}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 touch-active cursor-pointer"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvar...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvar Alterações</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO DE USUÁRIO */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-950 text-white p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center font-bold">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-white">
                    Excluir Usuário
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Confirmação de exclusão permanente
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                Tem certeza que deseja excluir <strong className="text-slate-900 dark:text-white font-bold">{userToDelete.nome} {userToDelete.sobrenome}</strong>? Esta ação não pode ser desfeita.
              </p>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  disabled={isDeletingUser}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDeleteUser}
                  disabled={isDeletingUser}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 touch-active cursor-pointer"
                >
                  {isDeletingUser ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir Usuário</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
