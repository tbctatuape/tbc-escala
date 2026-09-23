import React from 'react';
import { NavTab } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Home, Calendar, CalendarOff, Users, Settings } from 'lucide-react';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

interface TabItem {
  id: NavTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  badge?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onSelectTab }) => {
  const { user } = useAuth();

  const allTabs: TabItem[] = [
    {
      id: 'inicio' as NavTab,
      label: 'Início',
      shortLabel: 'Início',
      icon: Home,
      roles: ['admin', 'leader', 'volunteer'],
    },
    {
      id: 'escalas' as NavTab,
      label: 'Escalas',
      shortLabel: 'Escalas',
      icon: Calendar,
      roles: ['admin', 'leader', 'volunteer'],
    },
    {
      id: 'voluntarios' as NavTab,
      label: 'Equipe',
      shortLabel: 'Equipe',
      icon: Users,
      roles: ['admin', 'leader'],
    },
    {
      id: 'configuracoes' as NavTab,
      label: 'Ajustes',
      shortLabel: 'Ajustes',
      icon: Settings,
      roles: ['admin', 'leader'],
    },
  ];

  const userRole = user?.role || 'volunteer';

  // Filter tabs based on user role (RBAC)
  const visibleTabs = allTabs.filter((tab) => tab.roles.includes(userRole));

  return (
    <>
      {/* DESKTOP TOP NAVBAR (md:flex) */}
      <nav className="hidden md:block w-full bg-slate-100/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-xs backdrop-blur-md sticky top-12 sm:top-13 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="flex items-center justify-center space-x-1.5 py-2 overflow-x-auto">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all touch-active focus:outline-none focus:ring-2 focus:ring-amber-400/40 shrink-0 ${
                    isActive
                      ? 'bg-white dark:bg-black text-slate-900 dark:text-amber-400 font-semibold border border-slate-200/90 dark:border-amber-400/25 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400/10 text-amber-600 dark:text-amber-400 border border-amber-400/20">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* MOBILE BOTTOM DOCK NAVBAR (md:hidden) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200/90 dark:border-slate-800 shadow-xl backdrop-blur-md px-2 pb-safe">
        <div className="flex items-center justify-around h-14 max-w-md mx-auto">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full py-0.5 transition-all touch-active relative ${
                  isActive
                    ? 'text-amber-600 dark:text-amber-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                aria-label={tab.label}
              >
                {isActive && (
                  <span className="absolute top-0 w-8 h-1 bg-amber-500 dark:bg-amber-400 rounded-b-full shadow-[0_2px_8px_rgba(251,191,36,0.6)]" />
                )}
                <Icon className={`w-4 h-4 transition-transform ${isActive ? 'scale-110 text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <span className="text-[10px] mt-0.5 font-medium tracking-tight">
                  {tab.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
