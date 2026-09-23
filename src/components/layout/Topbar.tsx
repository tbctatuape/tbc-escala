import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { 
  Sun, 
  Moon, 
  Tv, 
  LogOut, 
  Database, 
  User as UserIcon
} from 'lucide-react';

export const Topbar: React.FC = () => {
  const { user, status, logout, supabaseConfig } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full bg-black text-slate-100 border-b border-white/5 shadow-sm backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 sm:h-13 flex items-center justify-between gap-2">
        {/* Official Circular Logo */}
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.jpg"
            alt="Logo TBC"
            className="h-10 w-10 md:h-12 md:w-12 rounded-full object-cover"
          />
        </div>

        {/* Topbar Actions & Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-slate-200 hover:text-amber-400 border border-neutral-800 transition-all touch-active focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            aria-label="Alternar tema claro e escuro"
            title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-300" />
            )}
          </button>

          {/* User Profile / Logout (when authenticated) */}
          {status === 'authenticated' && user && (
            <div className="flex items-center gap-2 pl-2 border-l border-neutral-800">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-semibold text-white truncate max-w-[140px]">
                  {user.fullName}
                </span>
              </div>

              {/* Avatar */}
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="w-9 h-9 rounded-full object-cover border-2 border-neutral-800"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-neutral-900 text-amber-400 flex items-center justify-center font-bold text-xs border border-neutral-800">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}

              {/* Logout Button */}
              <button
                onClick={logout}
                className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors touch-active"
                title="Sair do sistema"
                aria-label="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
