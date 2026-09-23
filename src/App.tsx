import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NavTab } from './types';
import { Topbar } from './components/layout/Topbar';
import { Navbar } from './components/layout/Navbar';
import { PWAInstallBanner } from './components/pwa/PWAInstallBanner';
import { LoginCard } from './components/auth/LoginCard';
import { PasswordRecoveryCard } from './components/auth/PasswordRecoveryCard';
import { InicioView } from './components/views/InicioView';
import { EscalasView } from './components/views/EscalasView';
import { IndisponibilidadesView } from './components/views/IndisponibilidadesView';
import { VoluntariosView } from './components/views/VoluntariosView';
import { ConfiguracoesView } from './components/views/ConfiguracoesView';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { user, status, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('inicio');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-display font-semibold text-sm text-slate-300">
          Carregando TBC Escala...
        </p>
      </div>
    );
  }

  // Auth views
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-between py-8 px-4 transition-colors">
        <PWAInstallBanner />
        <main className="my-auto py-8">
          <LoginCard />
        </main>
        <footer className="text-center text-xs text-slate-500 dark:text-slate-400 pt-6">
          TBC Escala • Sistema de Gestão da Mídia TBC
        </footer>
      </div>
    );
  }

  if (status === 'recovery') {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-between py-8 px-4 transition-colors">
        <PWAInstallBanner />
        <main className="my-auto py-8">
          <PasswordRecoveryCard />
        </main>
        <footer className="text-center text-xs text-slate-500 dark:text-slate-400 pt-6">
          TBC Escala • Sistema de Gestão da Mídia TBC
        </footer>
      </div>
    );
  }

  // RBAC Tab Access Guard
  const userRole = user?.role || 'volunteer';
  const isLeaderOrAdmin = userRole === 'admin' || userRole === 'leader';

  const isRestrictedTab = (activeTab === 'voluntarios' || activeTab === 'configuracoes') && !isLeaderOrAdmin;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <PWAInstallBanner />
      <Topbar />
      <Navbar activeTab={activeTab} onSelectTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-12">
        {isRestrictedTab ? (
          /* Restricted Access Screen for Volunteers */
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center shadow-sm max-w-lg mx-auto my-8">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-2">
              Acesso Restrito
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              Sua conta de voluntário não possui permissão para acessar o painel de gestão. Entre em contato com seu líder de mídia para solicitar alteração de nível de acesso.
            </p>
            <button
              onClick={() => setActiveTab('escalas')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl border border-amber-400/30"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para Minhas Escalas</span>
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'inicio' && <InicioView onNavigateToEscalas={() => setActiveTab('escalas')} />}
            {activeTab === 'escalas' && <EscalasView />}
            {activeTab === 'indisponibilidades' && <IndisponibilidadesView />}
            {activeTab === 'voluntarios' && <VoluntariosView />}
            {activeTab === 'configuracoes' && <ConfiguracoesView />}
          </>
        )}
      </main>

      <footer className="hidden md:block border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <span>TBC Escala • Sistema de Gestão da Mídia TBC</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Sistema Online
          </span>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
