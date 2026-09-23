/**
 * Types & Interfaces for TBC Escala
 */

export type UserRole = 'admin' | 'leader' | 'volunteer';

export type NivelAcesso = 'admin' | 'lider' | 'voluntario';

export interface PerfilRecord {
  id: string;
  nome: string;
  sobrenome?: string;
  celular?: string;
  nivel_acesso: NivelAcesso;
  ativo: boolean;
  avatar_url?: string;
}

export type AuthStatus = 'unauthenticated' | 'authenticated' | 'recovery' | 'loading';

export type ThemeMode = 'light' | 'dark';

export type NavTab = 'inicio' | 'escalas' | 'indisponibilidades' | 'voluntarios' | 'configuracoes';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: UserRole;
  phone?: string;
  functions: string[]; // e.g. ['Câmeras', 'Transmissão', 'Projeção']
  active: boolean;
  createdAt?: string;
}

export interface MediaFunction {
  id: string;
  name: string;
  description: string;
  color: string; // Tailwind color or hex
  iconName: string;
  activeCount?: number;
}

export type ServiceType = 'Culto de Domingo' | 'Culto de Quarta' | 'Ensaio Geral' | 'Evento Especial' | 'Conferência';

export interface VolunteerAssignment {
  functionId: string;
  functionName: string;
  volunteerId: string | null;
  volunteerName?: string;
  status: 'pending' | 'confirmed' | 'declined';
}

export interface Escala {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  serviceType: ServiceType;
  status: 'draft' | 'published' | 'completed';
  notes?: string;
  assignments: VolunteerAssignment[];
}

export interface Unavailability {
  id: string;
  volunteerId: string;
  volunteerName?: string;
  startDate: string;
  endDate: string;
  reason?: string;
  createdAt: string;
}

export interface FuncaoRecord {
  id: string;
  nome: string;
  descricao: string;
  cor: string; // e.g. 'bg-blue-500', 'bg-amber-500', 'bg-emerald-500', 'bg-purple-500', etc.
  ativa: boolean;
  created_at?: string;
  voluntarios_count?: number;
}

export interface VoluntarioRecord {
  id: string;
  nome: string;
  sobrenome: string;
  email?: string;
  celular: string;
  ativo: boolean;
  user_id: string | null; // references public.perfis(id) or auth.users(id)
  created_at?: string;
  funcoes_ids?: string[]; // array of funcao IDs
  funcoes_names?: string[]; // array of funcao names for UI display
  avatar_url?: string;
}

export interface VoluntarioFuncaoRecord {
  voluntario_id: string;
  funcao_id: string;
}

export interface PerfilSimple {
  id: string;
  nome: string;
  sobrenome?: string;
  nivel_acesso: string;
  avatar_url?: string;
}

export type PeriodoIndisponibilidade = 'dia_inteiro' | 'manha' | 'noite';

export interface IndisponibilidadeRecord {
  id: string;
  voluntario_id: string;
  voluntario_nome?: string;
  voluntario_sobrenome?: string;
  voluntario_email?: string;
  data_inicio: string; // YYYY-MM-DD
  data_fim: string; // YYYY-MM-DD
  periodo: PeriodoIndisponibilidade;
  motivo: string;
  observacao?: string;
  created_at?: string;
}

export interface CultoRecord {
  id: string;
  titulo: string;
  data: string; // YYYY-MM-DD
  horario: string; // HH:mm
  periodo: 'manha' | 'noite' | 'integral';
  observacao?: string;
  created_at?: string;
}

export interface EscalaItemRecord {
  id?: string;
  culto_id: string;
  funcao_id: string;
  funcao_nome?: string;
  funcao_cor?: string;
  voluntario_id: string | null;
  voluntario_nome?: string;
  voluntario_sobrenome?: string;
  status?: 'pendente' | 'confirmado' | 'recusado';
  status_confirmacao?: 'pendente' | 'confirmado' | 'recusado';
  motivo_recusa?: string | null;
}

export interface CultoComEscala {
  culto: CultoRecord;
  escala_itens: EscalaItemRecord[];
}

export interface TipoCultoRecord {
  id: string;
  nome: string;
  dia_semana: number; // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  semana_mes: number | null; // 1, 2, 3, 4 or null (all)
  meses_intervalo: number; // 1 (mensal), 2 (bimestral), 3 (trimestral), etc.
  horario: string; // HH:mm
  periodo: string; // 'Manhã', 'Tarde', 'Noite' or 'manha', 'noite'
  ativo?: boolean;
  created_at?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}
